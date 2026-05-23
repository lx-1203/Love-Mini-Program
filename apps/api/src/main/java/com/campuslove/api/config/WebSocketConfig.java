package com.campuslove.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket 配置类。
 * 启用 STOMP over WebSocket 消息代理，支持实时消息推送。
 *
 * 端点: /ws (SockJS fallback)
 * 消息代理前缀: /topic, /queue
 * 应用目标前缀: /app
 * 用户目标前缀: /user
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

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
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();
    }
}
