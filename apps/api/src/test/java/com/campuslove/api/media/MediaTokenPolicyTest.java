package com.campuslove.api.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;

/**
 * P0-2 媒体令牌降权：媒体读取请求判定与媒体权限判定的唯一真源
 * （{@link MediaTokenPolicy}）单元测试。
 *
 * <p>这个类是「媒体令牌只能读媒体」这条规则的唯一口径，过滤器
 * （{@link com.campuslove.api.config.JwtAuthenticationFilter}）与安全配置
 * （{@link com.campuslove.api.config.SecurityConfig} / {@link MockSecurityConfig}）
 * 共用它，因此必须先把边界钉死：</p>
 * <ul>
 *   <li>只有 {@code GET}/{@code HEAD} 且命中 {@code /api/v1/media/{userId}/**} 形态
 *       的路径才算「媒体读取」；</li>
 *   <li>同前缀下的令牌签发（{@code /api/v1/media/token}）与上传
 *       （{@code /api/v1/media/upload}）一律不算读取，即便带上多余子路径；</li>
 *   <li>「媒体令牌」= 只有 ROLE_MEDIA、没有 ROLE_USER 的认证主体；
 *       完整用户会话（含 ROLE_USER）不受本策略约束。</li>
 * </ul>
 */
class MediaTokenPolicyTest {

