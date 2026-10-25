package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.media.MediaTokenPolicy;
import com.campuslove.api.media.MediaUrlSigner;
import com.campuslove.api.repository.UserRepository;
import java.nio.file.Files;
import java.nio.file.Path;
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

/**
 * P0-2：能力型媒体 URL 在认证过滤器层的语义。
 *
 * <p>签名必须换到**恰好等于媒体令牌**的那一档权限（只有 ROLE_MEDIA），
 * 换不到 ROLE_USER、换不到管理角色、也出不了媒体读取路径。
 * 这条边界一旦写宽，「URL 里没有会话凭据」就只是自我安慰。</p>
 */
class JwtAuthenticationFilterSignedUrlTest {

    private static final String SECRET = "signed-url-filter-test-secret-at-least-32-chars-x";
    private static final Long OWNER_USER_ID = 100L;
    private static final String MEDIA_READ_PATH = "/api/v1/media/100/202607/abc.jpg";
    private static final String OTHER_MEDIA_PATH = "/api/v1/media/100/202607/zzz.jpg";
    private static final String BUSINESS_PATH = "/api/v1/posts/1";

    private MediaUrlSigner signer;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        signer = new MediaUrlSigner("", SECRET);
        JwtConfig config = new JwtConfig();
        config.setSecret(SECRET);
        config.setExpirationMs(7_200_000L);
        config.setKeyVersion(1);
        filter = new JwtAuthenticationFilter(
                new JwtTokenProvider(config),
                Mockito.mock(UserRepository.class),
                Mockito.mock(TokenBlacklistService.class),
                signer);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("有效签名（无 Authorization 头）→ 只建立 ROLE_MEDIA，principal 为路径属主")
    void validSignature_authenticatesAsMediaOnly() throws Exception {
        long exp = signer.expiresAtNow();
        MockHttpServletRequest request = mediaRequest("GET", MEDIA_READ_PATH, exp, signer.sign(MEDIA_READ_PATH, exp));

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication, "有效签名必须建立认证，否则真机全黑图");
        assertEquals(OWNER_USER_ID, authentication.getPrincipal());
        assertEquals(MediaTokenPolicy.ROLE_MEDIA, authorities(authentication),
                "签名只应换到 ROLE_MEDIA，实际：" + authorities(authentication));
    }

    @Test
    @DisplayName("签名被改一个字符 → 不建立任何认证")
    void tamperedSignature_notAuthenticated() throws Exception {
        long exp = signer.expiresAtNow();
        String sig = signer.sign(MEDIA_READ_PATH, exp);
        String flipped = (sig.charAt(0) == 'a' ? 'b' : 'a') + sig.substring(1);

        filter.doFilter(mediaRequest("GET", MEDIA_READ_PATH, exp, flipped),
                new MockHttpServletResponse(), new MockFilterChain());

        assertNoAuthentication();
    }

    @Test
    @DisplayName("签名过期 → 不建立任何认证")
    void expiredSignature_notAuthenticated() throws Exception {
        long past = java.time.Instant.now().getEpochSecond() - 1;

        filter.doFilter(mediaRequest("GET", MEDIA_READ_PATH, past, signer.sign(MEDIA_READ_PATH, past)),
                new MockHttpServletResponse(), new MockFilterChain());

        assertNoAuthentication();
    }

    @Test
    @DisplayName("A 图的签名不能读 B 图（逐路径绑定在过滤器层同样生效）")
    void signatureIsPathBoundAtFilterLayer() throws Exception {
        long exp = signer.expiresAtNow();

        filter.doFilter(mediaRequest("GET", OTHER_MEDIA_PATH, exp, signer.sign(MEDIA_READ_PATH, exp)),
                new MockHttpServletResponse(), new MockFilterChain());

        assertNoAuthentication();
    }

    @Test
    @DisplayName("签名出不了媒体读取路径：业务接口上带签名不建立认证")
    void signatureCannotAuthorizeBusinessApi() throws Exception {
        long exp = signer.expiresAtNow();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", BUSINESS_PATH);
        request.setRequestURI(BUSINESS_PATH);
        request.addParameter(MediaUrlSigner.PARAM_EXPIRES, String.valueOf(exp));
        request.addParameter(MediaUrlSigner.PARAM_SIGNATURE, signer.sign(BUSINESS_PATH, exp));

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertNoAuthentication();
    }

    @Test
    @DisplayName("非 GET/HEAD 方法带有效签名 → 不建立认证（媒体读取方法判定同源）")
    void nonReadMethod_notAuthenticated() throws Exception {
        long exp = signer.expiresAtNow();

        filter.doFilter(mediaRequest("POST", MEDIA_READ_PATH, exp, signer.sign(MEDIA_READ_PATH, exp)),
                new MockHttpServletResponse(), new MockFilterChain());

        assertNoAuthentication();
    }

    @Test
    @DisplayName("缺签名的媒体请求不被本通道放行（继续走令牌/401 兜底）")
    void missingSignature_fallsThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", MEDIA_READ_PATH);
        request.setRequestURI(MEDIA_READ_PATH);

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertNoAuthentication();
    }

    /**
     * 默认值翻正：{@code media-query-token-strict} 必须默认 true。
     *
     * <p>为什么在单测里读配置文件而不是断字段：{@code @Value} 的默认值只有 Spring
     * 装配时才生效，纯 new 出来的过滤器里字段恒为 Java 默认 false——
     * 断字段会得到一个与实现无关的假绿。这里判的是「部署不带环境变量时的真实取值」。</p>
     */
    @Test
    @DisplayName("application.yml 默认开启媒体查询参数严格模式（完整 JWT 不得再进 ?token=）")
    void strictMediaQueryTokenDefaultsToTrue() throws Exception {
        String yml = Files.readString(Path.of("src/main/resources/application.yml"));

        assertTrue(
                yml.contains("media-query-token-strict: ${APP_MEDIA_QUERY_TOKEN_STRICT:true}"),
                "media-query-token-strict 默认值必须是 true，否则完整会话 JWT 仍可拼进图片 URL");
    }

    private MockHttpServletRequest mediaRequest(String method, String path, long exp, String sig) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRequestURI(path);
        request.addParameter(MediaUrlSigner.PARAM_EXPIRES, String.valueOf(exp));
        request.addParameter(MediaUrlSigner.PARAM_SIGNATURE, sig);
        return request;
    }

    private void assertNoAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertTrue(authentication == null || !authentication.isAuthenticated(),
                "不该建立认证，实际：" + authentication);
    }

    private String authorities(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .sorted()
                .collect(Collectors.joining(","));
    }
}
