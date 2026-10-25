package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * P0-2 媒体令牌降权：{@link JwtAuthenticationFilter} 对 {@code scope=media} 令牌的行为契约。
 *
 * <p>漏洞事实（本测试集就是它的回归锁）：媒体令牌原本只在「从 {@code ?token=} 查询参数
 * 进来且 {@code app.security.media-query-token-strict=true}」时才被认成媒体令牌；
 * 同一个令牌从 {@code Authorization: Bearer} 头进来时，过滤器照常按 userId 查库并授予
 * {@code ROLE_USER}（管理员还会追加 ROLE_ADMIN/ROLE_SUPER_ADMIN/ROLE_AUDITOR），
 * 于是 5 分钟生命期的媒体令牌等于一份完整用户会话。</p>
 *
 * <p>收敛后的契约（与令牌来源无关）：</p>
 * <ul>
 *   <li>有效且 {@code scope=media} 的令牌，只在「媒体读取请求」（GET/HEAD
 *       {@code /api/v1/media/{userId}/{资源路径}}）上注入<b>仅含 ROLE_MEDIA</b> 的认证；</li>
 *   <li>其它任何路径（业务接口、管理端、上传、{@code /api/v1/media/token} 签发）
 *       一律不注入认证——由 {@code AuthenticationEntryPoint} 出 401，
 *       安全链再兜一层（见 {@code MediaTokenPolicy} 的 deny 规则）；</li>
 *   <li>媒体令牌永远拿不到 ROLE_USER / ROLE_ADMIN / ROLE_SUPER_ADMIN / ROLE_AUDITOR；</li>
 *   <li>无 scope 的完整用户会话行为不变（含 {@code ?token=} 的严格开关语义）。</li>
 * </ul>
 *
 * <p>测试策略：使用<b>真实</b> {@link JwtTokenProvider}（同签名密钥签发真 JWT），
 * 只 mock 数据库与黑名单，避免「mock 掉被测口径」的空转断言；
 * 每条降权断言都配一条完整会话的正控，防止规则过宽或测试本身失效。</p>
 */
class JwtAuthenticationFilterMediaScopeTest {

    private static final String SECRET = "test-jwt-secret-for-media-scope-filter-32-chars-min";
    private static final Long USER_ID = 100L;
    private static final String MEDIA_READ_PATH = "/api/v1/media/100/202607/abc.jpg";
    private static final String BUSINESS_PATH = "/api/v1/posts/1";
    private static final String ADMIN_PATH = "/api/v1/admin/users";

    private JwtTokenProvider jwtTokenProvider;
    private UserRepository userRepository;
    private TokenBlacklistService tokenBlacklistService;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(buildConfig());
        userRepository = Mockito.mock(UserRepository.class);
        tokenBlacklistService = Mockito.mock(TokenBlacklistService.class);
        filter = new JwtAuthenticationFilter(
                    jwtTokenProvider, userRepository, tokenBlacklistService, new com.campuslove.api.media.MediaUrlSigner("", "unit-test-jwt-secret"));
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private JwtConfig buildConfig() {
        JwtConfig config = new JwtConfig();
        config.setSecret(SECRET);
        config.setExpirationMs(7_200_000L);
        config.setKeyVersion(1);
        return config;
    }

    /** 媒体令牌（scope=media，TTL 5 分钟） */
    private String mediaToken() {
        return jwtTokenProvider.generateMediaToken(String.valueOf(USER_ID));
    }

    /** 完整用户会话令牌（无 scope 声明） */
    private String fullToken() {
        return jwtTokenProvider.generateToken(String.valueOf(USER_ID));
    }

