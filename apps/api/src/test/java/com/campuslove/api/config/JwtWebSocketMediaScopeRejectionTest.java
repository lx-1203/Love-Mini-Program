package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.core.env.Environment;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/**
 * P0-2 媒体令牌降权：WebSocket 两条认证入口都必须拒掉 {@code scope=media} 令牌。
 *
 * <p>WebSocket 是「完整登录会话」的能力面（收发消息、订阅自己的队列），
 * 而媒体令牌只是给 {@code <image src>} 用的降权只读凭据。改造前两条入口
 * （HTTP 握手 {@link WebSocketConfig.JwtHandshakeInterceptor} 与 STOMP 通道
 * {@link JwtChannelInterceptor}）都只验签名/有效期/用户状态，从不看 scope，
 * 于是一个泄露的 5 分钟媒体令牌可以建立长连接、以属主身份收发私信。</p>
 *
 * <p>本测试用真实签发的 JWT（同一密钥）覆盖三种携带方式：
 * STOMP {@code Authorization} 头、STOMP {@code token} 原生头、
 * 握手阶段的 {@code Sec-WebSocket-Protocol: bearer.{token}} 与 {@code Authorization} 头；
 * 每条拒绝断言都配一条完整会话令牌的正控，确保「只是媒体令牌被拒」而非「WebSocket 全坏」。</p>
 */
class JwtWebSocketMediaScopeRejectionTest {

    private static final String SECRET = "test-jwt-secret-for-media-token-websocket-32-chars-min";
    private static final Long USER_ID = 100L;

    private JwtTokenProvider jwtTokenProvider;
    private UserRepository userRepository;
    private Environment environment;

    @BeforeEach
    void setUp() {
        JwtConfig config = new JwtConfig();
        config.setSecret(SECRET);
        config.setExpirationMs(7_200_000L);
        config.setKeyVersion(1);
        jwtTokenProvider = new JwtTokenProvider(config);

        userRepository = Mockito.mock(UserRepository.class);
        User user = new User();
        user.setId(USER_ID);
        user.setRole("USER");
        user.setStatus("active");
        when(userRepository.findById(any())).thenReturn(Optional.of(user));

        environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
    }

    private String mediaToken() {
        return jwtTokenProvider.generateMediaToken(String.valueOf(USER_ID));
    }

    private String fullToken() {
        return jwtTokenProvider.generateToken(String.valueOf(USER_ID));
    }

    private JwtChannelInterceptor newChannelInterceptor() {
        JwtChannelInterceptor interceptor = new JwtChannelInterceptor(jwtTokenProvider, environment);
        org.springframework.test.util.ReflectionTestUtils.setField(interceptor, "userRepository", userRepository);
        return interceptor;
    }

