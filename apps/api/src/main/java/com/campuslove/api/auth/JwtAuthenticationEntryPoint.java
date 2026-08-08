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
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * JWT 认证入口点：处理未认证请求（无 token / token 无效 / token 已撤销）。
 *
 * <p>Task 0.5.4 新增：当受保护资源被未认证用户访问时，Spring Security
 * 调用本入口点。统一返回 HTTP 401 + 标准 JSON 错误体：</p>
 *
 * <pre>{@code
 * {
 *   "code": "UNAUTHORIZED",
 *   "message": "未认证或令牌已失效，请重新登录",
 *   "traceId": "uuid-...",
 *   "status": 401
 * }
 * }</pre>
 *
 * <p>设计要点：</p>
 * <ul>
 *   <li><b>统一错误码</b>：{@code UNAUTHORIZED} 对齐 {@link InvalidTokenException#ERROR_CODE}，
 *       便于前端按错误码做精细化分支处理</li>
 *   <li><b>traceId</b>：每次响应生成唯一 UUID，便于客户端报错时关联服务端日志，
 *       排查问题。生产环境可替换为 MDC 中的 traceId 实现端到端链路追踪</li>
 *   <li><b>不泄露内部细节</b>：message 为通用提示，不暴露具体的 token 解析失败原因
 *       （如"签名错误"/"jti 不存在"等），防止攻击者获取系统信息</li>
 *   <li><b>JSON UTF-8</b>：明确指定 charset=UTF-8，避免中文乱码</li>
 * </ul>
 *
 * <p>触发场景：</p>
 * <ol>
 *   <li>请求未携带 Authorization 头访问受保护资源</li>
 *   <li>token 已过期（JwtAuthenticationFilter 清除 SecurityContext）</li>
 *   <li>token 已被加入 Redis 黑名单（用户已登出）</li>
 *   <li>token 签名无效或格式错误</li>
 * </ol>
 *
 * @see InvalidTokenException
 * @see TokenRevokedException
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationEntryPoint.class);

    /** 标准化业务错误码，与 InvalidTokenException.ERROR_CODE 对齐 */
    public static final String ERROR_CODE = "UNAUTHORIZED";

    /** 通用错误提示，不泄露内部细节 */
    public static final String DEFAULT_MESSAGE = "未认证或令牌已失效，请重新登录";

    /** Jackson ObjectMapper 用于 JSON 序列化，线程安全可复用 */
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        // R4-00277：优先复用 TraceIdFilter 注入 MDC 的 traceId（与
        // GlobalExceptionHandler.generateTraceId 同一口径），保证 401 响应的
        // X-Trace-Id 与请求链路日志串联一致；MDC 缺失时兜底生成 UUID。
        String traceId = generateTraceId();
        String requestUri = request.getRequestURI();
        String method = request.getMethod();

        log.warn("JWT 认证失败: method={}, uri={}, reason={}, traceId={}",
                method, requestUri, authException.getMessage(), traceId);

        // 构建标准 JSON 错误体
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", ERROR_CODE);
        body.put("message", DEFAULT_MESSAGE);
        body.put("traceId", traceId);
        body.put("status", HttpStatus.UNAUTHORIZED.value());

        // 写入响应
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("X-Trace-Id", traceId);
        response.getWriter().write(OBJECT_MAPPER.writeValueAsString(body));
    }

    /**
     * 生成 traceId。
     *
     * <p>R4-00277：优先读取 MDC 中 TraceIdFilter 注入的 traceId（key="traceId"），
     * 与 {@link GlobalExceptionHandler#generateTraceId} 口径一致，保证 401 响应与
     * 请求日志链路串联；MDC 缺失（如过滤链外直接调用）时兜底生成 UUID。</p>
     *
     * @return 36 字符 UUID 字符串（或 MDC 中的链路 traceId）
     */
    private String generateTraceId() {
        String mdcTraceId = org.slf4j.MDC.get("traceId");
        if (mdcTraceId != null && !mdcTraceId.isBlank()) {
            return mdcTraceId;
        }
        return UUID.randomUUID().toString();
    }
}
