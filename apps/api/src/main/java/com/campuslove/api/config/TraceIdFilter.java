package com.campuslove.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 请求追踪 ID 过滤器（Task 2.6.4）。
 *
 * <p>在请求入口生成 traceId 并注入 {@link MDC}，所有日志输出自动携带 traceId，
 * 便于通过 traceId 串联一次请求的全部日志与跨服务调用链。</p>
 *
 * <p>处理流程：</p>
 * <ol>
 *   <li>从请求头 {@code X-Trace-Id} 获取上游传入的 traceId（适用于网关 / APM 转发场景）</li>
 *   <li>若上游未传入，生成 32 字符 UUID（去除横线，节省传输与存储开销）</li>
 *   <li>校验 traceId 格式：仅允许字母数字与短横线，长度 8-128，防止日志注入</li>
 *   <li>注入 {@link MDC}（key="traceId"），供 logback 模式引用</li>
 *   <li>写入响应头 {@code X-Trace-Id}，便于客户端关联服务端日志</li>
 *   <li>请求结束后从 MDC 清除，避免线程池复用导致 traceId 串流</li>
 * </ol>
 *
 * <p>执行顺序：{@link Ordered#HIGHEST_PRECEDENCE} + 10，确保在 JwtAuthenticationFilter
 * 之前执行，使 JWT 认证日志也能携带 traceId。</p>
 *
 * <p>logback 配置示例（{@code logback-spring.xml}）：
 * <pre>{@code
 * <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] [%X{traceId}] %-5level %logger{36} - %msg%n</pattern>
 * }</pre>
 *
 * @since P2 / Task 2.6.4
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class TraceIdFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TraceIdFilter.class);

    /** 请求头 / 响应头名称：X-Trace-Id */
    public static final String TRACE_ID_HEADER = "X-Trace-Id";

    /** MDC 中 traceId 的 key */
    public static final String MDC_TRACE_ID_KEY = "traceId";

    /** traceId 最小长度（防日志注入） */
    private static final int MIN_TRACE_ID_LENGTH = 8;

    /** traceId 最大长度（防日志注入） */
    private static final int MAX_TRACE_ID_LENGTH = 128;

    /** traceId 合法字符正则：字母、数字、短横线 */
    private static final String TRACE_ID_PATTERN = "^[a-zA-Z0-9-]+$";

    /**
     * 处理请求：生成 / 校验 traceId → 注入 MDC → 写响应头 → 放行 → 清除 MDC。
     *
     * @param request     HTTP 请求
     * @param response    HTTP 响应
     * @param filterChain 过滤器链
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String traceId = resolveTraceId(request);
        try {
            MDC.put(MDC_TRACE_ID_KEY, traceId);
            // 写入响应头，便于客户端关联服务端日志
            response.setHeader(TRACE_ID_HEADER, traceId);
            filterChain.doFilter(request, response);
        } finally {
            // 必须清除，避免线程池复用导致 traceId 串流到其他请求
            MDC.remove(MDC_TRACE_ID_KEY);
        }
    }

    /**
     * 解析 traceId：优先使用上游传入，否则生成新 UUID。
     *
     * <p>校验上游 traceId 格式：仅允许字母数字与短横线，长度 8-128。
     * 校验失败时降级为生成新 UUID，防止日志注入攻击
     * （如传入 {@code "\n2026-07-26 FAKE_LOG"} 篡改日志行）。</p>
     *
     * @param request HTTP 请求
     * @return 合法的 traceId
     */
    private String resolveTraceId(HttpServletRequest request) {
        String upstreamTraceId = request.getHeader(TRACE_ID_HEADER);
        if (StringUtils.hasText(upstreamTraceId) && isValidTraceId(upstreamTraceId)) {
            return upstreamTraceId;
        }
        if (StringUtils.hasText(upstreamTraceId)) {
            // 上游传入了非法 traceId，记录 warn 日志便于排查
            log.warn("上游传入的 traceId 格式非法，降级为新 UUID: {}",
                    sanitizeForLog(upstreamTraceId));
        }
        return generateTraceId();
    }

    /**
     * 生成新的 traceId（32 字符 UUID，去除横线）。
     *
     * @return traceId
     */
    private String generateTraceId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 校验 traceId 格式是否合法。
     *
     * @param traceId 待校验的 traceId
     * @return true 表示合法
     */
    private boolean isValidTraceId(String traceId) {
        if (traceId == null) {
            return false;
        }
        int len = traceId.length();
        if (len < MIN_TRACE_ID_LENGTH || len > MAX_TRACE_ID_LENGTH) {
            return false;
        }
        return traceId.matches(TRACE_ID_PATTERN);
    }

    /**
     * 对日志输出进行清洗，移除换行符与控制字符，防止日志注入。
     *
     * @param raw 原始字符串
     * @return 清洗后的字符串
     */
    private String sanitizeForLog(String raw) {
        if (raw == null) {
            return "null";
        }
        return raw.replaceAll("[\\r\\n\\t]", "_").replaceAll("[\\x00-\\x1F]", "?");
    }
}
