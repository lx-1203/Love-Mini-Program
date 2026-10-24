package com.campuslove.api.config;

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
}
