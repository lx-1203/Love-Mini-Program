package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.campuslove.api.media.MediaTokenPolicy;
import com.campuslove.api.testdata.MockAllRepositoriesConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

/**
 * P0-2 媒体令牌降权：授权规则层的契约测试。
 *
 * <p>{@link MediaTokenPolicy#mediaOnlyAuthenticationMatcher()} + {@code denyAll()} 这条
 * 规则是「媒体令牌只能读媒体」在 Spring Security 授权层的落地（过滤器层只是第一道，
 * 规则必须独立成立，否则将来任何人改动过滤器就会静默打开越权面）。</p>
 *
 * <p>规则链由 {@link SecurityConfig}（real）与 {@link MockSecurityConfig}（mock）
 * 共用同一个 {@code MediaTokenPolicy} 装配方法注入，规则本体是同一份代码，
 * 因此本测试在 mock profile 下验证的就是生产环境生效的那条规则
 * （与 {@link SecurityConfigTest} 既有的「mock 链镜像 real 链」策略一致）。
 * profile 差异只体现在 Controller 是否注册：媒体控制器是 {@code @Profile("real")}，
 * mock 档下授权放行后表现为 404，被拒时表现为 403——据此区分「安全链放行」与
 * 「安全链拒绝」，不依赖业务代码。</p>
 *
 * <p>每条拒绝断言都配一条完整会话（ROLE_USER）的正控，防止规则写宽把正常用户一起挡掉，
 * 也防止断言空转通过。</p>
 *
 * <p>第四节改为用<b>真实签发的 JWT</b>（Authorization 头与 {@code ?token=} 两种方式）
 * 走完整安全链，钉住「demo/mock 档的免真实认证注入不得成为媒体令牌的升格通道」——
 * 该档只按凭据的 scope 决定注入 ROLE_USER 还是 ROLE_MEDIA，规则本体与 real 档同源。</p>
 */
@SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-media-token-authz-rules-32-chars-min")
@AutoConfigureMockMvc
@Import(MockAllRepositoriesConfig.class)
@DisplayName("P0-2: 媒体令牌授权规则（ROLE_MEDIA 仅限媒体读取）")
class MediaTokenAuthorizationRulesTest {

    @MockBean private com.campuslove.api.repository.OfficialChatMessageRepository officialChatMessageRepository;
    @MockBean private com.campuslove.api.repository.OfficialAccountRepository officialAccountRepository;
    @MockBean private com.campuslove.api.repository.WhisperMessageRepository whisperMessageRepository;

    @Autowired
    private MockMvc mockMvc;

    /**
     * 真源令牌签发器：本节的用例用<b>真签发的 JWT</b>（而不是 {@code @WithMockUser} 伪造的
     * 角色）走完整安全链，覆盖「认证注入 → 授权判定」全链路。
     * mock 档的 {@code MockAuthenticationFilter} 与 real 档的 JwtAuthenticationFilter
     * 共用 {@link MediaTokenPolicy} 的 deny 规则，因此这里验证的正是生产环境那条规则。
     */
    @Autowired
    private com.campuslove.api.config.JwtTokenProvider jwtTokenProvider;

    /** 真实签发的媒体访问令牌（scope=media） */
    private String mediaJwt() {
        return jwtTokenProvider.generateMediaToken("100");
    }

    /** 真实签发的完整用户会话令牌（无 scope） */
    private String fullJwt() {
        return jwtTokenProvider.generateToken("100");
    }

    /** 真实媒体读取 URL 形态：/api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext} */
    private static final String MEDIA_READ_PATH = "/api/v1/media/100/202607/abc.jpg";