    private void mockActiveUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setNickname("测试用户");
        user.setRole("USER");
        Mockito.when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
    }

    private void mockAdminUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setNickname("管理员");
        user.setRole("ADMIN");
        Mockito.when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
    }

    private Authentication currentAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private List<String> authoritiesOf(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
    }

    private MockFilterChain doFilter(String method, String path, String bearerToken, String queryToken)
            throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRequestURI(path);
        if (bearerToken != null) {
            request.addHeader("Authorization", "Bearer " + bearerToken);
        }
        if (queryToken != null) {
            request.setParameter("token", queryToken);
        }
        MockFilterChain chain = new MockFilterChain();
        filter.doFilterInternal(request, new MockHttpServletResponse(), chain);
        return chain;
    }

    // ========================================================================
    // 一、Authorization 头携带媒体令牌：不得升格为完整会话（漏洞回归锁）
    // ========================================================================

    @Test
    @DisplayName("头携带媒体令牌访问业务接口：不注入任何认证（不得有 ROLE_USER）")
    void headerMediaToken_onBusinessEndpoint_doesNotGrantUserSession() throws Exception {
        mockActiveUser();

        doFilter("POST", BUSINESS_PATH, mediaToken(), null);

        Authentication authentication = currentAuthentication();
        assertTrue(authentication == null || authentication.getAuthorities().isEmpty(),
                "媒体令牌不得在业务接口上形成会话，实际权限: "
                        + (authentication == null ? "null" : authoritiesOf(authentication)));
    }

    @Test
    @DisplayName("管理员的媒体令牌访问管理端：不得获得 ROLE_ADMIN/ROLE_SUPER_ADMIN/ROLE_AUDITOR")
    void headerMediaToken_ofAdminUser_onAdminEndpoint_doesNotGrantAdminRoles() throws Exception {
        mockAdminUser();

        doFilter("GET", ADMIN_PATH, mediaToken(), null);

        Authentication authentication = currentAuthentication();
        List<String> granted = authentication == null ? List.of() : authoritiesOf(authentication);
        assertTrue(authentication == null || authentication.getAuthorities().isEmpty(),
                "媒体令牌即使属于管理员账号也只能读媒体，实际权限: " + granted);
        for (String forbidden : List.of("ROLE_USER", "ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_AUDITOR")) {
            assertTrue(!granted.contains(forbidden), "媒体令牌不应携带 " + forbidden);
        }
    }

    @Test
    @DisplayName("头携带媒体令牌访问上传端点：不注入认证（上传必须是完整会话）")
    void headerMediaToken_onUploadEndpoint_doesNotAuthenticate() throws Exception {
        mockActiveUser();

        doFilter("POST", "/api/v1/media/upload", mediaToken(), null);

        assertNull(currentAuthentication(), "媒体令牌不得调用上传端点");
    }

    @Test
    @DisplayName("头携带媒体令牌访问令牌签发端点：不注入认证（媒体令牌不得自我续期）")
    void headerMediaToken_onMediaTokenIssuance_doesNotAuthenticate() throws Exception {
        mockActiveUser();

        doFilter("GET", "/api/v1/media/token", mediaToken(), null);

        assertNull(currentAuthentication(), "媒体令牌不得换取新的媒体令牌/完整会话");
    }

    @Test
    @DisplayName("头携带媒体令牌对媒体读取路径发起写方法（PUT/DELETE/PATCH/POST）：一律不注入认证")
    void headerMediaToken_onMediaPathWithWriteMethods_doesNotAuthenticate() throws Exception {
        mockActiveUser();

        for (String writeMethod : List.of("PUT", "DELETE", "PATCH", "POST")) {
            SecurityContextHolder.clearContext();
            doFilter(writeMethod, MEDIA_READ_PATH, mediaToken(), null);
            assertNull(currentAuthentication(),
                    writeMethod + " 不是只读方法，媒体令牌不得借媒体前缀发起变更");
        }
    }

    @Test
    @DisplayName("头携带媒体令牌访问账号安全端点（/auth/** 下的需登录接口）：不注入认证")
    void headerMediaToken_onSecuredAccountEndpoint_doesNotAuthenticate() throws Exception {
        mockActiveUser();

        doFilter("POST", "/api/v1/auth/deactivate", mediaToken(), null);

        assertNull(currentAuthentication(),
                "账号写操作必须由完整会话发起，媒体令牌不得触达");
    }

    // ========================================================================
    // 二、媒体读取：只注入 ROLE_MEDIA
    // ========================================================================

    @Test
    @DisplayName("头携带媒体令牌读取媒体文件：注入仅含 ROLE_MEDIA 的认证")
    void headerMediaToken_onMediaRead_grantsMediaRoleOnly() throws Exception {
        mockActiveUser();

        MockFilterChain chain = doFilter("GET", MEDIA_READ_PATH, mediaToken(), null);

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication, "媒体令牌应能建立媒体读取会话");
        assertEquals(USER_ID, authentication.getPrincipal(), "principal 应为令牌中的 userId，供归属校验");
        assertEquals(List.of("ROLE_MEDIA"), authoritiesOf(authentication),
                "媒体令牌只能拿到 ROLE_MEDIA 一项权限");
        assertNotNull(chain.getRequest(), "过滤器链应继续执行");
    }

    @Test
    @DisplayName("HEAD 媒体读取同样是媒体会话（只读方法白名单）")
    void headerMediaToken_onMediaHeadRead_grantsMediaRoleOnly() throws Exception {
        mockAdminUser();

        doFilter("HEAD", MEDIA_READ_PATH, mediaToken(), null);

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication, "HEAD 读媒体应被认证");
        assertEquals(List.of("ROLE_MEDIA"), authoritiesOf(authentication),
                "即使是管理员签发的媒体令牌，也只有 ROLE_MEDIA");
    }

    // ========================================================================
    // 三、查询参数路径：严格开关语义不变，且无论开关都不能升格
    // ========================================================================

    @Test
    @DisplayName("严格模式 + 查询参数媒体令牌读取媒体：仅 ROLE_MEDIA")
    void queryMediaToken_inStrictMode_onMediaRead_grantsMediaRoleOnly() throws Exception {
        mockActiveUser();
        setStrict(true);

        doFilter("GET", MEDIA_READ_PATH, null, mediaToken());

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication, "媒体令牌正是查询参数模式的合法凭据");
        assertEquals(List.of("ROLE_MEDIA"), authoritiesOf(authentication));
    }

    @Test
    @DisplayName("严格模式 + 查询参数携带完整 JWT：仍被拒绝（既有行为不回退）")
    void queryFullToken_inStrictMode_isRejected() throws Exception {
        mockActiveUser();
        setStrict(true);

        doFilter("GET", MEDIA_READ_PATH, null, fullToken());

        assertNull(currentAuthentication(), "严格模式下完整 JWT 不得进入 URL");
    }

    @Test
    @DisplayName("非严格模式 + 查询参数携带完整 JWT：保持旧客户端兼容（ROLE_USER，不掺 ROLE_MEDIA）")
    void queryFullToken_inNonStrictMode_keepsLegacyUserSession() throws Exception {
        mockActiveUser();
        setStrict(false);

        doFilter("GET", MEDIA_READ_PATH, null, fullToken());

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication, "旧客户端兼容路径不得被本次改动打断");
        List<String> granted = authoritiesOf(authentication);
        assertTrue(granted.contains("ROLE_USER"), "完整会话仍是 ROLE_USER，实际: " + granted);
        assertTrue(!granted.contains("ROLE_MEDIA"), "完整会话不应被降权，实际: " + granted);
    }

    @Test
    @DisplayName("非严格模式 + 查询参数携带媒体令牌：同样只有 ROLE_MEDIA（开关不放宽降权）")
    void queryMediaToken_inNonStrictMode_stillMediaRoleOnly() throws Exception {
        mockAdminUser();
        setStrict(false);

        doFilter("GET", MEDIA_READ_PATH, null, mediaToken());

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication);
        assertEquals(List.of("ROLE_MEDIA"), authoritiesOf(authentication),
                "开关关闭时媒体令牌也不得获得管理员权限");
    }

    @Test
    @DisplayName("非严格模式 + 查询参数媒体令牌访问业务路径：不注入认证")
    void queryMediaToken_inNonStrictMode_onBusinessEndpoint_doesNotAuthenticate() throws Exception {
        mockAdminUser();
        setStrict(false);

        // 业务路径本就不接受查询参数令牌，媒体令牌更不可能形成会话
        doFilter("POST", BUSINESS_PATH, null, mediaToken());

        assertNull(currentAuthentication(), "查询参数媒体令牌不得访问业务接口");
    }

    // ========================================================================
    // 四、正控：完整用户会话行为不变
    // ========================================================================

    @Test
    @DisplayName("正控：完整令牌访问业务接口仍是 ROLE_USER 会话（无 ROLE_MEDIA）")
    void fullToken_onBusinessEndpoint_grantsUserSession() throws Exception {
        mockActiveUser();

        doFilter("POST", BUSINESS_PATH, fullToken(), null);

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication, "完整会话必须继续可用");
        List<String> granted = authoritiesOf(authentication);
        assertTrue(granted.contains("ROLE_USER"), "实际权限: " + granted);
        assertTrue(!granted.contains("ROLE_MEDIA"), "完整会话不应带媒体权限，实际: " + granted);
    }

    @Test
    @DisplayName("正控：管理员完整令牌在管理端仍获 ROLE_ADMIN")
    void fullToken_ofAdminUser_onAdminEndpoint_grantsAdminRole() throws Exception {
        mockAdminUser();

        doFilter("GET", ADMIN_PATH, fullToken(), null);

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication, "完整会话正控不应为空");
        List<String> granted = authoritiesOf(authentication);
        assertTrue(granted.contains("ROLE_ADMIN"), "管理员完整令牌应保留 ROLE_ADMIN，实际: " + granted);
    }

    @Test
    @DisplayName("正控：完整令牌读取媒体仍为 ROLE_USER（不被降权）")
    void fullToken_onMediaRead_grantsUserSession() throws Exception {
        mockActiveUser();

        doFilter("GET", MEDIA_READ_PATH, fullToken(), null);

        Authentication authentication = currentAuthentication();
        assertNotNull(authentication);
        List<String> granted = authoritiesOf(authentication);
        assertTrue(granted.contains("ROLE_USER"), "实际权限: " + granted);
        assertTrue(!granted.contains("ROLE_MEDIA"), "实际权限: " + granted);
    }

    // ========================================================================
    // 五、账号状态与撤销：媒体令牌不得成为绕过口子
    // ========================================================================

    @Test
    @DisplayName("被禁用用户的媒体令牌读取媒体：不注入认证")
    void mediaToken_ofDisabledUser_onMediaRead_doesNotAuthenticate() throws Exception {
        User disabled = new User();
        disabled.setId(USER_ID);
        disabled.setRole("USER");
        disabled.setStatus("disabled");
        Mockito.when(userRepository.findById(USER_ID)).thenReturn(Optional.of(disabled));

        doFilter("GET", MEDIA_READ_PATH, mediaToken(), null);

        assertNull(currentAuthentication(), "禁用用户的媒体令牌不得读媒体");
    }

    @Test
    @DisplayName("已删除用户的媒体令牌读取媒体：不注入认证")
    void mediaToken_ofDeletedUser_onMediaRead_doesNotAuthenticate() throws Exception {
        Mockito.when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        doFilter("GET", MEDIA_READ_PATH, mediaToken(), null);

        assertNull(currentAuthentication(), "已删除用户的媒体令牌不得读媒体");
    }

    @Test
    @DisplayName("已登出（jti 撤销）的媒体令牌读取媒体：不注入认证")
    void revokedMediaToken_onMediaRead_doesNotAuthenticate() throws Exception {
        mockActiveUser();
        String token = mediaToken();
        String jti = jwtTokenProvider.getJtiFromToken(token);
        assertNotNull(jti, "媒体令牌应带 jti");
        Mockito.when(tokenBlacklistService.isRevoked(jti)).thenReturn(true);

        doFilter("GET", MEDIA_READ_PATH, token, null);

        assertNull(currentAuthentication(), "撤销后的媒体令牌不得继续读媒体");
        // 正控：同一用户同一密钥下未撤销的令牌仍可认证
        clearRevokedMock();
        doFilter("GET", MEDIA_READ_PATH, mediaToken(), null);
        assertNotNull(currentAuthentication(), "未撤销的媒体令牌应正常认证（对照组）");
    }

    private void setStrict(boolean strict) {
        ReflectionTestUtils.setField(filter, "strictMediaQueryToken", strict);
    }

    private void clearRevokedMock() {
        Mockito.reset(tokenBlacklistService);
    }
}
