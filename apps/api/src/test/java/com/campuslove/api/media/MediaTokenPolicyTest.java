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
 *   <li>P0-2 收口：判定读的是原始请求 URI，所以<b>未归一化</b>的形态（{@code .}/{@code ..} 段、
 *       百分号编码、{@code //}、反斜杠、控制字符）一律先判否——否则
 *       {@code /api/v1/media/x/y/../../../posts/1} 会被 {@code **} 段当成媒体读取授予
 *       ROLE_MEDIA，而真实路由却是业务接口；文件名里的合法扩展名点（{@code avatar.png}）
 *       必须仍然判真；</li>
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

    // ========================================================================
    // P0-2 收口：原始 URI 未归一化时不得按「媒体读取」放行
    // ========================================================================
    //
    // 判定用的是 HttpServletRequest#getRequestURI()——那是容器交给安全链的<b>原始</b>串，
    // 可以带着 "." / ".." / 百分号编码 / 双斜杠；而 Spring MVC 那边的路由与授权规则
    // 匹配的是「解码并归一化之后」的串。两个串一旦不相等，「按原始串放行媒体读取」就等于
    // 用一把钥匙开另一扇门：`/api/v1/media/x/y/../../../posts/1` 会被 Ant 的 ** 段当成
    // 媒体读取而放行 ROLE_MEDIA，真实路由却是业务接口。这里把这类错位一律 fail-closed
    // 判成「不是媒体读取」（媒体令牌拿不到会话，落到安全链的 deny 规则上出 403）。

    @Test
    @DisplayName("媒体读取路径：含 . / .. 段的穿越形态判否")
    void isMediaReadPath_traversalSegments_areFalse() {
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/x/y/../../../posts/1"),
                "带 .. 的路径归一化后落在业务接口，不得按媒体读取放行");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/../../posts/1"),
                ".. 把媒体目录跳到 /posts 的形态同样判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/202607/../../../etc/passwd"),
                "逃出 storageRoot 的形态判否（存储层另有第二道 normalize 校验）");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/./202607/a.jpg"),
                "单点段 . 也属于未归一化形态，不得当成媒体读取");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/..%2fposts/1"),
                "编码与点混排的形态判否");
    }

    @Test
    @DisplayName("媒体读取路径：百分号编码的穿越片段（%2e / %2f / %5c / 双重编码）判否")
    void isMediaReadPath_encodedTraversalSegments_areFalse() {
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/x/y/%2e%2e/%2e%2e/posts/1"),
                "%2e%2e 解码后是 ..，与原始串不一致，判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/x/y/%2E%2E/%2E%2E/posts/1"),
                "大写十六进制同样命中");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/x/y/..%2f..%2fposts/1"),
                "%2f 解码后是路径分隔符，判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/x/y/..%5c..%5cposts%5c1"),
                "%5c（反斜杠，Windows 容器视作分隔符）判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/x/y/%252e%252e/%252e%252e/posts/1"),
                "双重编码 %252e 解一次仍是 %2e，判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/202607/%2e%2e%2f%2e%2e%2fposts/1"),
                "从文件名位置回跳的编码形态判否");
    }

    @Test
    @DisplayName("媒体读取路径：// 空段、反斜杠、控制字符、非绝对路径一律判否")
    void isMediaReadPath_otherNonNormalizedForms_areFalse() {
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media//100/202607/a.jpg"),
                "// 会被归一化折叠成 /，原始串与路由串不一致");
        assertFalse(MediaTokenPolicy.isMediaReadPath("//api/v1/media/100/202607/a.jpg"),
                "协议相对形态（// 开头）判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/202607\\..\\posts\\1"),
                "裸反斜杠判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/2026 07/a.jpg"),
                "原始请求 URI 不该出现裸空格（未编码），判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/202607/a\tb.jpg"),
                "控制字符判否");
        assertFalse(MediaTokenPolicy.isMediaReadPath("api/v1/media/100/202607/a.jpg"),
                "不是以 / 开头的串不像是请求 URI，判否（fail-closed）");
    }

    @Test
    @DisplayName("正控：文件名/扩展名里的点是合法的，收紧后仍能读出媒体")
    void isMediaReadPath_dotsInFileNames_areStillTrue() {
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/private/1/avatar.png"),
                "avatar.png 这类合法文件名必须仍然放行");
        assertTrue(MediaTokenPolicy.isMediaReadPath(MEDIA_READ_PATH), "既有真实形态不受影响");
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/202607/2f2a.f01.min.svg"),
                "文件名中的多个点不是穿越");
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/icons/.svg"),
                "以点开头的隐藏文件名不是 . 段");
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/202607/a..b.jpg"),
                "段内含连续点（a..b）不等于 .. 段");
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/app-assets/assets/icons/home/bell.svg"),
                "公开应用资产的 ASCII 路径照旧");
        assertTrue(MediaTokenPolicy.isMediaReadPath("/api/v1/media/100/voice/202607/a.m4a"),
                "多级子路径照旧");
    }

    @Test
    @DisplayName("归一化判定 helper：自身口径钉死（合法形态判真、错位形态判假）")
    void isNormalizedRequestPath_pinsTheHelperContract() {
        // 判真：服务端会真实产出的媒体 URL 形态
        assertTrue(MediaTokenPolicy.isNormalizedRequestPath(MEDIA_READ_PATH));
        assertTrue(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/private/1/avatar.png"));
        assertTrue(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/100/icons/.svg"));
        assertTrue(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/100/202607/"),
                "尾随斜杠不是遍历形态（Ant 的 ** 会忽略空尾巴）");
        // 判假：原始串与「解码 + 归一化后的路由输入」不等价的每一类
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath(null));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath(""));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("   "));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("api/v1/media/100/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("//api/v1/media/100/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/./100/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/../100/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/.../a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/100/%2e%2e/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/100/%2f/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/100/%252e%252e/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/100/..\\a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media//100/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/10 0/a.jpg"));
        assertFalse(MediaTokenPolicy.isNormalizedRequestPath("/api/v1/media/10" + (char) 0 + "/a.jpg"),
                "控制字符不属于原始请求 URI");
    }

    @Test
    @DisplayName("媒体读取请求：穿越与编码穿越的原始 URI 不建立媒体会话")
    void isMediaReadRequest_nonNormalizedUri_isFalse() {
        assertFalse(MediaTokenPolicy.isMediaReadRequest(
                request("GET", "/api/v1/media/x/y/../../../posts/1")),
                "带 .. 的原始 URI 不得被过滤器当成媒体读取");
        assertFalse(MediaTokenPolicy.isMediaReadRequest(
                request("GET", "/api/v1/media/x/y/%2e%2e/%2e%2e/posts/1")),
                "编码穿越的原始 URI 同样不得建会话");
        assertFalse(MediaTokenPolicy.isMediaReadRequest(
                request("GET", "/api/v1/media//100/202607/a.jpg")),
                "// 形态同样判否");
        // 正控：合法媒体读取仍然为真
        assertTrue(MediaTokenPolicy.isMediaReadRequest(
                request("GET", "/api/v1/media/private/1/avatar.png")));
        // matcher 与谓词同源（安全链第一条规则用的就是这个 matcher）
        assertFalse(MediaTokenPolicy.mediaReadRequestMatcher()
                .matches(request("GET", "/api/v1/media/x/y/../../../posts/1")));
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
