package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * P1-6（2026-11-03）：/ws/** 握手鉴权负例补齐。
 *
 * <p>{@code SecurityConfig} 对 {@code /ws/**} 保持 permitAll——SockJS 的
 * info/ xhr 等握手前探测路径都必须匿名可达，HTTP 层无法按路径收窄；
 * 真正的认证闸在 {@link WebSocketConfig.JwtHandshakeInterceptor}
 * （握手）与 {@code JwtChannelInterceptor}（STOMP CONNECT）。</p>
 *
 * <p>既有 {@code JwtWebSocketMediaScopeRejectionTest} 覆盖了「媒体令牌拒绝」
 * 与「完整会话令牌放行」正控；本类补齐审计报告 P1-6 点名的另外两条负例：</p>
 * <ul>
 *   <li>不带任何凭据的匿名握手 → 必须拒绝（fail-closed，不能依赖 STOMP 层兜底）</li>
 *   <li>签名/有效期校验不过的令牌 → 必须拒绝</li>
 * </ul>
 */
class JwtHandshakeInterceptorAuthTest {

    private static final String SECRET = "test-jwt-secret-for-handshake-auth-32-chars-min";
    private static final Long USER_ID = 100L;

    private JwtTokenProvider jwtTokenProvider;
    private Environment environment;

    @BeforeEach
    void setUp() {
        JwtConfig config = new JwtConfig();
        config.setSecret(SECRET);
        config.setExpirationMs(7_200_000L);
        config.setKeyVersion(1);
        jwtTokenProvider = new JwtTokenProvider(config);

        environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
    }

    private WebSocketConfig.JwtHandshakeInterceptor interceptor() {
        return new WebSocketConfig.JwtHandshakeInterceptor(jwtTokenProvider, environment, 1L);
    }

    private ServerHttpRequest request(String headerName, String headerValue) {
        MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws");
        if (headerName != null) {
            servletRequest.addHeader(headerName, headerValue);
        }
        return new ServletServerHttpRequest(servletRequest);
    }

    @Test
    @DisplayName("匿名握手（无 Authorization / 无子协议）→ 拒绝升级")
    void handshake_withoutAnyCredential_isRejected() {
        ServerHttpRequest request = request(null, null);
        Map<String, Object> attributes = new HashMap<>();

        boolean allowed = interceptor().beforeHandshake(request,
                new org.springframework.http.server.ServletServerHttpResponse(
                        new org.springframework.mock.web.MockHttpServletResponse()),
                mock(org.springframework.web.socket.WebSocketHandler.class), attributes);

        assertFalse(allowed, "无凭据握手必须 fail-closed（P1-6）");
        assertTrue(attributes.isEmpty(), "拒绝的握手不得写入 userId 属性");
    }

    @Test
    @DisplayName("无效令牌（错误签名）→ 拒绝升级")
    void handshake_withInvalidToken_isRejected() {
        // 用另一密钥签发的令牌：签名校验必然失败
        JwtConfig otherConfig = new JwtConfig();
        otherConfig.setSecret("another-secret-key-not-equal-to-the-real-one-32chars");
        otherConfig.setExpirationMs(7_200_000L);
        otherConfig.setKeyVersion(1);
        String forgedToken = new JwtTokenProvider(otherConfig)
                .generateToken(String.valueOf(USER_ID));

        ServerHttpRequest request = request("Authorization", "Bearer " + forgedToken);

        assertFalse(interceptor().beforeHandshake(request,
                        new org.springframework.http.server.ServletServerHttpResponse(
                                new org.springframework.mock.web.MockHttpServletResponse()),
                        mock(org.springframework.web.socket.WebSocketHandler.class), new HashMap<>()),
                "签名校验不过的令牌必须拒绝（P1-6）");
    }

    @Test
    @DisplayName("正控：真实会话令牌经 Authorization 头 → 放行并写入 userId")
    void handshake_withValidToken_isAccepted() {
        String token = jwtTokenProvider.generateToken(String.valueOf(USER_ID));
        ServerHttpRequest request = request("Authorization", "Bearer " + token);
        Map<String, Object> attributes = new HashMap<>();

        assertTrue(interceptor().beforeHandshake(request,
                        new org.springframework.http.server.ServletServerHttpResponse(
                                new org.springframework.mock.web.MockHttpServletResponse()),
                        mock(org.springframework.web.socket.WebSocketHandler.class), attributes),
                "完整会话令牌握手应放行（正控，确保前两个负例不是『全坏』）");
        assertEquals(String.valueOf(USER_ID),
                attributes.get(WebSocketConfig.JwtHandshakeInterceptor.USER_ID_ATTR));
    }
}
