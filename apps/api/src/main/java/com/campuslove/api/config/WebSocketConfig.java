package com.campuslove.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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

import java.security.Principal;
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

    private JwtChannelInterceptor jwtChannelInterceptor;

    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    public void setJwtChannelInterceptor(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Autowired
    public void setJwtTokenProvider(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
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
     * - Origin 限制为 localhost / 127.0.0.1（开发环境）
     * - 握手阶段通过 HandshakeInterceptor 校验 JWT 令牌
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
            .addInterceptors(new JwtHandshakeInterceptor(jwtTokenProvider))
            .withSockJS();
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

        JwtHandshakeInterceptor(JwtTokenProvider jwtTokenProvider) {
            this.jwtTokenProvider = jwtTokenProvider;
        }

        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                       WebSocketHandler wsHandler, Map<String, Object> attributes) {
            String token = extractTokenFromRequest(request);

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

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Exception exception) {
            // 握手完成后无需额外处理
        }

        /**
         * 从 HTTP 请求中提取 JWT 令牌。
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
        private String extractTokenFromRequest(ServerHttpRequest request) {
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
                                return token;
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
                        return authHeader.substring(BEARER_PREFIX.length()).trim();
                    }
                    return authHeader.trim();
                }
            } else {
                // 非 Servlet 环境下从 header 提取
                List<String> authHeaders = request.getHeaders().get(AUTH_HEADER);
                if (authHeaders != null && !authHeaders.isEmpty()) {
                    String authValue = authHeaders.get(0);
                    if (authValue != null && authValue.startsWith(BEARER_PREFIX)) {
                        return authValue.substring(BEARER_PREFIX.length()).trim();
                    }
                    if (authValue != null && !authValue.isBlank()) {
                        return authValue.trim();
                    }
                }
            }

            return null;
        }
    }
}
