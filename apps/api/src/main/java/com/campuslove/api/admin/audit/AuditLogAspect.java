package com.campuslove.api.admin.audit;

import com.campuslove.api.admin.AdminAuditLogService;
import com.campuslove.api.admin.AdminPageView;
import com.campuslove.api.entity.AuditLog;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
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
 *
 * <p><b>读接口（GET）能不能用本切面审计？能——但必须补齐它缺的记录维度。</b>
 * 切点是 {@code @Around("@annotation(auditable)")}，只按「方法上有注解」匹配，
 * 与 HTTP 方法无关，所以 {@code @Auditable} 标在 GET 上一样会进切面、一样会落库。
 * 真正的问题不是拦不住，而是<b>拦到之后记不下</b>：原实现的四个维度里
 * {@code targetId} 只从 {@code @PathVariable} 取、{@code requestBody} 只从
 * {@code @RequestBody} 取，而读端点的「读谁」写在 query 参数里、「读多少」写在返回值里
 * —— 两处都不在它的视野内。直接给敏感 GET 挂一个空注解，产出的只是
 * 「某管理员某时到过这个 URL」这一行废话，事后追查仍然答不出「那一次带走了多少条悄悄话」。
 * 故本切面为 GET 补两条记录维度（详见 {@link #buildReadScopeSnapshot}）：
 * 读选择器（query 快照，敏感键沿用同一张掩码表）与读出规模（返回条数 / 总数）。
 * 判点：{@code AuditAspectReadDimensionTest}（运行期）与
 * {@code AdminSensitiveReadAuditStaticGateTest}（形态：返回 PII 明文列的管理端 GET
 * 必须同时具备档位收紧与审计）。</p>
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
            "authcode", "verifycode",
            // infra R2-00233: 扩展脱敏字段——手机号/证件号/邮箱/微信身份标识/API 密钥等，
            // 避免敏感业务字段明文进入审计库
            "phone", "mobile", "phonenumber", "telephone", "tel",
            "idcard", "idcardnumber", "idcardno", "identitycard", "idcardurl",
            "studentidcard", "studentidcardurl",
            "openid", "unionid", "sessionkey", "session_key",
            "email", "realname",
            "apikey", "secretkey", "authorization", "privatekey"
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

    /** R4-00395：可信代理 IP/CIDR 列表（配置 app.security.trusted-proxies，与限流切面同源） */
    private final java.util.Set<String> trustedProxyIps;

    /** R4-00395：可信代理 CIDR 前缀集合 */
    private final java.util.List<String> trustedProxyCidrs;

    public AuditLogAspect(AdminAuditLogService auditLogService,
                          UserRepository userRepository,
                          ObjectMapper objectMapper,
                          @org.springframework.beans.factory.annotation.Value(
                                  "${app.security.trusted-proxies:}") String trustedProxies) {
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        java.util.Set<String> ips = new java.util.HashSet<>();
        java.util.List<String> cidrs = new java.util.ArrayList<>();
        if (trustedProxies != null && !trustedProxies.isBlank()) {
            for (String part : trustedProxies.split(",")) {
                String entry = part.trim();
                if (entry.isEmpty()) {
                    continue;
                }
                if (entry.contains("/")) {
                    cidrs.add(entry);
                } else {
                    ips.add(entry);
                }
            }
        }
        this.trustedProxyIps = java.util.Collections.unmodifiableSet(ips);
        this.trustedProxyCidrs = java.util.Collections.unmodifiableList(cidrs);
    }

    /**
     * 拦截所有 @Auditable 标注的方法。
     */
    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint pjp, Auditable auditable) throws Throwable {
        long start = System.currentTimeMillis();
        Integer responseStatus = null;
        String errorMessage = null;
        // 刻意声明并初始化为 null：异常路径下 finally 仍要落这一行审计（谁在什么时候试图读、
        // 失败成什么状态码）。读规模维度在这种情况下记成 null（规模不可判定），
        // 与「确实读到 0 条」是两回事——缺项与 0 在审计库里不能混成一个值。
        Object result = null;
        try {
            result = pjp.proceed();
            responseStatus = extractResponseStatus(result);
            return result;
        } catch (Throwable ex) {
            // 记录客户端将实际收到的状态码（与 GlobalExceptionHandler 同一张映射表），
            // 不再硬编码 500——错口令 401、参数错 400 这类被 handler 转换的异常原先是审计表失真大头
            responseStatus = com.campuslove.api.config.GlobalExceptionHandler.resolveMappedStatus(ex);
            // infra R2-00232: 审计库仅存异常类型与单行化摘要，避免 SQL/堆栈等内部细节入库
            errorMessage = truncate(buildSafeErrorMessage(ex), 500);
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - start;
            try {
                recordAuditLog(pjp, auditable, responseStatus, errorMessage, duration, result);
            } catch (DataAccessException e) {
                // 审计日志写入失败时仅记录 warn，不影响主业务流程
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
                                Integer responseStatus, String errorMessage, long durationMs,
                                Object result) {
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

        // 读接口没有 @RequestBody ⇒ 该列本来就是空的；这里把它用作「读范围快照」
        // （见类注释与 buildReadScopeSnapshot），写请求的既有语义逐字节不变。
        if (requestBody == null && request != null && isReadMethod(httpMethod)) {
            requestBody = buildReadScopeSnapshot(request, result);
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
     * 构建安全的异常摘要（异常类型 + 单行化消息），供审计日志存储。
     *
     * @param ex 原始异常
     * @return 安全摘要字符串
     */
    private String buildSafeErrorMessage(Throwable ex) {
        if (ex == null) {
            return null;
        }
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return ex.getClass().getSimpleName();
        }
        String singleLine = message.replace('\n', ' ').replace('\r', ' ');
        return ex.getClass().getSimpleName() + ": " + singleLine;
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
        } catch (DataAccessException e) {
            // 数据库查询失败时降级使用 ANONYMOUS 占位，仍记录审计日志
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
     * 该 HTTP 方法是否属于「读」——只有读请求才需要补读范围快照（写请求走既有的
     * {@code @RequestBody} 口径，语义逐字节不变）。
     *
     * <p>含 {@code HEAD}（同一处理器、同一泄露面）；{@code OPTIONS} 是 CORS 预检，
     * 不落到业务方法，故不算读。</p>
     */
    private static boolean isReadMethod(String httpMethod) {
        return "GET".equalsIgnoreCase(httpMethod) || "HEAD".equalsIgnoreCase(httpMethod);
    }

    /**
     * 为读接口构建「读范围快照」：本次按什么条件挑人 + 实际带走了多少行。
     *
     * <p><b>为什么必须有这一步</b>（第六轮 W1b-2）：{@code @Auditable} 拦得住 GET，
     * 但原实现为 GET 记下的那一行答不出「读了谁、读了多少」——选择器在 query 里、
     * 结果在返回值里，两处都不在四个既有维度的视野内。悄悄话/私信/实名这类读接口
     * 若只留下「某人某时到过这个 URL」，事后无法判定泄露规模，审计等于没做。</p>
     *
     * <p>产出形态（写进 {@code audit_log.request_body}，该列对 GET 本来就是空的）：</p>
     * <pre>{@code {"query":{"status":"PENDING","page":"0"},"read":{"returned":20,"total":137}}}</pre>
     * <ul>
     *   <li>{@code query} 里命中 {@link #SENSITIVE_FIELDS} 的键值一律替换为 {@code "***"}
     *       （与写请求同一张掩码表，不因换了载体就放宽）；</li>
     *   <li>{@code read.returned}/{@code read.total} 为 {@code null} 表示「规模不可判定」
     *       （方法抛异常、或返回形态不认识），与「确实读到 0 条」区分开——
     *       审计库里这两个值必须长得不一样；</li>
     *   <li>整体截断到 {@link #MAX_BODY_LENGTH}，与写请求同一上限。</li>
     * </ul>
     *
     * @param request 当前 HTTP 请求（非 null，调用方已判空）
     * @param result  方法返回值；异常路径为 null
     * @return 读范围快照 JSON 文本
     */
    private String buildReadScopeSnapshot(HttpServletRequest request, Object result) {
        ObjectNode snapshot = objectMapper.createObjectNode();
        ObjectNode query = snapshot.putObject("query");
        Map<String, String[]> params = request.getParameterMap();
        if (params != null) {
            // TreeMap 口径：同一组参数每次落库的顺序一致，审计日志才可做等值比对与聚合
            List<String> names = new java.util.ArrayList<>(params.keySet());
            java.util.Collections.sort(names);
            for (String name : names) {
                String[] values = params.get(name);
                String first = (values == null || values.length == 0) ? null : values[0];
                query.put(name, SENSITIVE_FIELDS.contains(name.toLowerCase(java.util.Locale.ROOT))
                        ? "***"
                        : truncate(first, 128));
            }
        }
        ObjectNode read = snapshot.putObject("read");
        ReadScale scale = resolveReadScale(result);
        if (scale == null) {
            read.putNull("returned");
            read.putNull("total");
        } else {
            read.put("returned", scale.returned());
            read.put("total", scale.total());
        }
        try {
            return truncate(objectMapper.writeValueAsString(snapshot), MAX_BODY_LENGTH);
        } catch (JsonProcessingException e) {
            // 理论上不会发生（全是字符串与数字节点）；真发生时宁可记成明确的失败标记，
            // 也不要让读审计退化成 null（那就等于没补这一维度）
            return "{\"query\":{},\"read\":{\"returned\":null,\"total\":null}}";
        }
    }

    /**
     * 从返回值里认出「这次带走了多少行」。支持三种形态：管理端分页信封
     * {@link AdminPageView}、Spring Data {@link Page}、任意 {@link Collection}；
     * 外面可能还包一层 {@link ResponseEntity}（多数管理端读接口都这么写）。
     *
     * @param result 方法返回值
     * @return 读出规模；形态不认识或为 null（异常路径）时返回 null，表示不可判定
     */
    private ReadScale resolveReadScale(Object result) {
        Object body = result instanceof ResponseEntity<?> re ? re.getBody() : result;
        if (body == null) {
            return null;
        }
        if (body instanceof AdminPageView<?> pageView) {
            int returned = pageView.items() == null ? 0 : pageView.items().size();
            return new ReadScale(returned, pageView.total());
        }
        if (body instanceof Page<?> page) {
            return new ReadScale(page.getContent().size(), page.getTotalElements());
        }
        if (body instanceof Collection<?> collection) {
            // 无分页信封的读接口（如实名认证列表）：总数就取本次返回数，
            // 审计里记作「本次带走 N 条」，不假装知道全库有多少
            return new ReadScale(collection.size(), collection.size());
        }
        return null;
    }

    /** 读出规模：本次返回条数 + 该查询的总条数（无信封时等于本次条数）。 */
    private record ReadScale(int returned, long total) {}

    /**
     * 序列化请求体并对敏感字段做脱敏。
     */
    private String sanitizeAndSerialize(Object body) {
        try {
            JsonNode node = objectMapper.valueToTree(body);
            maskSensitiveFields(node);
            String json = objectMapper.writeValueAsString(node);
            return truncate(json, MAX_BODY_LENGTH);
        } catch (JsonProcessingException e) {
            // 请求体序列化失败时记录原始错误信息（截断后）
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
        // R4-00395：仅当直连来源为配置的可信代理（app.security.trusted-proxies）时
        // 才信任代理头首值；否则客户端伪造 X-Forwarded-For 即可写入虚假 IP 审计日志
        // （审计追溯失真）。直连来源不可信时记录可信的 remoteAddr。
        String directAddr = request.getRemoteAddr();
        if (isTrustedProxy(directAddr)) {
            for (String header : IP_HEADERS) {
                String value = request.getHeader(header);
                if (value != null && !value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
                    // X-Forwarded-For 可能含多 IP，取第一个
                    int comma = value.indexOf(',');
                    String ip = comma > 0 ? value.substring(0, comma).trim() : value.trim();
                    return truncate(ip, 64);
                }
            }
        }
        return truncate(directAddr, 64);
    }

    /**
     * R4-00395：判断直连来源 IP 是否为可信代理（与 RateLimitAspect 同源语义）。
     *
     * @param remoteAddr 直连来源 IP
     * @return true 表示命中配置的可信代理（精确 IP 或 CIDR 前缀）
     */
    private boolean isTrustedProxy(String remoteAddr) {
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return false;
        }
        if (trustedProxyIps.contains(remoteAddr)) {
            return true;
        }
        for (String cidr : trustedProxyCidrs) {
            int slash = cidr.indexOf('/');
            if (slash <= 0) {
                continue;
            }
            String prefix = cidr.substring(0, slash);
            if (remoteAddr.startsWith(prefix + ".")) {
                return true;
            }
        }
        return false;
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
