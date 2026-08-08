package com.campuslove.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * WebSocket 配置类。
 * 启用 STOMP over WebSocket 消息代理，支持实时消息推送。
 *
 * 端点: /ws (SockJS fallback)
 * 消息代理前缀: /topic, /queue
 * 应用目标前缀: /app
 * 用户目标前缀: /user
 *
 * 安全控制:
 * - STOMP 通道拦截器: CONNECT 阶段校验 JWT，SUBSCRIBE 阶段校验路径权限
 * - 握手拦截器: 在 HTTP 握手阶段预校验 JWT 令牌（从 Sec-WebSocket-Protocol 子协议提取）
 * - Origin 限制: 仅允许 localhost 和 127.0.0.1 来源
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    /** Authorization header 名称 */
    private static final String AUTH_HEADER = "Authorization";

    /** Bearer 前缀 */
    private static final String BEARER_PREFIX = "Bearer ";

    /** Sec-WebSocket-Protocol 请求头名称（用于 WebSocket 子协议协商） */
    private static final String SEC_WEBSOCKET_PROTOCOL_HEADER = "Sec-WebSocket-Protocol";

    /** WebSocket 子协议中传递 token 时使用的前缀 */
    private static final String BEARER_PROTOCOL_PREFIX = "bearer.";

    /**
     * WebSocket 允许的 Origin 模式列表，从配置 {@code app.websocket.allowed-origin-patterns} 读取。
     *
     * <p>默认值清空：生产环境必须显式配置 {@code WEBSOCKET_ALLOWED_ORIGIN_PATTERNS}
     * 或 {@code app.websocket.allowed-origin-patterns}，避免硬编码 localhost。
     * mock profile 在 application-mock.yml 中提供 {@code http://localhost:*,http://127.0.0.1:*}
     * 默认值供本地开发使用。</p>
     *
     * <p>支持逗号分隔字符串形式（YAML 列表自动转换为逗号分隔字符串）。
     * 配置为空时不限制 Origin（由 SockJS 默认行为处理）。</p>
     */
    @Value("${app.websocket.allowed-origin-patterns:${WEBSOCKET_ALLOWED_ORIGIN_PATTERNS:}}")
    private String allowedOriginPatternsRaw;

    private JwtChannelInterceptor jwtChannelInterceptor;

    private JwtTokenProvider jwtTokenProvider;

    /** R4-00280：运行环境（mock profile 握手跳过真实 JWT 校验） */
    private org.springframework.core.env.Environment environment;

    /** R4-00280：mock 模式兜底用户 ID（配置 app.mock.principal-user-id） */
    @org.springframework.beans.factory.annotation.Value("${app.mock.principal-user-id:1}")
    private long mockPrincipalUserId;

    @Autowired
    public void setJwtChannelInterceptor(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Autowired
    public void setJwtTokenProvider(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Autowired
    public void setEnvironment(org.springframework.core.env.Environment environment) {
        this.environment = environment;
    }

    /**
     * 配置消息代理。
     * - /topic: 广播式消息（一对多）
     * - /queue: 点对点消息（一对一，需认证）
     * - /app: 客户端发送消息的前缀
     * - /user: 用户专属消息前缀
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    /**
     * 注册 STOMP 端点。
     * 客户端通过 /ws 端点建立 WebSocket 连接，支持 SockJS 降级。
     *
     * 安全策略:
     * - Origin 限制由 {@code app.websocket.allowed-origin-patterns} 配置注入；
     *   配置为空时不限制 Origin（生产环境必须显式配置具体域名/模式）。
     * - 握手阶段通过 HandshakeInterceptor 校验 JWT 令牌
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 解析配置的 Origin 模式列表（去空白、去空项）
        String[] patterns = parseOriginPatterns(allowedOriginPatternsRaw);
        var endpoint = registry.addEndpoint("/ws");
        if (patterns.length > 0) {
            endpoint.setAllowedOriginPatterns(patterns);
        }
        endpoint.addInterceptors(new JwtHandshakeInterceptor(jwtTokenProvider, environment, mockPrincipalUserId))
            .withSockJS();
    }

    /**
     * 解析 Origin 模式字符串为清理后的数组。
     *
     * @param raw 原始逗号分隔字符串（可能为 null/空白）
     * @return 去除空白与空项后的数组；为空时返回长度为 0 的数组
     */
    private static String[] parseOriginPatterns(String raw) {
        if (raw == null || raw.isBlank()) {
            return new String[0];
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    /**
     * 注册客户端入站通道拦截器。
     * 在 STOMP 消息处理管道中注入 JWT 认证拦截器，
     * 对 CONNECT 和 SUBSCRIBE 命令执行安全校验。
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
    }

    /**
     * WebSocket 握手阶段的 JWT 校验拦截器。
     * 在 HTTP 升级为 WebSocket 之前验证 JWT 令牌有效性，
     * 防止未认证的客户端建立 WebSocket 连接。
     *
     * 令牌获取来源（Phase 3 任务 15 重构，移除 URL 参数支持）:
     * 1. Sec-WebSocket-Protocol 子协议头（格式: bearer.{token}）—— 浏览器/小程序无法设置自定义 HTTP 头时的标准方案
     * 2. Authorization 请求头 (Bearer token) —— 非 WebSocket 场景或支持自定义头的环境
     *
     * 安全说明:
     * - 不再从 URL 查询参数 token 提取，避免 token 出现在访问日志、Referer、浏览器历史中
     * - 子协议方案兼容小程序（uni.connectSocket）和 H5 环境
     *
     * 验证成功后将 userId 存入 WebSocketSession 属性和 STOMP header，
     * 供后续 JwtChannelInterceptor 使用。
     */
    static class JwtHandshakeInterceptor implements HandshakeInterceptor {

        private static final Logger handshakeLog = LoggerFactory.getLogger(JwtHandshakeInterceptor.class);

        /** WebSocket session 属性中存储认证用户 ID 的 key */
        static final String USER_ID_ATTR = "ws.auth.userId";

        private final JwtTokenProvider jwtTokenProvider;

        /** R4-00280：运行环境（mock profile 握手跳过真实 JWT 校验） */
        private final org.springframework.core.env.Environment environment;

        /** R4-00280：mock 模式兜底用户 ID */
        private final long mockPrincipalUserId;

        JwtHandshakeInterceptor(JwtTokenProvider jwtTokenProvider,
                                org.springframework.core.env.Environment environment,
                                long mockPrincipalUserId) {
            this.jwtTokenProvider = jwtTokenProvider;
            this.environment = environment;
            this.mockPrincipalUserId = mockPrincipalUserId;
        }

        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                       WebSocketHandler wsHandler, Map<String, Object> attributes) {
            ExtractedToken extracted = extractTokenFromRequest(request);
            String token = extracted.token();

            // R4-00282：浏览器原生 WebSocket 要求服务端在响应头回显所选子协议
            // （Sec-WebSocket-Protocol），否则子协议协商失败、连接可能被拒。
            // 仅在成功认证后回显客户端提供的 bearer.{token} 子协议。
            if (extracted.selectedSubProtocol() != null) {
                response.getHeaders().set(SEC_WEBSOCKET_PROTOCOL_HEADER,
                        extracted.selectedSubProtocol());
            }

            // R4-00280：mock profile 跳过真实 JWT 校验（mock-token 无法通过 validateToken），
            // 与 JwtChannelInterceptor 的 mock 分支保持一致；有 token 时尽力解析 userId，
            // 解析失败回退配置的 mock 用户。
            if (isMockProfile()) {
                String userId = null;
                if (token != null && !token.isBlank()) {
                    try {
                        userId = jwtTokenProvider.getUserIdFromToken(token);
                    } catch (RuntimeException ex) {
                        handshakeLog.debug("mock 模式解析 JWT userId 失败，回退 mock 用户: {}",
                                ex.getMessage());
                    }
                }
                if (userId == null || userId.isBlank()) {
                    userId = String.valueOf(mockPrincipalUserId);
                }
                attributes.put(USER_ID_ATTR, userId);
                handshakeLog.info("WebSocket 握手 mock 认证通过: userId={}, remoteAddress={}",
                        userId, request.getRemoteAddress());
                return true;
            }

            if (token == null || token.isBlank()) {
                handshakeLog.warn("WebSocket 握手拒绝: 未提供 JWT 令牌, remoteAddress={}",
                        request.getRemoteAddress());
                return false;
            }

            if (!jwtTokenProvider.validateToken(token)) {
                handshakeLog.warn("WebSocket 握手拒绝: JWT 令牌无效或已过期, remoteAddress={}",
                        request.getRemoteAddress());
                return false;
            }

            String userId = jwtTokenProvider.getUserIdFromToken(token);
            if (userId == null || userId.isBlank()) {
                handshakeLog.warn("WebSocket 握手拒绝: 无法从 JWT 提取用户ID, remoteAddress={}",
                        request.getRemoteAddress());
                return false;
            }

            // 将认证用户 ID 存入 WebSocket session 属性
            attributes.put(USER_ID_ATTR, userId);

            handshakeLog.info("WebSocket 握手认证成功: userId={}, remoteAddress={}",
                    userId, request.getRemoteAddress());
            return true;
        }

        /** 是否处于 mock profile（R4-00280） */
        private boolean isMockProfile() {
            return java.util.Arrays.asList(environment.getActiveProfiles()).contains("mock");
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Exception exception) {
            // 握手完成后无需额外处理
        }

        /**
         * 从 HTTP 请求中提取 JWT 令牌（R4-00282 同时返回匹配的子协议值用于回显）。
         *
         * 提取优先级（Phase 3 任务 15 重构，移除 URL 参数支持）:
         * 1. Sec-WebSocket-Protocol 子协议头（格式: bearer.{token}）
         *    - 浏览器/小程序 WebSocket 客户端无法设置自定义 HTTP 头，子协议是标准方案
         *    - 客户端通过 uni.connectSocket({ protocols: [earer.{token}] }) 传递
         * 2. Authorization 请求头 (Bearer token)
         *    - 适用于支持自定义 HTTP 头的环境（如 SockJS fallback 的 XHR 请求）
         *
         * 安全说明:
         * - 不再从 URL 查询参数 token 提取，避免 token 泄漏到日志/Referer/浏览器历史
         */
        private ExtractedToken extractTokenFromRequest(ServerHttpRequest request) {
            // 1. 优先从 Sec-WebSocket-Protocol 子协议头提取 token
            //    客户端通过 protocols: [earer.{token}] 设置，服务端从该头读取
            List<String> protocolHeaders = request.getHeaders().get(SEC_WEBSOCKET_PROTOCOL_HEADER);
            if (protocolHeaders != null && !protocolHeaders.isEmpty()) {
                for (String protocolValue : protocolHeaders) {
                    if (protocolValue == null) continue;
                    // Sec-WebSocket-Protocol 可能是逗号分隔的多个子协议
                    String[] parts = protocolValue.split(",");
                    for (String part : parts) {
                        String trimmed = part.trim();
                        if (trimmed.startsWith(BEARER_PROTOCOL_PREFIX)) {
                            String token = trimmed.substring(BEARER_PROTOCOL_PREFIX.length()).trim();
                            if (!token.isBlank()) {
                                // R4-00282：记录匹配的子协议原文，握手成功后在响应头回显
                                return new ExtractedToken(token, trimmed);
                            }
                        }
                    }
                }
            }

            // 2. 其次从 Authorization header 提取（支持自定义头的环境）
            if (request instanceof ServletServerHttpRequest servletRequest) {
                String authHeader = servletRequest.getServletRequest().getHeader(AUTH_HEADER);
                if (authHeader != null && !authHeader.isBlank()) {
                    if (authHeader.startsWith(BEARER_PREFIX)) {
                        return new ExtractedToken(authHeader.substring(BEARER_PREFIX.length()).trim(), null);
                    }
                    return new ExtractedToken(authHeader.trim(), null);
                }
            } else {
                // 非 Servlet 环境下从 header 提取
                List<String> authHeaders = request.getHeaders().get(AUTH_HEADER);
                if (authHeaders != null && !authHeaders.isEmpty()) {
                    String authValue = authHeaders.get(0);
                    if (authValue != null && authValue.startsWith(BEARER_PREFIX)) {
                        return new ExtractedToken(authValue.substring(BEARER_PREFIX.length()).trim(), null);
                    }
                    if (authValue != null && !authValue.isBlank()) {
                        return new ExtractedToken(authValue.trim(), null);
                    }
                }
            }

            return new ExtractedToken(null, null);
        }

        /**
         * R4-00282：提取结果（token + 需回显的子协议值）。
         *
         * @param token               JWT 令牌（未提供时为 null）
         * @param selectedSubProtocol 匹配到的 Sec-WebSocket-Protocol 子协议原文
         *                            （Authorization 头来源时为 null，无需回显）
         */
        record ExtractedToken(String token, String selectedSubProtocol) {
        }
    }
}
