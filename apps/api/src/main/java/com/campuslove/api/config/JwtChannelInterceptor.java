package com.campuslove.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

/**
 * WebSocket STOMP 通道拦截器。
 * 在 CONNECT 阶段校验 JWT 令牌，在 SUBSCRIBE 阶段校验订阅路径权限。
 *
 * 安全策略:
 * - CONNECT: 必须携带有效 JWT，验证成功后将用户信息写入 header
 * - SUBSCRIBE: 只允许订阅 /user/{自身userId}/queue/** 和 /topic/**
 * - 其他命令: 直接放行
 *
 * Token 提取说明（Phase 3 任务 15）:
 * - 客户端通过 STOMP CONNECT 帧的 Authorization header (Bearer token) 传递 token
 * - 兼容 token 原生 header 作为后备（直接传 token 字符串，无 Bearer 前缀）
 * - 不从 URL 查询参数提取 token（已由 WebSocketConfig.JwtHandshakeInterceptor 在握手阶段处理）
 */
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtChannelInterceptor.class);

    /** Authorization header 名称 */
    private static final String AUTH_HEADER = "Authorization";

    /** Bearer 前缀 */
    private static final String BEARER_PREFIX = "Bearer ";

    /** STOMP 连接时传递 token 的原生 header 名称 */
    private static final String TOKEN_HEADER = "token";

    private final JwtTokenProvider jwtTokenProvider;

    public JwtChannelInterceptor(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * 在消息发送到通道之前进行拦截。
     * 根据 STOMP 命令类型执行不同的安全校验。
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (command == null) {
            return message;
        }

        switch (command) {
            case CONNECT -> handleConnect(accessor);
            case SUBSCRIBE -> handleSubscribe(accessor);
            default -> { /* 其他命令不做额外校验 */ }
        }

        return message;
    }

    /**
     * 处理 CONNECT 命令：验证 JWT 令牌并设置认证用户。
     *
     * 令牌获取优先级:
     * 1. Authorization header (Bearer token)
     * 2. token 原生 header
     *
     * 验证成功后通过 accessor.setUser() 设置 Principal，
     * 后续 SUBSCRIBE/SEND 等操作可通过 getUser() 获取认证用户。
     */
    private void handleConnect(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);

        if (token == null || token.isBlank()) {
            log.warn("WebSocket CONNECT 拒绝: 未提供 JWT 令牌, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: missing JWT token");
        }

        if (!jwtTokenProvider.validateToken(token)) {
            log.warn("WebSocket CONNECT 拒绝: JWT 令牌无效或已过期, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: invalid JWT token");
        }

        String userId = jwtTokenProvider.getUserIdFromToken(token);
        if (userId == null || userId.isBlank()) {
            log.warn("WebSocket CONNECT 拒绝: 无法从 JWT 提取用户ID, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: invalid JWT token");
        }

        // 设置认证用户到 STOMP header，后续可通过 getUser().getName() 获取 userId
        final String authenticatedUserId = userId;
        accessor.setUser(new Principal() {
            @Override
            public String getName() {
                return authenticatedUserId;
            }
        });

        log.info("WebSocket CONNECT 认证成功: userId={}, sessionId={}", userId, accessor.getSessionId());
    }

    /**
     * 处理 SUBSCRIBE 命令：校验订阅路径权限。
     *
     * 允许的订阅路径:
     * - /topic/** : 公共广播主题，所有认证用户均可订阅
     * - /user/{自身userId}/queue/** : 用户专属队列，仅允许订阅自己的队列
     *
     * 禁止:
     * - 订阅其他用户的 /user/ 路径
     * - 订阅非 /topic 和非 /user 的路径
     */
    private void handleSubscribe(StompHeaderAccessor accessor) {
        // 验证用户已认证
        Principal user = accessor.getUser();
        if (user == null) {
            log.warn("WebSocket SUBSCRIBE 拒绝: 用户未认证, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: user not authenticated");
        }

        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            return; // 无目标路径的订阅请求直接放行
        }

        String userId = user.getName();

        // 允许订阅 /topic/** 公共主题
        if (destination.startsWith("/topic/")) {
            log.debug("WebSocket SUBSCRIBE 允许: userId={}, destination={}", userId, destination);
            return;
        }

        // 校验 /user/ 路径：只允许订阅自己的队列
        if (destination.startsWith("/user/")) {
            // 预期格式: /user/{userId}/queue/**
            // 去掉前缀 "/user/" 后，取第一段作为路径中的 userId
            String pathAfterUserPrefix = destination.substring("/user/".length());
            int slashIndex = pathAfterUserPrefix.indexOf('/');
            String targetUserId = (slashIndex > 0)
                    ? pathAfterUserPrefix.substring(0, slashIndex)
                    : pathAfterUserPrefix;

            if (!userId.equals(targetUserId)) {
                log.warn("WebSocket SUBSCRIBE 拒绝: userId={} 尝试订阅其他用户路径 destination={}, sessionId={}",
                        userId, destination, accessor.getSessionId());
                throw new org.springframework.messaging.MessageDeliveryException(
                        "Forbidden: cannot subscribe to another user's queue");
            }

            // 进一步校验：/user/{userId}/ 之后的路径必须以 queue/ 开头
            if (slashIndex > 0) {
                String subPath = pathAfterUserPrefix.substring(slashIndex + 1);
                if (!subPath.startsWith("queue/")) {
                    log.warn("WebSocket SUBSCRIBE 拒绝: userId={} 订阅了非 queue 子路径 destination={}, sessionId={}",
                            userId, destination, accessor.getSessionId());
                    throw new org.springframework.messaging.MessageDeliveryException(
                            "Forbidden: only /user/{userId}/queue/** subscriptions are allowed");
                }
            }

            log.debug("WebSocket SUBSCRIBE 允许: userId={}, destination={}", userId, destination);
            return;
        }

        // 其他路径一律拒绝
        log.warn("WebSocket SUBSCRIBE 拒绝: userId={} 尝试订阅不允许的路径 destination={}, sessionId={}",
                userId, destination, accessor.getSessionId());
        throw new org.springframework.messaging.MessageDeliveryException(
                "Forbidden: subscription destination not allowed");
    }

    /**
     * 从 STOMP CONNECT 帧的 nativeHeaders 中提取 JWT 令牌。
     *
     * 提取优先级（Phase 3 任务 15）:
     * 1. Authorization header (Bearer token 格式) —— 客户端 STOMP CONNECT 帧主推方式
     * 2. token 原生 header (兼容直接传 token 字符串的场景)
     *
     * 注意: 不从 URL 查询参数提取 token，URL 参数方式已在 Phase 3 任务 15 中移除。
     */
    private String extractToken(StompHeaderAccessor accessor) {
        // 优先从 Authorization header 提取
        List<String> authHeaders = accessor.getNativeHeader(AUTH_HEADER);
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authValue = authHeaders.get(0);
            if (authValue != null && authValue.startsWith(BEARER_PREFIX)) {
                return authValue.substring(BEARER_PREFIX.length()).trim();
            }
            // 兼容直接传 token 值（无 Bearer 前缀）的情况
            if (authValue != null && !authValue.isBlank()) {
                return authValue.trim();
            }
        }

        // 其次从 token 原生 header 提取
        List<String> tokenHeaders = accessor.getNativeHeader(TOKEN_HEADER);
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            String tokenValue = tokenHeaders.get(0);
            if (tokenValue != null && !tokenValue.isBlank()) {
                return tokenValue.trim();
            }
        }

        return null;
    }
}