    /**
     * 断言「403 来自安全链的 {@code JwtAccessDeniedHandler}」而不是业务层抛出来的 403。
     *
     * <p>判别依据是响应体形状：安全链的 403 体固定带 {@code code=FORBIDDEN} 与
     * {@code traceId}；而 {@code GlobalExceptionHandler} 处理
     * {@link org.springframework.security.access.AccessDeniedException} 时返回的 403
     * 只有 {@code error/message/status}、没有 {@code traceId}。
     * 不加这层判别的话，像「控制器里恰好抛了 403」也会让用例通过，等于空转断言。</p>
     */
    private void assertDeniedBySecurityChain(org.springframework.test.web.servlet.MvcResult result)
            throws java.io.UnsupportedEncodingException {
        int code = result.getResponse().getStatus();
        String body = result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        if (code != 403) {
            throw new AssertionError("媒体会话应被安全链拒绝为 403，实际: " + code + "，响应体: " + body);
        }
        if (!body.contains("\"traceId\"") || !body.contains("FORBIDDEN")) {
            throw new AssertionError("403 应来自安全链 JwtAccessDeniedHandler（带 code/traceId），"
                    + "说明请求其实穿透到了业务层，响应体: " + body);
        }
    }

    // ========================================================================
    // 一、媒体会话（仅 ROLE_MEDIA）在非读取路径上一律 403
    // ========================================================================

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话访问业务接口 → 安全链 403")
    void mediaSession_onBusinessEndpoint_isForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/users/123/follow"))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话访问业务 GET 接口 → 安全链 403（只读方法不等于放行）")
    void mediaSession_onBusinessGetEndpoint_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/posts/1"))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话访问管理端 → 安全链 403（即便令牌属主其实是管理员账号）")
    void mediaSession_onAdminEndpoint_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话调用上传端点 → 安全链 403（同前缀的写端点不放行）")
    void mediaSession_onUploadEndpoint_isForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/media/upload"))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话调用令牌签发端点 → 安全链 403（媒体令牌不得自我续期）")
    void mediaSession_onMediaTokenIssuance_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/media/token"))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    // ========================================================================
    // 二、媒体会话在媒体读取路径上放行（不得过度收紧）
    // ========================================================================

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话读取媒体文件 → 安全链放行（非 401/403）")
    void mediaSession_onMediaRead_isPermittedBySecurityChain() throws Exception {
        mockMvc.perform(get(MEDIA_READ_PATH))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("媒体会话应可读媒体文件，实际被安全链拒绝: " + code);
                    }
                });
    }

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话 HEAD 媒体文件 → 安全链放行（非 401/403）")
    void mediaSession_onMediaHeadRead_isPermittedBySecurityChain() throws Exception {
        mockMvc.perform(head(MEDIA_READ_PATH))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("HEAD 属于只读方法，应放行，实际: " + code);
                    }
                });
    }

    @Test
    @WithMockUser(roles = "MEDIA")
    @DisplayName("媒体会话读取应用资产（公开端点）→ 仍放行")
    void mediaSession_onAppAsset_isPermitted() throws Exception {
        mockMvc.perform(get("/api/v1/media/app-assets/generated/images/campus/a.jpg"))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("app-assets 是 permitAll 公开读取，不应被拒: " + code);
                    }
                });
    }

    // ========================================================================
    // 三、正控：完整用户会话不受降权规则影响
    // ========================================================================

    @Test
    @DisplayName("正控：完整会话（ROLE_USER）访问业务接口 → 非 401/403")
    void fullSession_onBusinessEndpoint_isPermitted() throws Exception {
        // mock profile 下 MockAuthenticationFilter 为需认证路径注入 ROLE_USER
        mockMvc.perform(post("/api/v1/users/123/follow"))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("完整会话不应被媒体降权规则影响，实际: " + code);
                    }
                });
    }

    @Test
    @DisplayName("正控：完整会话调用上传端点 → 非 401/403（上传仍需登录，但不被降权规则拒绝）")
    void fullSession_onUploadEndpoint_isPermittedBySecurityChain() throws Exception {
        mockMvc.perform(post("/api/v1/media/upload"))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("完整会话应可继续上传，实际被拒: " + code);
                    }
                });
    }

    @Test
    @DisplayName("正控：完整会话调用令牌签发端点 → 非 401/403")
    void fullSession_onMediaTokenIssuance_isPermittedBySecurityChain() throws Exception {
        mockMvc.perform(get("/api/v1/media/token"))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("完整会话应能签发媒体令牌，实际被拒: " + code);
                    }
                });
    }

    @Test
    @DisplayName("正控：完整会话读取媒体文件 → 非 401/403")
    void fullSession_onMediaRead_isPermitted() throws Exception {
        mockMvc.perform(get(MEDIA_READ_PATH))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("完整会话读媒体不应被降权规则影响，实际: " + code);
                    }
                });
    }

    // ========================================================================
    // 四、真签发令牌走完整安全链（认证注入 + 授权判定同源）
    // ========================================================================
    //
    // 上面一二三节用 @WithMockUser 直接放置角色，验证的是「规则本体」；本节把
    // 真实签发的 scope=media JWT 放进 Authorization 头 / ?token= 查询参数，
    // 验证「凭据 → 认证主体 → 授权结果」整条链路对媒体令牌都降权。
    // 这一节的用例同时是 demo（mock）档的回归锁：demo 档的免真实认证注入
    // 不能成为媒体令牌的升格通道——凡以 media scope JWT 进来的请求，
    // 一律只按媒体会话处理（P0-2 约束「MockSecurityConfig 的特殊 demo 行为
    // 不得放宽任何媒体 scope JWT 的限制」）。

    @Test
    @DisplayName("真媒体 JWT（Authorization 头）访问业务接口 → 安全链 403")
    void realMediaJwtInHeader_onBusinessEndpoint_isForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/users/123/follow")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @DisplayName("真媒体 JWT（Authorization 头）访问管理端 → 安全链 403（属主是管理员也不例外）")
    void realMediaJwtInHeader_onAdminEndpoint_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @DisplayName("真媒体 JWT（Authorization 头）调用上传端点 → 安全链 403")
    void realMediaJwtInHeader_onUploadEndpoint_isForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/media/upload")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @DisplayName("真媒体 JWT（Authorization 头）对媒体路径发起写操作 → 安全链 403（只读不等于放行）")
    void realMediaJwtInHeader_onMediaPathWriteMethod_isForbidden() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put(MEDIA_READ_PATH)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @DisplayName("真媒体 JWT（Authorization 头）调用令牌签发端点 → 安全链 403（不得自我续期）")
    void realMediaJwtInHeader_onMediaTokenIssuance_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/media/token")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @DisplayName("真媒体 JWT 经 ?token= 查询参数调用令牌签发端点 → 安全链 403")
    void realMediaJwtInQuery_onMediaTokenIssuance_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/media/token").param("token", mediaJwt()))
                .andExpect(this::assertDeniedBySecurityChain);
    }

    @Test
    @DisplayName("真媒体 JWT（Authorization 头）读取媒体文件 → 安全链放行（降权不等于关掉媒体读取）")
    void realMediaJwtInHeader_onMediaRead_isPermitted() throws Exception {
        mockMvc.perform(get(MEDIA_READ_PATH)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("媒体 JWT 应能读取媒体文件，实际: " + code);
                    }
                });
    }

    @Test
    @DisplayName("真媒体 JWT 经 ?token= 查询参数读取媒体文件 → 安全链放行")
    void realMediaJwtInQuery_onMediaRead_isPermitted() throws Exception {
        mockMvc.perform(get(MEDIA_READ_PATH).param("token", mediaJwt()))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("?token= 的媒体 JWT 应能读取媒体文件，实际: " + code);
                    }
                });
    }

    @Test
    @DisplayName("真媒体 JWT 读取公开应用资产 → 放行（permitAll 不受降权规则影响）")
    void realMediaJwtInHeader_onAppAsset_isPermitted() throws Exception {
        mockMvc.perform(get("/api/v1/media/app-assets/generated/images/campus/a.jpg")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + mediaJwt()))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("app-assets 是 permitAll 公开读取，实际: " + code);
                    }
                });
    }

    @Test
    @DisplayName("正控：真完整会话 JWT（Authorization 头）访问业务接口 → 非 401/403")
    void realFullJwtInHeader_onBusinessEndpoint_isPermitted() throws Exception {
        mockMvc.perform(post("/api/v1/users/123/follow")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + fullJwt()))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("完整会话 JWT 不应被媒体降权规则拒绝，实际: " + code);
                    }
                });
    }

    @Test
    @DisplayName("正控：真完整会话 JWT（Authorization 头）调用上传端点 → 非 401/403")
    void realFullJwtInHeader_onUploadEndpoint_isPermitted() throws Exception {
        mockMvc.perform(post("/api/v1/media/upload")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + fullJwt()))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("完整会话应可继续走上传流程，实际: " + code);
                    }
                });
    }

    // ========================================================================
    // 五、real 档规则装配的漂移守卫
    // ========================================================================
    //
    // 本类前四节跑在默认（mock）档，验的是 MediaTokenPolicy 规则本体；
    // 生产档 SecurityConfig 只有在「调用点存在且插在正确位置」时才有同样的语义
    // （authorizeHttpRequests 取首个匹配：插到 app-assets permitAll 之前会把公开图片
    // 变成需 ROLE_MEDIA，插到通用 /api/v1/media/** authenticated 之后则等于没插）。
    // 这一位置约束在 real 档没有任何行为测试可依赖（real 档要连数据库/Redis，
    // 仓库既有约定就是用 mock 档镜像 real 档规则），故这里对两份配置做结构性对账，
    // 保证「real 收紧了、mock 没跟上」或「将来有人重排规则」都会当场红。

    @Test
    @DisplayName("漂移守卫：real 与 mock 两份配置都在同一位置装配媒体令牌规则")
    void bothSecurityConfigsWireMediaTokenRulesAtTheSamePosition() throws Exception {
        assertMediaRulesWiredInOrder("SecurityConfig.java");
        assertMediaRulesWiredInOrder("MockSecurityConfig.java");
    }

    /**
     * 断言指定安全配置里媒体令牌规则的装配位置：
     * {@code app-assets permitAll} → {@code applyMediaTokenRules(auth)} →
     * {@code /api/v1/media/** authenticated}。
     *
     * <p>只匹配带引号/带实参的代码文本，注释里的同名字样不参与判定，
     * 避免「注释写到了就算装配了」的假绿。</p>
     *
     * @param simpleFileName 位于 com/campuslove/api/config 下的源文件名
     */
    private void assertMediaRulesWiredInOrder(String simpleFileName) throws java.io.IOException {
        java.nio.file.Path source = securityConfigSource(simpleFileName);
        String code = java.nio.file.Files.readString(source);

        int appAssetsPermitAll = code.indexOf("\"/api/v1/media/app-assets/**\"");
        int mediaRulesWired = code.indexOf("MediaTokenPolicy.applyMediaTokenRules(auth)");
        int mediaAuthenticated = code.indexOf("\"/api/v1/media/**\").authenticated()");

        assertTrue(appAssetsPermitAll >= 0,
                simpleFileName + " 缺少 app-assets permitAll 规则（锚点丢失，守卫失效）");
        assertTrue(mediaRulesWired >= 0,
                simpleFileName + " 没有装配 MediaTokenPolicy.applyMediaTokenRules —— "
                        + "媒体令牌在该档不降权（P0-2 回归）");
        assertTrue(mediaAuthenticated >= 0,
                simpleFileName + " 缺少 /api/v1/media/** authenticated 规则（锚点丢失，守卫失效）");
        assertTrue(appAssetsPermitAll < mediaRulesWired,
                simpleFileName + "：媒体规则必须插在 app-assets permitAll 之后，否则会接管公开图片路由");
        assertTrue(mediaRulesWired < mediaAuthenticated,
                simpleFileName + "：媒体规则必须插在 /api/v1/media/** authenticated 之前，"
                        + "否则首个匹配规则就是通用 authenticated，deny 规则永不生效");
    }

    /**
     * 定位待对账的安全配置源文件（surefire 工作目录为 apps/api，兼容从仓库根运行）。
     *
     * @param simpleFileName 源文件名
     * @return 源文件路径
     */
    private java.nio.file.Path securityConfigSource(String simpleFileName) {
        java.nio.file.Path relative = java.nio.file.Path.of(
                "src/main/java/com/campuslove/api/config", simpleFileName);
        if (java.nio.file.Files.exists(relative)) {
            return relative.toAbsolutePath();
        }
        java.nio.file.Path fromRepoRoot =
                java.nio.file.Path.of("apps/api/src/main/java/com/campuslove/api/config", simpleFileName);
        assertTrue(java.nio.file.Files.exists(fromRepoRoot),
                "找不到安全配置源文件，无法对账规则装配位置: " + relative.toAbsolutePath());
        return fromRepoRoot.toAbsolutePath();
    }
}
