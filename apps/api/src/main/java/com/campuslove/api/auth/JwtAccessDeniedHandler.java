package com.campuslove.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * JWT 访问拒绝处理器：处理已认证但权限不足的请求。
 *
 * <p>Task 0.5.4 新增：当已认证用户访问无权限的资源（如普通用户访问 /api/admin/**）
 * 时，Spring Security 调用本处理器。统一返回 HTTP 403 + 标准 JSON 错误体：</p>
 *
 * <pre>{@code
 * {
 *   "code": "FORBIDDEN",
 *   "message": "您没有权限执行此操作",
 *   "traceId": "uuid-...",
 *   "status": 403
 * }
 * }</pre>
 *
 * <p>与 {@link JwtAuthenticationEntryPoint} 区分：</p>
 * <ul>
 *   <li>{@link JwtAuthenticationEntryPoint} 处理"未认证"（401）—— 不知道你是谁</li>
 *   <li>{@link JwtAccessDeniedHandler} 处理"已认证但无权限"（403）—— 知道你是谁，但你没权限</li>
 * </ul>
 *
 * <p>触发场景：</p>
 * <ol>
 *   <li>普通用户（ROLE_USER）访问 /api/admin/** 端点</li>
 *   <li>已认证用户访问超出其角色的资源</li>
 * </ol>
 */
@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    private static final Logger log = LoggerFactory.getLogger(JwtAccessDeniedHandler.class);

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "FORBIDDEN";

    /** 通用错误提示，不泄露内部细节 */
    public static final String DEFAULT_MESSAGE = "您没有权限执行此操作";

    /** Jackson ObjectMapper 用于 JSON 序列化，线程安全可复用 */
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException {
        // 生成 traceId，便于客户端报错时关联服务端日志
        String traceId = generateTraceId();
        String requestUri = request.getRequestURI();
        String method = request.getMethod();

        log.warn("访问被拒绝: method={}, uri={}, reason={}, traceId={}",
                method, requestUri, accessDeniedException.getMessage(), traceId);

        // 构建标准 JSON 错误体
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", ERROR_CODE);
        body.put("message", DEFAULT_MESSAGE);
        body.put("traceId", traceId);
        body.put("status", HttpStatus.FORBIDDEN.value());

        // 写入响应
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("X-Trace-Id", traceId);
        response.getWriter().write(OBJECT_MAPPER.writeValueAsString(body));
    }

    /**
     * 生成 traceId。
     *
     * <p>当前实现使用 {@link UUID#randomUUID()} 生成唯一 ID。
     * 生产环境可替换为基于 MDC 的 traceId 或分布式链路追踪系统的 traceId。</p>
     *
     * @return 36 字符 UUID 字符串
     */
    private String generateTraceId() {
        return UUID.randomUUID().toString();
    }
}
