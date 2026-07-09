package com.campuslove.api.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * JwtChannelInterceptor 单元测试（Phase 3 任务 15）。
 *
 * <p>验证 STOMP CONNECT 帧的 token 提取与认证逻辑:
 * <ul>
 *   <li>从 Authorization header (Bearer token) 提取 token -> 认证成功</li>
 *   <li>从 token 原生 header (后备) 提取 token -> 认证成功</li>
 *   <li>无 token -> 拒绝连接（抛出 MessageDeliveryException）</li>
 *   <li>token 无效 -> 拒绝连接</li>
 *   <li>token 有效但无法提取 userId -> 拒绝连接</li>
 *   <li>SUBSCRIBE 未认证 -> 拒绝订阅</li>
 *   <li>SUBSCRIBE 已认证且订阅 /topic/** -> 放行</li>
 * </ul>
 *
 * <p>本测试聚焦于 Phase 3 任务 15 的核心目标:
 * token 通过 STOMP CONNECT 帧的 Authorization header 传递，不再依赖 URL 查询参数。
 */
class JwtChannelInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private MessageChannel messageChannel;

    private JwtChannelInterceptor interceptor;

    /** 测试用 JWT token */
    private static final String VALID_TOKEN = "valid.jwt.token";
    /** 测试用用户 ID */
    private static final String USER_ID = "user-123";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        interceptor = new JwtChannelInterceptor(jwtTokenProvider);

        // 默认 mock 行为: token 有效，返回 userId
        when(jwtTokenProvider.validateToken(VALID_TOKEN)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(VALID_TOKEN)).thenReturn(USER_ID);
    }

    /* ========== CONNECT: Authorization header 提取 token ========== */

    @Test
    void connect_withAuthorizationBearerHeader_shouldAuthenticateSuccessfully() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-1");
        accessor.addNativeHeader("Authorization", "Bearer " + VALID_TOKEN);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertNotNull(result, "认证成功后应返回原消息");
        verify(jwtTokenProvider).validateToken(VALID_TOKEN);
        verify(jwtTokenProvider).getUserIdFromToken(VALID_TOKEN);
    }

    @Test
    void connect_withAuthorizationBearerHeader_shouldSetAuthenticatedUser() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-2");
        accessor.addNativeHeader("Authorization", "Bearer " + VALID_TOKEN);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        interceptor.preSend(message, messageChannel);

        // 验证 accessor 上设置了 Principal
        assertNotNull(accessor.getUser(), "认证成功后应设置 Principal");
        assertEquals(USER_ID, accessor.getUser().getName(),
                "Principal 名称应为 token 中提取的 userId");
    }

    @Test
    void connect_withAuthorizationHeaderWithoutBearerPrefix_shouldStillExtractToken() {
        // 兼容直接传 token 值（无 Bearer 前缀）的情况
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-3");
        accessor.addNativeHeader("Authorization", VALID_TOKEN);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertNotNull(result, "无 Bearer 前缀的 Authorization header 也应能提取 token");
        verify(jwtTokenProvider).validateToken(VALID_TOKEN);
    }

    /* ========== CONNECT: token 原生 header（后备方案） ========== */

    @Test
    void connect_withTokenNativeHeader_shouldAuthenticateAsFallback() {
        // 当 Authorization header 缺失时，从 token 原生 header 提取（后备兼容方案）
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-4");
        accessor.addNativeHeader("token", VALID_TOKEN);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertNotNull(result, "token 原生 header 应作为后备方案成功认证");
        verify(jwtTokenProvider).validateToken(VALID_TOKEN);
    }

    /* ========== CONNECT: 无 token 拒绝连接 ========== */

    @Test
    void connect_withoutAnyTokenHeader_shouldRejectConnection() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-5");
        // 不设置任何 token header
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, messageChannel),
                "无 token 时应抛出 MessageDeliveryException");

        assertTrue(ex.getMessage().contains("Unauthorized"),
                "异常消息应包含 Unauthorized: " + ex.getMessage());
        verify(jwtTokenProvider, never()).validateToken(anyString());
    }

    @Test
    void connect_withBlankTokenHeader_shouldRejectConnection() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-6");
        accessor.addNativeHeader("Authorization", "   ");
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, messageChannel),
                "空白 token 应被拒绝");
        verify(jwtTokenProvider, never()).validateToken(anyString());
    }

    /* ========== CONNECT: 无效 token 拒绝连接 ========== */

    @Test
    void connect_withInvalidToken_shouldRejectConnection() {
        String invalidToken = "invalid.jwt.token";
        when(jwtTokenProvider.validateToken(invalidToken)).thenReturn(false);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-7");
        accessor.addNativeHeader("Authorization", "Bearer " + invalidToken);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, messageChannel),
                "无效 token 应抛出异常");

        assertTrue(ex.getMessage().contains("Unauthorized"),
                "异常消息应包含 Unauthorized: " + ex.getMessage());
        verify(jwtTokenProvider).validateToken(invalidToken);
        verify(jwtTokenProvider, never()).getUserIdFromToken(anyString());
    }

    @Test
    void connect_withValidTokenButNoUserId_shouldRejectConnection() {
        String tokenWithoutUserId = "token.without.userId";
        when(jwtTokenProvider.validateToken(tokenWithoutUserId)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(tokenWithoutUserId)).thenReturn(null);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-8");
        accessor.addNativeHeader("Authorization", "Bearer " + tokenWithoutUserId);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, messageChannel),
                "无法提取 userId 的 token 应被拒绝");
    }

    @Test
    void connect_withValidTokenButBlankUserId_shouldRejectConnection() {
        String tokenWithBlankUserId = "token.with.blank.userId";
        when(jwtTokenProvider.validateToken(tokenWithBlankUserId)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(tokenWithBlankUserId)).thenReturn("   ");

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-9");
        accessor.addNativeHeader("Authorization", "Bearer " + tokenWithBlankUserId);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, messageChannel),
                "userId 为空白的 token 应被拒绝");
    }

    /* ========== SUBSCRIBE: 路径权限校验 ========== */

    @Test
    void subscribe_withoutAuthentication_shouldReject() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setSessionId("session-10");
        accessor.setDestination("/user/queue/messages");
        // 不设置 user（模拟未认证）
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, messageChannel),
                "未认证的 SUBSCRIBE 应被拒绝");
    }

    @Test
    void subscribe_toTopicBroadcast_shouldAllow() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setSessionId("session-11");
        accessor.setDestination("/topic/announcements");
        setUserOnAccessor(accessor);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = assertDoesNotThrow(() -> interceptor.preSend(message, messageChannel),
                "订阅 /topic/** 应被允许");
        assertNotNull(result);
    }

    @Test
    void subscribe_toOwnUserQueue_shouldAllow() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setSessionId("session-12");
        accessor.setDestination("/user/" + USER_ID + "/queue/messages");
        setUserOnAccessor(accessor);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = assertDoesNotThrow(() -> interceptor.preSend(message, messageChannel),
                "订阅自己的 /user/{userId}/queue/** 应被允许");
        assertNotNull(result);
    }

    @Test
    void subscribe_toOtherUserQueue_shouldReject() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setSessionId("session-13");
        accessor.setDestination("/user/other-user/queue/messages");
        setUserOnAccessor(accessor);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, messageChannel),
                "订阅其他用户的队列应被拒绝");
    }

    /* ========== 其他命令: 直接放行 ========== */

    @Test
    void sendCommand_shouldPassThroughWithoutAuthCheck() {
        // SEND 命令不做额外校验（由 MessageWebSocketHandler 处理）
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setSessionId("session-14");
        accessor.setDestination("/app/chat/send");
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = assertDoesNotThrow(() -> interceptor.preSend(message, messageChannel),
                "SEND 命令应直接放行");
        assertNotNull(result);
    }

    @Test
    void disconnectCommand_shouldPassThrough() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setSessionId("session-15");
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = assertDoesNotThrow(() -> interceptor.preSend(message, messageChannel),
                "DISCONNECT 命令应直接放行");
        assertNotNull(result);
    }

    /**
     * 构建可变的 STOMP CONNECT 消息。
     *
     * <p>使用 setLeaveMutable(true) 确保 accessor 在 interceptor 调用 setUser() 时仍可变，
     * 避免 "Already immutable" 异常。这是测试 STOMP 拦截器的标准模式。
     */
    private Message<byte[]> buildConnectMessage(String sessionId, String authHeader, String tokenHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId(sessionId);
        accessor.setLeaveMutable(true);
        if (authHeader != null) {
            accessor.addNativeHeader("Authorization", authHeader);
        }
        if (tokenHeader != null) {
            accessor.addNativeHeader("token", tokenHeader);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    /**
     * 构建可变的 STOMP SUBSCRIBE 消息。
     */
    private Message<byte[]> buildSubscribeMessage(String sessionId, String destination, boolean withUser) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setSessionId(sessionId);
        accessor.setDestination(destination);
        accessor.setLeaveMutable(true);
        if (withUser) {
            accessor.setUser(() -> USER_ID);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    /* ========== 辅助方法 ========== */

    /**
     * 在 accessor 上设置已认证用户，模拟 CONNECT 成功后的状态。
     */
    private void setUserOnAccessor(StompHeaderAccessor accessor) {
        accessor.setUser(() -> USER_ID);
    }
}
