package com.campuslove.api.admin.audit;

import com.campuslove.api.admin.AdminAuditLogService;
import com.campuslove.api.entity.AuditLog;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 审计日志 AOP 切面。
 * <p>拦截所有标注 {@link Auditable} 的方法，在方法执行后异步记录审计日志。</p>
 *
 * <p>工作流程：</p>
 * <ol>
 *   <li>记录方法开始时间</li>
 *   <li>执行原方法（proceed）</li>
 *   <li>捕获返回值（提取 ResponseEntity 状态码）或异常（提取错误信息）</li>
 *   <li>构建 AuditLog 实体：
 *     <ul>
 *       <li>操作者信息：从 SecurityContext 提取 userId，再查 UserRepository 获取 username/role</li>
 *       <li>目标对象：targetType 来自注解，targetId 从 @PathVariable 参数提取</li>
 *       <li>请求信息：HTTP 方法/URL/IP/UA 从 HttpServletRequest 提取</li>
 *       <li>请求体：从 @RequestBody 参数提取，使用 Jackson 序列化并对敏感字段脱敏</li>
 *       <li>执行结果：responseStatus 从 ResponseEntity 或异常推断，duration 计算耗时</li>
 *     </ul>
 *   </li>
 *   <li>调用 {@link AdminAuditLogService#saveAsync} 异步写入数据库</li>
 * </ol>
 *
 * <p>注：仅在 real profile 激活（依赖 audit_log 表与 UserRepository）。</p>
 */
@Aspect
@Component
@Profile("real")
public class AuditLogAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditLogAspect.class);

    /** 需要脱敏的请求体字段名（小写匹配） */
    private static final Set<String> SENSITIVE_FIELDS = Set.of(
            "password", "newpassword", "oldpassword", "token", "secret",
            "accesstoken", "refreshtoken", "code", "captcha", "credential",
            "authcode", "verifycode"
    );

    /** 请求体最大记录长度，超过截断 */
    private static final int MAX_BODY_LENGTH = 2000;

    /** IP 提取用的常见代理头 */
    private static final String[] IP_HEADERS = {
            "X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP"
    };

    private final AdminAuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AuditLogAspect(AdminAuditLogService auditLogService,
                          UserRepository userRepository,
                          ObjectMapper objectMapper) {
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 拦截所有 @Auditable 标注的方法。
     */
    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint pjp, Auditable auditable) throws Throwable {
        long start = System.currentTimeMillis();
        Integer responseStatus = null;
        String errorMessage = null;
        Object result;
        try {
            result = pjp.proceed();
            responseStatus = extractResponseStatus(result);
            return result;
        } catch (Throwable ex) {
            responseStatus = 500;
            errorMessage = truncate(ex.getMessage(), 500);
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - start;
            try {
                recordAuditLog(pjp, auditable, responseStatus, errorMessage, duration);
            } catch (Exception e) {
                log.warn("Failed to record audit log: operation={}, error={}",
                        auditable.value(), e.getMessage());
            }
        }
    }

    /**
     * 从返回值提取 HTTP 状态码。
     */
    private Integer extractResponseStatus(Object result) {
        if (result instanceof ResponseEntity<?> re) {
            return re.getStatusCode().value();
        }
        return 200;
    }

    /**
     * 构建并异步写入审计日志。
     */
    private void recordAuditLog(ProceedingJoinPoint pjp, Auditable auditable,
                                Integer responseStatus, String errorMessage, long durationMs) {
        MethodSignature signature = (MethodSignature) pjp.getSignature();
        Method method = signature.getMethod();
        Object[] args = pjp.getArgs();
        Annotation[][] paramAnnotations = method.getParameterAnnotations();

        // 提取操作者信息
        OperatorInfo operator = resolveOperator();

        // 提取 @PathVariable 参数值作为 targetId
        String targetId = extractTargetId(args, paramAnnotations);

        // 提取 @RequestBody 参数并脱敏
        String requestBody = extractRequestBody(args, paramAnnotations);

        // 提取 HTTP 请求信息
        HttpServletRequest request = currentRequest();
        String httpMethod = null;
        String requestUrl = null;
        String ip = null;
        String userAgent = null;
        if (request != null) {
            httpMethod = request.getMethod();
            requestUrl = truncate(request.getRequestURI(), 256);
            ip = resolveClientIp(request);
            userAgent = truncate(request.getHeader("User-Agent"), 256);
        }

        AuditLog auditLog = new AuditLog();
        auditLog.setOperatorId(operator.userId());
        auditLog.setOperatorUsername(operator.username());
        auditLog.setOperatorRole(operator.role());
        auditLog.setOperation(auditable.value().name());
        auditLog.setTargetType(blankToNull(auditable.targetType()));
        auditLog.setTargetId(targetId);
        auditLog.setRequestMethod(httpMethod);
        auditLog.setRequestUrl(requestUrl);
        auditLog.setRequestBody(requestBody);
        auditLog.setResponseStatus(responseStatus);
        auditLog.setErrorMessage(errorMessage);
        auditLog.setIp(ip);
        auditLog.setUserAgent(userAgent);
        auditLog.setDurationMs(durationMs);

        auditLogService.saveAsync(auditLog);
    }

    /**
     * 从 SecurityContext 提取当前操作者信息。
     * 若未认证则使用 0L/"ANONYMOUS"/"ANONYMOUS" 占位，仍记录审计日志。
     */
    private OperatorInfo resolveOperator() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
                return new OperatorInfo(0L, "ANONYMOUS", "ANONYMOUS");
            }
            Object principal = auth.getPrincipal();
            Long userId = parseUserId(principal);
            if (userId == null) {
                return new OperatorInfo(0L, "ANONYMOUS", "ANONYMOUS");
            }
            // 从 UserRepository 查询用户名与角色
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return new OperatorInfo(userId, "UNKNOWN", "UNKNOWN");
            }
            String username = user.getNickname() != null ? user.getNickname() : ("user-" + userId);
            String role = user.getRole() != null ? user.getRole() : "USER";
            return new OperatorInfo(userId, username, role);
        } catch (Exception e) {
            log.debug("Failed to resolve operator: {}", e.getMessage());
            return new OperatorInfo(0L, "ANONYMOUS", "ANONYMOUS");
        }
    }

    private Long parseUserId(Object principal) {
        if (principal instanceof Long l) return l;
        if (principal instanceof Integer i) return i.longValue();
        if (principal instanceof String s) {
            try { return Long.parseLong(s); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    /**
     * 从方法参数中提取第一个 @PathVariable 标注的参数值作为 targetId。
     * 多个 PathVariable 时取第一个非空。
     */
    private String extractTargetId(Object[] args, Annotation[][] paramAnnotations) {
        if (args == null) return null;
        for (int i = 0; i < args.length; i++) {
            if (i >= paramAnnotations.length) continue;
            for (Annotation a : paramAnnotations[i]) {
                if (a instanceof PathVariable) {
                    if (args[i] != null) {
                        return truncate(String.valueOf(args[i]), 64);
                    }
                }
            }
        }
        return null;
    }

    /**
     * 从方法参数中提取 @RequestBody 标注的参数，序列化为 JSON 并脱敏敏感字段。
     */
    private String extractRequestBody(Object[] args, Annotation[][] paramAnnotations) {
        if (args == null) return null;
        Object body = null;
        for (int i = 0; i < args.length; i++) {
            if (i >= paramAnnotations.length) continue;
            for (Annotation a : paramAnnotations[i]) {
                if (a instanceof RequestBody) {
                    body = args[i];
                    break;
                }
            }
            if (body != null) break;
        }
        if (body == null) return null;
        return sanitizeAndSerialize(body);
    }

    /**
     * 序列化请求体并对敏感字段做脱敏。
     */
    private String sanitizeAndSerialize(Object body) {
        try {
            JsonNode node = objectMapper.valueToTree(body);
            maskSensitiveFields(node);
            String json = objectMapper.writeValueAsString(node);
            return truncate(json, MAX_BODY_LENGTH);
        } catch (Exception e) {
            return "<unable to serialize: " + truncate(e.getMessage(), 100) + ">";
        }
    }

    /**
     * 递归将敏感字段值替换为 "***"。
     */
    private void maskSensitiveFields(JsonNode node) {
        if (node == null) return;
        if (node.isObject()) {
            ObjectNode obj = (ObjectNode) node;
            // 用副本迭代避免修改并发问题
            Set<String> fieldNames = new HashSet<>();
            Iterator<String> it = obj.fieldNames();
            while (it.hasNext()) fieldNames.add(it.next());
            for (String field : fieldNames) {
                if (SENSITIVE_FIELDS.contains(field.toLowerCase())) {
                    obj.put(field, "***");
                } else {
                    maskSensitiveFields(obj.get(field));
                }
            }
        } else if (node.isArray()) {
            for (JsonNode element : node) {
                maskSensitiveFields(element);
            }
        }
    }

    /**
     * 解析客户端真实 IP（穿透常见反向代理头）。
     */
    private String resolveClientIp(HttpServletRequest request) {
        for (String header : IP_HEADERS) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
                // X-Forwarded-For 可能含多 IP，取第一个
                int comma = value.indexOf(',');
                String ip = comma > 0 ? value.substring(0, comma).trim() : value.trim();
                return truncate(ip, 64);
            }
        }
        return truncate(request.getRemoteAddr(), 64);
    }

    private HttpServletRequest currentRequest() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs == null ? null : attrs.getRequest();
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    /** 操作者信息载体 */
    private record OperatorInfo(Long userId, String username, String role) {}
}