    /** 真实媒体读取 URL：/api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext} */
    private static final String MEDIA_READ_PATH = "/api/v1/media/100/202607/abc.jpg";

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("媒体读取路径：/api/v1/media/{userId}/{subPath} 命中")
    void isMediaReadPath_userScopedResourcePath_isTrue() {
        assertTrue(MediaTokenPolicy.isMediaReadPath(MEDIA_READ_PATH),
                "用户目录下的媒体资源路径应判定为媒体读取");
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/voice/202607/a.m4a"),
                "多级子路径同样属于媒体读取");
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/app-assets/generated/a.png"),
                "应用资产同样是媒体读取（本身 permitAll）");
    }

    @Test
    @DisplayName("媒体读取路径：同前缀的签发/上传端点不得被误判为读取")
    void isMediaReadPath_tokenAndUploadEndpoints_areFalse() {
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/token"),
                "媒体令牌签发端点不是读取，媒体令牌不得自我续期");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/token/202607"),
                "签发端点的任何子路径形态也不得被当成读取");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/upload"),
                "上传端点不是读取");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/upload/202607/a.jpg"),
                "上传端点的任何子路径形态也不得被当成读取");
    }

    @Test
    @DisplayName("媒体读取路径：非媒体前缀与残缺路径不命中")
    void isMediaReadPath_otherPaths_areFalse() {
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/posts/1"), "业务路径不是媒体读取");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/admin/media-assets"), "管理端不是媒体读取");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100"), "仅有 userId、没有资源子路径不算读取");
        assertFalse(MediaTokenPolicy.isMediaReadPath(null), "null 路径不命中（fail-closed）");
        assertFalse(MediaTokenPolicy.isMediaReadPath(""), "空路径不命中（fail-closed）");
    }

    @Test
    @DisplayName("媒体读取请求：只有 GET/HEAD 才算读取，写方法一律不算")
    void isMediaReadRequest_onlyGetAndHead_isTrue() {
        assertTrue(MediaTokenPolicy.isMediaReadRequest(request("GET", MEDIA_READ_PATH)));
        assertTrue(MediaTokenPolicy.isMediaReadRequest(request("HEAD", MEDIA_READ_PATH)));
        assertFalse(MediaTokenPolicy.isMediaReadRequest(request("POST", MEDIA_READ_PATH)),
                "POST 读取路径也必须判否（写语义）");
        assertFalse(MediaTokenPolicy.isMediaReadRequest(request("PUT", MEDIA_READ_PATH)));
        assertFalse(MediaTokenPolicy.isMediaReadRequest(request("DELETE", MEDIA_READ_PATH)));
        assertFalse(MediaTokenPolicy.isMediaReadRequest(request("PATCH", MEDIA_READ_PATH)));
        // 方法对但路径不对，同样不算读取
        assertFalse(MediaTokenPolicy.isMediaReadRequest(request("GET", "/api/v1/media/upload")));
        assertFalse(MediaTokenPolicy.isMediaReadRequest(request("GET", "/api/v1/posts/1")));
    }

    @Test
    @DisplayName("媒体读取 matcher 与 isMediaReadRequest 口径一致（过滤器与安全配置同源）")
    void mediaReadRequestMatcher_agreesWithPredicate() {
        MockHttpServletRequest allowed = request("GET", MEDIA_READ_PATH);
        MockHttpServletRequest denied = request("POST", MEDIA_READ_PATH);
        assertEquals(MediaTokenPolicy.isMediaReadRequest(allowed),
                MediaTokenPolicy.mediaReadRequestMatcher().matches(allowed),
                "matcher 必须与谓词同口径，否则过滤器与安全链会出现缝隙");
        assertEquals(MediaTokenPolicy.isMediaReadRequest(denied),
                MediaTokenPolicy.mediaReadRequestMatcher().matches(denied));
    }

    @Test
    @DisplayName("媒体令牌认证主体：仅有 ROLE_MEDIA 时判定为媒体会话")
    void isMediaOnlyAuthentication_mediaRoleOnly_isTrue() {
        assertTrue(MediaTokenPolicy.isMediaOnlyAuthentication(
                authentication(100L, List.of("ROLE_MEDIA"))),
                "只带 ROLE_MEDIA 的主体就是媒体会话");
    }

    @Test
    @DisplayName("媒体令牌认证主体：带 ROLE_USER 的完整会话不得被判为媒体会话")
    void isMediaOnlyAuthentication_fullUserSession_isFalse() {
        assertFalse(MediaTokenPolicy.isMediaOnlyAuthentication(
                authentication(100L, List.of("ROLE_USER", "ROLE_ADMIN"))),
                "完整用户会话不受媒体降权规则约束");
        // 正控：ROLE_MEDIA 与 ROLE_USER 同时存在时按完整会话处理（降权规则只针对纯媒体会话）
        assertFalse(MediaTokenPolicy.isMediaOnlyAuthentication(
                authentication(100L, List.of("ROLE_USER", "ROLE_MEDIA"))));
        assertFalse(MediaTokenPolicy.isMediaOnlyAuthentication(authentication(100L, List.of("ROLE_USER"))));
        assertFalse(MediaTokenPolicy.isMediaOnlyAuthentication(null), "null 主体不命中（fail-closed）");
        assertFalse(MediaTokenPolicy.isMediaOnlyAuthentication(
                new AnonymousAuthenticationToken("key", "anonymous", List.of(
                        new SimpleGrantedAuthority("ROLE_ANONYMOUS")))),
                "匿名主体不是媒体会话");
    }

    @Test
    @DisplayName("媒体会话 matcher：跟随 SecurityContext 中的主体判定")
    void mediaOnlyAuthenticationMatcher_followsSecurityContext() {
        MockHttpServletRequest request = request("GET", "/api/v1/posts/1");

        SecurityContextHolder.getContext().setAuthentication(
                authentication(100L, List.of("ROLE_MEDIA")));
        assertTrue(MediaTokenPolicy.mediaOnlyAuthenticationMatcher().matches(request),
                "媒体会话访问业务路径应被 matcher 命中以触发拒绝规则");

        SecurityContextHolder.clearContext();
        SecurityContextHolder.getContext().setAuthentication(
                authentication(100L, List.of("ROLE_USER")));
        assertFalse(MediaTokenPolicy.mediaOnlyAuthenticationMatcher().matches(request),
                "完整用户会话不应命中媒体降权规则");
    }

    /* ========== 辅助方法 ========== */

    private MockHttpServletRequest request(String method, String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRequestURI(path);
        return request;
    }

    private Authentication authentication(Long userId, List<String> roles) {
        List<SimpleGrantedAuthority> authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        PreAuthenticatedAuthenticationToken authentication =
                new PreAuthenticatedAuthenticationToken(userId, "credentials", authorities);
        authentication.setAuthenticated(true);
        return authentication;
    }
}
