package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.JwtAuthenticationFilter;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.entity.User;
import com.campuslove.api.monitor.AuthMetrics;
import com.campuslove.api.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * R14-5（audit-r14 批5，infra R2-00300 落地，2026-11-05）：
 * 管理端 JWT 从 localStorage 迁移到 HttpOnly Cookie（{@code admin_session}）+ CSRF 双层防护。
 *
 * <p>覆盖五类契约：
 * <ol>
 *   <li>① {@code loginAsAdmin} 响应含 Set-Cookie，且 HttpOnly / SameSite=Strict / Path=/
 *       属性正确，Max-Age 与 {@code app.jwt.expiration-ms}（默认 7200000ms = 7200s）对齐，
 *       mock 分支与 real 分支都要签发；</li>
 *   <li>② Authorization 头缺失时 {@code admin_session} cookie 回退认证成功
 *       （{@link JwtAuthenticationFilter} 同一套 JWT 校验，管理员注入 ROLE_ADMIN）；</li>
 *   <li>③ cookie 认证的写请求缺 {@code X-Requested-With: XMLHttpRequest} → 403
 *       {@code {"code":"CSRF_REJECTED"}}，不进入过滤器链；</li>
 *   <li>④ Bearer 头永远优先于 cookie（QA 脚本/既有测试不受影响）；</li>
 *   <li>⑤ logout 请求携带 admin_session cookie 时 Set-Cookie 过期（Max-Age=0），
 *       既有 JWT 黑名单逻辑不变。</li>
 * </ol>
 *
 * <p>测试策略：纯 Mockito + spring-test Mock 对象，不加载 Spring 上下文（沿用同包
 * {@code AuthControllerLogoutTest} 与近邻 {@code JwtAuthenticationFilterTest} 的惯例）。
 * {@code @Value} 字段在直调构造下取字段初始值（secure=false、7200000ms），
 * secure=true 分支用 {@link ReflectionTestUtils} 注入模拟 Spring 装配结果。</p>
 */
@ExtendWith(MockitoExtension.class)
class AdminSessionCookieTest {

    private static final String TEST_TOKEN = "jwt-admin-session-token";
    private static final String BEARER_TOKEN = "jwt-bearer-priority-token";
    private static final String COOKIE_TOKEN = "jwt-cookie-fallback-token";
    private static final Long TEST_USER_ID = 100L;

    @Mock
    private AuthService authService;