    private Message<byte[]> connectMessage(String authorizationHeader, String nativeTokenHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-1");
        accessor.setLeaveMutable(true);
        if (authorizationHeader != null) {
            accessor.addNativeHeader("Authorization", authorizationHeader);
        }
        if (nativeTokenHeader != null) {
            accessor.addNativeHeader("token", nativeTokenHeader);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    // ========================================================================
    // 一、STOMP CONNECT 通道拦截器
    // ========================================================================

    @Test
    @DisplayName("CONNECT 用 Authorization 头携带媒体令牌 → 拒绝建立连接")
    void connect_withMediaTokenInAuthorizationHeader_isRejected() {
        JwtChannelInterceptor interceptor = newChannelInterceptor();
        Message<byte[]> message = connectMessage("Bearer " + mediaToken(), null);

        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)));
        assertTrue(ex.getMessage() != null && ex.getMessage().toLowerCase().contains("media"),
                "拒绝原因应指明媒体令牌不可用于 WebSocket，实际: " + ex.getMessage());
    }

    @Test
    @DisplayName("CONNECT 用 token 原生头携带媒体令牌 → 同样拒绝")
    void connect_withMediaTokenInNativeTokenHeader_isRejected() {
        JwtChannelInterceptor interceptor = newChannelInterceptor();
        Message<byte[]> message = connectMessage(null, mediaToken());

        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    @DisplayName("正控：CONNECT 用完整会话令牌 → 正常认证成功并写入 Principal")
    void connect_withFullSessionToken_isAccepted() {
        JwtChannelInterceptor interceptor = newChannelInterceptor();
        Message<byte[]> message = connectMessage("Bearer " + fullToken(), null);

        Message<?> result = assertDoesNotThrow(
                () -> interceptor.preSend(message, mock(MessageChannel.class)));

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertNotNull(accessor.getUser(), "完整会话应建立 WebSocket 认证主体");
        assertEquals(String.valueOf(USER_ID), accessor.getUser().getName());
    }

    // ========================================================================
    // 二、HTTP 握手拦截器
    // ========================================================================

    @Test
    @DisplayName("握手 Authorization 头携带媒体令牌 → 拒绝升级")
    void handshake_withMediaTokenInAuthorizationHeader_isRejected() {
        WebSocketConfig.JwtHandshakeInterceptor interceptor = handshakeInterceptor();
        ServerHttpRequest request = handshakeRequest("Authorization", "Bearer " + mediaToken());

        assertFalse(interceptor.beforeHandshake(request, handshakeResponse(),
                mock(org.springframework.web.socket.WebSocketHandler.class), new HashMap<>()));
    }

    @Test
    @DisplayName("握手 Sec-WebSocket-Protocol 子协议携带媒体令牌 → 拒绝升级")
    void handshake_withMediaTokenInSubProtocol_isRejected() {
        WebSocketConfig.JwtHandshakeInterceptor interceptor = handshakeInterceptor();
        ServerHttpRequest request = handshakeRequest("Sec-WebSocket-Protocol", "bearer." + mediaToken());

        assertFalse(interceptor.beforeHandshake(request, handshakeResponse(),
                mock(org.springframework.web.socket.WebSocketHandler.class), new HashMap<>()));
    }

    @Test
    @DisplayName("正控：握手携带完整会话令牌 → 放行并写入 userId 属性")
    void handshake_withFullSessionToken_isAccepted() {
        WebSocketConfig.JwtHandshakeInterceptor interceptor = handshakeInterceptor();
        ServerHttpRequest request = handshakeRequest("Sec-WebSocket-Protocol", "bearer." + fullToken());
        Map<String, Object> attributes = new HashMap<>();

        assertTrue(interceptor.beforeHandshake(request, handshakeResponse(),
                mock(org.springframework.web.socket.WebSocketHandler.class), attributes));
        assertEquals(String.valueOf(USER_ID),
                attributes.get(WebSocketConfig.JwtHandshakeInterceptor.USER_ID_ATTR),
                "完整会话握手应继续可用（正控）");
    }

    /** 握手请求：走 ServletServerHttpRequest（与真实 Tomcat 握手同一实现路径，覆盖 servlet 分支） */
    private ServerHttpRequest handshakeRequest(String headerName, String headerValue) {
        MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws");
        servletRequest.addHeader(headerName, headerValue);
        return new ServletServerHttpRequest(servletRequest);
    }

    private ServletServerHttpResponse handshakeResponse() {
        return new ServletServerHttpResponse(new MockHttpServletResponse());
    }

    private WebSocketConfig.JwtHandshakeInterceptor handshakeInterceptor() {
        return new WebSocketConfig.JwtHandshakeInterceptor(jwtTokenProvider, environment, 1L);
    }

    // ========================================================================
    // 三、mock（demo）档：跳过真实 JWT 校验的分支同样不得给媒体令牌开长连接
    // ========================================================================
    //
    // R4-00280 让 mock profile 的握手/CONNECT 跳过真实 JWT 校验（demo 令牌形如
    // "mock-token-xxx"，本来就不是合法 JWT），并在<b>能解析出 userId 时优先用它</b>。
    // 一个真签发的 scope=media 令牌恰好能被解析 ⇒ 在 demo 档它会被当成完整会话
    // 建立长连接（以属主身份收发私信）。P0-2 约束：媒体降权对「任何」媒体 scope
    // JWT 生效，与 profile 无关，故媒体令牌在 mock 分支也必须拒绝；
    // 解析不出 userId 的 demo 令牌仍按既有语义回退 mock 用户（正控钉住，不许顺手收紧）。

    /** mock profile 环境（R4-00280：握手/CONNECT 走 mock 分支） */
    private Environment mockEnvironment() {
        Environment mockEnv = mock(Environment.class);
        when(mockEnv.getActiveProfiles()).thenReturn(new String[]{"mock"});
        return mockEnv;
    }

    private JwtChannelInterceptor mockChannelInterceptor() {
        JwtChannelInterceptor interceptor =
                new JwtChannelInterceptor(jwtTokenProvider, mockEnvironment());
        org.springframework.test.util.ReflectionTestUtils.setField(interceptor, "userRepository", userRepository);
        org.springframework.test.util.ReflectionTestUtils.setField(interceptor, "mockPrincipalUserId", 1L);
        return interceptor;
    }

    @Test
    @DisplayName("mock 档 CONNECT 用真媒体令牌 → 仍拒绝建立长连接")
    void connect_withMediaTokenInMockProfile_isRejected() {
        JwtChannelInterceptor interceptor = mockChannelInterceptor();
        Message<byte[]> message = connectMessage("Bearer " + mediaToken(), null);

        MessageDeliveryException ex = assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)));
        assertTrue(ex.getMessage() != null && ex.getMessage().toLowerCase().contains("media"),
                "mock 档也应指明媒体令牌不可建立 WebSocket，实际: " + ex.getMessage());
    }

    @Test
    @DisplayName("mock 档 CONNECT 用 token 原生头携带媒体令牌 → 同样拒绝")
    void connect_withMediaTokenInNativeHeaderUnderMockProfile_isRejected() {
        JwtChannelInterceptor interceptor = mockChannelInterceptor();
        Message<byte[]> message = connectMessage(null, mediaToken());

        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    @DisplayName("正控：mock 档 CONNECT 用 demo 令牌 → 仍按既有语义回退 mock 用户放行")
    void connect_withDemoTokenInMockProfile_stillAccepted() {
        JwtChannelInterceptor interceptor = mockChannelInterceptor();
        Message<byte[]> message = connectMessage("Bearer mock-token-abc", null);

        Message<?> result = assertDoesNotThrow(
                () -> interceptor.preSend(message, mock(MessageChannel.class)));

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertNotNull(accessor.getUser(), "demo 令牌的 mock 联调语义不应被本次收口打断");
        assertEquals("1", accessor.getUser().getName());
    }

    @Test
    @DisplayName("mock 档握手携带真媒体令牌 → 拒绝升级")
    void handshake_withMediaTokenInMockProfile_isRejected() {
        WebSocketConfig.JwtHandshakeInterceptor interceptor =
                new WebSocketConfig.JwtHandshakeInterceptor(jwtTokenProvider, mockEnvironment(), 1L);
        ServerHttpRequest request = handshakeRequest("Authorization", "Bearer " + mediaToken());

        assertFalse(interceptor.beforeHandshake(request, handshakeResponse(),
                mock(org.springframework.web.socket.WebSocketHandler.class), new HashMap<>()),
                "媒体令牌在 mock 档也不得建立 WebSocket 会话");
    }

    @Test
    @DisplayName("正控：mock 档握手携带 demo 令牌 → 仍放行并回退 mock 用户")
    void handshake_withDemoTokenInMockProfile_stillAccepted() {
        WebSocketConfig.JwtHandshakeInterceptor interceptor =
                new WebSocketConfig.JwtHandshakeInterceptor(jwtTokenProvider, mockEnvironment(), 1L);
        ServerHttpRequest request = handshakeRequest("Authorization", "Bearer mock-token-abc");
        Map<String, Object> attributes = new HashMap<>();

        assertTrue(interceptor.beforeHandshake(request, handshakeResponse(),
                mock(org.springframework.web.socket.WebSocketHandler.class), attributes));
        assertEquals("1", attributes.get(WebSocketConfig.JwtHandshakeInterceptor.USER_ID_ATTR));
    }
}