    @Mock
    private AuthMetrics authMetrics;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        // SecurityContext 线程局部，逐用例清理避免残留
        SecurityContextHolder.clearContext();
    }

    /* ========== 辅助构造 ========== */

    /**
     * 构造 AuthController（沿用 AuthControllerLogoutTest 的 ObjectProvider 直调惯例）。
     *
     * @param withUserRepository true=real 分支（UserRepository bean 存在）；
     *                           false=mock 分支（无 JPA 仓库，走降级签发）
     * @param environment        环境快照（mock 分支必须带 mock profile）
     */
    private AuthController newController(boolean withUserRepository, Environment environment) {
        DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();
        if (withUserRepository) {
            beanFactory.registerSingleton("userRepository", userRepository);
        }
        return new AuthController(
                authService,
                authMetrics,
                beanFactory.getBeanProvider(UserRepository.class),
                environment);
    }

    /** 管理员用户实体（real 分支回库取角色用） */
    private User adminUser() {
        User admin = new User();
        admin.setId(TEST_USER_ID);
        admin.setOpenid("ops-admin");
        admin.setNickname("管理员");
        admin.setRole("ADMIN");
        admin.setStatus("active");
        return admin;
    }

    /** 登录成功返回的会话视图（携带 JWT） */
    private UserSessionView sessionWithToken() {
        return new UserSessionView(
                String.valueOf(TEST_USER_ID), true, "admin", "管理员",
                false, false, false, false, "南京校区",
                Map.of(), TEST_TOKEN);
    }

    /* ========== ① loginAsAdmin 签发 HttpOnly Cookie ========== */

    @Nested
    @DisplayName("① loginAsAdmin 签发 admin_session HttpOnly Cookie")
    class IssueCookieOnLogin {

        @Test
        @DisplayName("mock 分支：Set-Cookie 含 admin_session / HttpOnly / SameSite=Strict / Path=/ / Max-Age=7200")
        void loginAsAdmin_mockBranch_setsHttpOnlySessionCookie() throws Exception {
            // Arrange：mock 分支 = 无 UserRepository bean + mock profile
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("mock");
            AuthController controller = newController(false, env);
            when(authService.loginAsAdmin("ops", "pwd")).thenReturn(sessionWithToken());
            MockHttpServletResponse response = new MockHttpServletResponse();

            // Act
            controller.loginAsAdmin(new AdminLoginRequest("ops", "pwd"), response);

            // Assert：Set-Cookie 属性逐项核对（R2-00300 口径）
            String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
            assertNotNull(setCookie, "mock 分支登录成功也必须签发 admin_session Cookie");
            assertTrue(setCookie.startsWith("admin_session=" + TEST_TOKEN),
                    "Cookie 值应为登录签发的 JWT，实际: " + setCookie);
            assertTrue(setCookie.contains("HttpOnly"), "必须 HttpOnly（XSS 窃不走），实际: " + setCookie);
            assertTrue(setCookie.contains("SameSite=Strict"), "必须 SameSite=Strict，实际: " + setCookie);
            assertTrue(setCookie.contains("Path=/"), "必须 Path=/，实际: " + setCookie);
            assertTrue(setCookie.contains("Max-Age=7200"),
                    "Max-Age 必须与 app.jwt.expiration-ms（7200000ms=7200s）对齐，实际: " + setCookie);
            assertFalse(setCookie.contains("Secure"),
                    "本地 HTTP 联调（secure=false）不得带 Secure，实际: " + setCookie);
        }

        @Test
        @DisplayName("real 分支：同样签发 HttpOnly Cookie，载荷按用户表映射角色")
        void loginAsAdmin_realBranch_setsHttpOnlySessionCookie() throws Exception {
            // Arrange：real 分支 = UserRepository bean 存在 + 非 mock profile
            AuthController controller = newController(true, new StandardEnvironment());
            when(authService.loginAsAdmin("ops", "pwd")).thenReturn(sessionWithToken());
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(adminUser()));
            MockHttpServletResponse response = new MockHttpServletResponse();

            // Act
            var view = controller.loginAsAdmin(new AdminLoginRequest("ops", "pwd"), response);

            // Assert：Cookie 签发 + 既有载荷契约不变
            String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
            assertNotNull(setCookie, "real 分支登录成功必须签发 admin_session Cookie");
            assertTrue(setCookie.startsWith("admin_session=" + TEST_TOKEN),
                    "Cookie 值应为登录签发的 JWT，实际: " + setCookie);
            assertTrue(setCookie.contains("HttpOnly"), "必须 HttpOnly，实际: " + setCookie);
            assertTrue(setCookie.contains("SameSite=Strict"), "必须 SameSite=Strict，实际: " + setCookie);
            assertTrue(setCookie.contains("Path=/"), "必须 Path=/，实际: " + setCookie);
            assertTrue(setCookie.contains("Max-Age=7200"), "Max-Age 应与 JWT TTL 对齐，实际: " + setCookie);
            assertNotNull(view.data(), "响应体载荷契约保持不变");
            assertEquals("ADMIN", view.data().user().role(), "real 分支按用户表映射角色");
        }

        @Test
        @DisplayName("secure=true（生产 HTTPS）：Set-Cookie 追加 Secure 属性")
        void loginAsAdmin_secureConfigTrue_appendsSecureAttribute() throws Exception {
            // Arrange：Spring 装配下 @Value 注入 secure=true，直调用 ReflectionTestUtils 模拟
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles("mock");
            AuthController controller = newController(false, env);
            ReflectionTestUtils.setField(controller, "adminCookieSecure", true);
            when(authService.loginAsAdmin("ops", "pwd")).thenReturn(sessionWithToken());
            MockHttpServletResponse response = new MockHttpServletResponse();

            // Act
            controller.loginAsAdmin(new AdminLoginRequest("ops", "pwd"), response);

            // Assert
            String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
            assertNotNull(setCookie);
            assertTrue(setCookie.contains("Secure"),
                    "生产 HTTPS 部署（admin-cookie-secure=true）必须带 Secure，实际: " + setCookie);
        }
    }

    /* ========== ②③④ JwtAuthenticationFilter cookie 回退 + CSRF ========== */

    @Nested
    @DisplayName("②③④ 过滤器 cookie 回退认证与 CSRF 双层防护")
    class FilterCookieFallbackAndCsrf {

        private JwtAuthenticationFilter filter;

        @BeforeEach
        void setUpFilter() {
            filter = new JwtAuthenticationFilter(
                    jwtTokenProvider, userRepository, tokenBlacklistService,
                    new com.campuslove.api.media.MediaUrlSigner("", "unit-test-jwt-secret"));
        }

        @Test
        @DisplayName("② Bearer 缺失 + admin_session cookie → 回退认证成功并注入 ROLE_ADMIN")
        void doFilter_cookieFallbackAuthenticatesAdmin() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/users");
            request.setCookies(new Cookie(AuthController.ADMIN_SESSION_COOKIE, COOKIE_TOKEN));
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtTokenProvider.getJtiFromToken(COOKIE_TOKEN)).thenReturn("jti-cookie-1");
            when(tokenBlacklistService.isRevoked("jti-cookie-1")).thenReturn(false);
            when(jwtTokenProvider.getUserIdFromToken(COOKIE_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(adminUser()));

            filter.doFilter(request, response, filterChain);

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            assertNotNull(auth, "cookie 回退应完成同一套 JWT 认证");
            assertEquals(TEST_USER_ID, auth.getPrincipal(), "principal 应为 userId");
            assertTrue(auth.getAuthorities().stream()
                            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())),
                    "管理员应注入 ROLE_ADMIN");
            verify(filterChain).doFilter(request, response);
            assertEquals(200, response.getStatus(), "读请求不应触发 CSRF 拦截");
        }

        @Test
        @DisplayName("③ cookie 认证的写请求缺 X-Requested-With → 403 CSRF_REJECTED，不进过滤器链")
        void doFilter_cookieWriteWithoutRequestedWithHeader_rejected403() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/admin/users");
            request.setCookies(new Cookie(AuthController.ADMIN_SESSION_COOKIE, COOKIE_TOKEN));
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertEquals(403, response.getStatus(), "缺 X-Requested-With 的 cookie 写请求必须 403");
            assertTrue(response.getContentAsString().contains("CSRF_REJECTED"),
                    "响应体应为 {code:\"CSRF_REJECTED\"}，实际: " + response.getContentAsString());
            assertNull(SecurityContextHolder.getContext().getAuthentication(), "不得建立认证");
            verify(filterChain, never()).doFilter(request, response);
            // fail-closed：CSRF 闸在 JWT 校验之前，无效令牌同样拒绝
            verify(jwtTokenProvider, never()).getUserIdFromToken(anyString());
        }

        @Test
        @DisplayName("③ 正控：cookie 写请求带 X-Requested-With=XMLHttpRequest → 照常认证")
        void doFilter_cookieWriteWithRequestedWithHeader_authenticates() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/admin/users");
            request.setCookies(new Cookie(AuthController.ADMIN_SESSION_COOKIE, COOKIE_TOKEN));
            request.addHeader("X-Requested-With", "XMLHttpRequest");
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtTokenProvider.getJtiFromToken(COOKIE_TOKEN)).thenReturn("jti-cookie-2");
            when(tokenBlacklistService.isRevoked("jti-cookie-2")).thenReturn(false);
            when(jwtTokenProvider.getUserIdFromToken(COOKIE_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(adminUser()));

            filter.doFilter(request, response, filterChain);

            assertNotNull(SecurityContextHolder.getContext().getAuthentication(),
                    "携带 X-Requested-With 的 cookie 写请求应照常认证（管理端前端统一附带该头）");
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("④ Bearer 头永远优先于 cookie：cookie 值不参与任何解析")
        void doFilter_bearerHeaderWinsOverCookie() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/users");
            request.addHeader("Authorization", "Bearer " + BEARER_TOKEN);
            request.setCookies(new Cookie(AuthController.ADMIN_SESSION_COOKIE, COOKIE_TOKEN));
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtTokenProvider.getJtiFromToken(BEARER_TOKEN)).thenReturn("jti-bearer-1");
            when(tokenBlacklistService.isRevoked("jti-bearer-1")).thenReturn(false);
            when(jwtTokenProvider.getUserIdFromToken(BEARER_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(adminUser()));

            filter.doFilter(request, response, filterChain);

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            assertNotNull(auth, "Bearer 头认证应照常建立");
            assertEquals(TEST_USER_ID, auth.getPrincipal());
            // QA 语义保护：cookie 存在也不得抢占 Bearer 通道
            verify(jwtTokenProvider, never()).getJtiFromToken(COOKIE_TOKEN);
            verify(jwtTokenProvider, never()).getUserIdFromToken(COOKIE_TOKEN);
            assertEquals(200, response.getStatus(), "Bearer 认证的写/读请求不做 CSRF 拦截");
        }

        @Test
        @DisplayName("④ 正控：Bearer 头认证的写请求即使缺 X-Requested-With 也不拦（QA 脚本不受影响）")
        void doFilter_bearerWriteWithoutRequestedWithHeader_notBlocked() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/admin/users");
            request.addHeader("Authorization", "Bearer " + BEARER_TOKEN);
            request.setCookies(new Cookie(AuthController.ADMIN_SESSION_COOKIE, COOKIE_TOKEN));
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtTokenProvider.getJtiFromToken(BEARER_TOKEN)).thenReturn("jti-bearer-2");
            when(tokenBlacklistService.isRevoked("jti-bearer-2")).thenReturn(false);
            when(jwtTokenProvider.getUserIdFromToken(BEARER_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(adminUser()));

            filter.doFilter(request, response, filterChain);

            assertNotNull(SecurityContextHolder.getContext().getAuthentication(),
                    "Bearer 认证（tokenFromCookie=false）不受 CSRF 闸限制");
            verify(filterChain).doFilter(request, response);
            assertEquals(200, response.getStatus());
        }
    }

    /* ========== ⑤ logout 过期 Cookie ========== */

    @Nested
    @DisplayName("⑤ logout 携带 admin_session cookie 时同步过期")
    class LogoutExpiresCookie {

        @Test
        @DisplayName("logout 带 admin_session cookie → Set-Cookie Max-Age=0，JWT 黑名单逻辑不变")
        void logout_withSessionCookie_expiresCookieAndKeepsBlacklist() {
            AuthController controller = newController(true, new StandardEnvironment());
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie(AuthController.ADMIN_SESSION_COOKIE, COOKIE_TOKEN));
            MockHttpServletResponse response = new MockHttpServletResponse();

            var result = controller.logout("Bearer " + TEST_TOKEN, request, response);

            // 既有 JWT 黑名单逻辑不变：token 原样交给 AuthService
            verify(authService).logout(TEST_TOKEN);
            assertEquals(Boolean.TRUE, result.get("success"));
            String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
            assertNotNull(setCookie, "携带 admin_session cookie 的登出必须 Set-Cookie 过期");
            assertTrue(setCookie.startsWith("admin_session=;"),
                    "过期 Cookie 值应为空，实际: " + setCookie);
            assertTrue(setCookie.contains("Max-Age=0"), "必须 Max-Age=0 立即过期，实际: " + setCookie);
            assertTrue(setCookie.contains("HttpOnly"), "过期 Cookie 保持 HttpOnly，实际: " + setCookie);
            assertTrue(setCookie.contains("SameSite=Strict"), "过期 Cookie 属性与签发口径一致，实际: " + setCookie);
        }

        @Test
        @DisplayName("logoutAsAdmin 带 admin_session cookie → 同样 Set-Cookie 过期")
        void logoutAsAdmin_withSessionCookie_expiresCookie() {
            AuthController controller = newController(true, new StandardEnvironment());
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie(AuthController.ADMIN_SESSION_COOKIE, COOKIE_TOKEN));
            MockHttpServletResponse response = new MockHttpServletResponse();

            var result = controller.logoutAsAdmin("Bearer " + TEST_TOKEN, request, response);

            verify(authService).logoutAsAdmin(TEST_TOKEN);
            assertEquals(Boolean.TRUE, result.get("success"));
            String setCookie = response.getHeader(HttpHeaders.SET_COOKIE);
            assertNotNull(setCookie, "管理端登出必须 Set-Cookie 过期（管理后台前端走本端点）");
            assertTrue(setCookie.contains("Max-Age=0"), "必须 Max-Age=0，实际: " + setCookie);
        }

        @Test
        @DisplayName("logout 不带 admin_session cookie → 不产生 Set-Cookie（小程序用户不受影响）")
        void logout_withoutSessionCookie_noSetCookie() {
            AuthController controller = newController(true, new StandardEnvironment());
            MockHttpServletRequest request = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();

            var result = controller.logout("Bearer " + TEST_TOKEN, request, response);

            verify(authService).logout(TEST_TOKEN);
            assertEquals(Boolean.TRUE, result.get("success"));
            assertNull(response.getHeader(HttpHeaders.SET_COOKIE),
                    "未携带 admin_session cookie 时不应写 Set-Cookie");
        }
    }
}
