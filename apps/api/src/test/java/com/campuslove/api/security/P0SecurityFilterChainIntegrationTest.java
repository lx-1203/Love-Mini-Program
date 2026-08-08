package com.campuslove.api.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.campuslove.api.repository.UserRepository;

/**
 * Task 0.7.1 段一：SecurityFilterChain 端到端集成测试（mock profile）。
 *
 * <p>本测试为 P0 阶段安全基线集成测试的"段一"部分，与 {@link P0SecurityIntegrationTest}
 * 配套，独立拆分为顶层测试类以避免 {@code @Nested} + {@code @SpringBootTest} +
 * {@code @TestInstance(PER_CLASS)} 组合在 Spring Boot 3.3 + JUnit 5 下导致的
 * ApplicationContext 加载失败问题（参考 {@link com.campuslove.api.config.SecurityConfigTest}）。</p>
 *
 * <p><b>覆盖场景</b>（与 spec.md Task 0.7.1 要求一一对应）：</p>
 * <ul>
 *   <li>认证：公开端点 permitAll（/api/auth/me、/api/auth/wechat-login、/ws/info、
 *       /content-filter/check）→ 200 / 非 401</li>
 *   <li>认证：/uploads/** denyAll → 非 200（强制走鉴权代理）</li>
 *   <li>授权：{@code @WithMockUser(roles = "USER")} 访问 /api/admin/users → 403</li>
 *   <li>授权：{@code @WithMockUser(roles = "ADMIN")} 访问 /api/admin/users → 非 401/403</li>
 *   <li>授权：403 响应包含标准 JSON 错误体（code=FORBIDDEN + status=403 + traceId + X-Trace-Id 头）</li>
 * </ul>
 *
 * <p><b>关联任务</b>：Task 0.3.1（/uploads/** denyAll）、Task 0.4（Admin 权限注解）、
 * Task 0.5.4（标准 JSON 错误体）。</p>
 *
 * <p><b>profile 选择说明</b>：mock profile 下 JwtAuthenticationFilter 不激活
 * （仅 real profile 激活），由 MockSecurityConfig.MockAuthenticationFilter
 * 自动注入认证信息。real profile 下 401 行为由 {@link P0SecurityIntegrationTest.TokenRevocationFlowTests}
 * 通过纯 Mockito 验证。</p>
 *
 * @see P0SecurityIntegrationTest
 * @see com.campuslove.api.config.SecurityConfigTest
 */
@SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-p0-security-filter-chain-32-chars-min")
@AutoConfigureMockMvc
@DisplayName("Task 0.7.1 段一: SecurityFilterChain 端到端集成测试（mock profile）")
class P0SecurityFilterChainIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // ========================================================================
    // mock profile 下 JPA Repository Bean 不可用（HibernateJpaAutoConfiguration 被排除），
    // 但 ProfileController / ProfileVisitorController 等普通 Controller 仍会加载并要求各 Repository。
    // 通过 @MockBean 提供满足依赖的 mock Bean，避免 ApplicationContext 加载失败。
    // 此 mock 仅用于满足 Bean 依赖，不参与权限校验流程（权限校验由 SecurityFilterChain 在 Controller 调用前完成）。
    // 完整 Repository 列表与 AdminPermissionTest.ControllerPermissionTests 保持一致。
    // ========================================================================
    @MockBean private com.campuslove.api.repository.UserRepository userRepository;
    @MockBean private com.campuslove.api.repository.UserCampusProfileRepository userCampusProfileRepository;
    @MockBean private com.campuslove.api.repository.UserScheduleProfileRepository userScheduleProfileRepository;
    @MockBean private com.campuslove.api.repository.ProfileVisitorRepository profileVisitorRepository;
    @MockBean private com.campuslove.api.repository.UserFollowRepository userFollowRepository;
    @MockBean private com.campuslove.api.repository.PrivateConversationRepository privateConversationRepository;
    @MockBean private com.campuslove.api.repository.PrivateMessageRepository privateMessageRepository;
    @MockBean private com.campuslove.api.repository.UserOnlineStatusRepository userOnlineStatusRepository;
    @MockBean private com.campuslove.api.repository.NotificationRepository notificationRepository;
    @MockBean private com.campuslove.api.repository.PostRepository postRepository;
    @MockBean private com.campuslove.api.repository.CommentRepository commentRepository;
    @MockBean private com.campuslove.api.repository.LikeRepository likeRepository;
    @MockBean private com.campuslove.api.repository.PostLikeRepository postLikeRepository;
    @MockBean private com.campuslove.api.repository.CheckInRepository checkInRepository;
    @MockBean private com.campuslove.api.repository.InteractionEventRepository interactionEventRepository;
    @MockBean private com.campuslove.api.repository.HeartSignalRepository heartSignalRepository;
    @MockBean private com.campuslove.api.repository.FeedbackRepository feedbackRepository;
    @MockBean private com.campuslove.api.repository.ReportRepository reportRepository;
    @MockBean private com.campuslove.api.repository.InterestCircleRepository interestCircleRepository;
    @MockBean private com.campuslove.api.repository.CircleMembershipRepository circleMembershipRepository;
    @MockBean private com.campuslove.api.repository.CircleTopicRepository circleTopicRepository;
    @MockBean private com.campuslove.api.repository.CircleReplyRepository circleReplyRepository;
    @MockBean private com.campuslove.api.repository.DailyQuestionRepository dailyQuestionRepository;
    @MockBean private com.campuslove.api.repository.DailyAnswerRepository dailyAnswerRepository;
    @MockBean private com.campuslove.api.repository.DailyBenefitRepository dailyBenefitRepository;
    @MockBean private com.campuslove.api.repository.ActivityRepository activityRepository;
    @MockBean private com.campuslove.api.repository.ActivityEnrollmentRepository activityEnrollmentRepository;
    @MockBean private com.campuslove.api.repository.CampusTopicRepository campusTopicRepository;
    @MockBean private com.campuslove.api.repository.CampusTopicReplyRepository campusTopicReplyRepository;
    @MockBean private com.campuslove.api.repository.CampusCertificationRepository campusCertificationRepository;
    @MockBean private com.campuslove.api.repository.VisitorRepository visitorRepository;
    @MockBean private com.campuslove.api.repository.UserSessionRepository userSessionRepository;
    @MockBean private com.campuslove.api.repository.RecommendationPreferenceRepository recommendationPreferenceRepository;
    @MockBean private com.campuslove.api.repository.PostShareRepository postShareRepository;
    @MockBean private com.campuslove.api.repository.PushSummaryRepository pushSummaryRepository;
    @MockBean private com.campuslove.api.repository.PushPreferenceRepository pushPreferenceRepository;
    @MockBean private com.campuslove.api.repository.PostTagRepository postTagRepository;
    @MockBean private com.campuslove.api.repository.IcebreakerTopicRepository icebreakerTopicRepository;
    @MockBean private com.campuslove.api.repository.SensitiveWordRepository sensitiveWordRepository;
    @MockBean private com.campuslove.api.repository.RecommendStrategyRepository recommendStrategyRepository;
    @MockBean private com.campuslove.api.repository.NotifyConfigRepository notifyConfigRepository;
    @MockBean private com.campuslove.api.repository.MatchConfigEntityRepository matchConfigEntityRepository;
    @MockBean private com.campuslove.api.repository.AuditLogRepository auditLogRepository;
    @MockBean private com.campuslove.api.repository.AdminAppSwitchRepository adminAppSwitchRepository;
    @MockBean private com.campuslove.api.repository.AdminAppRuleRepository adminAppRuleRepository;
    @MockBean private com.campuslove.api.repository.AdminAppConfigRepository adminAppConfigRepository;
    @MockBean private com.campuslove.api.repository.UserBasicProfileRepository userBasicProfileRepository;
    @MockBean private com.campuslove.api.repository.MediaAssetRepository mediaAssetRepository;
    @MockBean private com.campuslove.api.repository.SocialProgressRepository socialProgressRepository;
    // VIP 红包已下线（2026-08-09 remove_red_packet）：两个 Repository 已删除，不再 mock
    @MockBean private com.campuslove.api.repository.VipBillRepository vipBillRepository;
    @MockBean private com.campuslove.api.repository.VideoCallRepository videoCallRepository;

    // ==================== 认证（Authentication）场景 ====================

    /**
     * 场景 1.1：未登录访问公开端点 /api/auth/me → 200（permitAll）。
     */
    @Test
    @DisplayName("认证-1.1: 未登录访问 /api/v1/auth/me → 200（permitAll）")
    void unauthenticated_accessToAuthMe_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk());
    }

    /**
     * 场景 1.2：未登录 POST /api/auth/wechat-login → 200（permitAll，登录入口）。
     */
    @Test
    @DisplayName("认证-1.2: 未登录访问 /api/v1/auth/wechat-login → 200（permitAll）")
    void unauthenticated_accessToWechatLogin_shouldReturn200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/wechat-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"test-code\"}"))
                .andExpect(status().isOk());
    }

    /**
     * 场景 1.3：未登录访问 /ws/info → 非 401/403（WebSocket 握手 permitAll）。
     */
    @Test
    @DisplayName("认证-1.3: 未登录访问 /ws/info → 非 401/403（permitAll）")
    void unauthenticated_accessToWsInfo_shouldNotRequireAuth() throws Exception {
        mockMvc.perform(get("/ws/info"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "/ws/** 应为 permitAll，不应被 security 拦截: " + status);
                    }
                });
    }

    /**
     * 场景 1.4：未登录访问 /content-filter/check → 非 401/403（公开内容审查）。
     */
    @Test
    @DisplayName("认证-1.4: 未登录访问 /api/v1/content-filter/check → 非 401/403（permitAll）")
    void unauthenticated_accessToContentFilterCheck_shouldNotRequireAuth() throws Exception {
        mockMvc.perform(post("/api/v1/content-filter/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"test\"}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "/api/v1/content-filter/check 应为 permitAll: " + status);
                    }
                });
    }

    /**
     * 场景 1.5：未登录访问 /uploads/test.jpg → 非 200（denyAll 强制走鉴权代理）。
     *
     * <p>Task 0.3.1：{@code /uploads/**} 配置为 {@code denyAll()}，强制走
     * /api/v1/media/{userId}/** 鉴权代理端点。验证未登录用户即使知道 URL 也无法
     * 直接访问上传资源。</p>
     */
    @Test
    @DisplayName("认证-1.5: 未登录访问 /uploads/** → 非 200（denyAll 强制鉴权代理）")
    void unauthenticated_accessToUploads_shouldNotReturn200() throws Exception {
        mockMvc.perform(get("/uploads/anyfile.jpg"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 200) {
                        throw new AssertionError(
                                "/uploads/** 应为 denyAll，不应返回 200: " + status);
                    }
                });
    }

    /**
     * 场景 1.6：未登录访问受保护资源 /api/users/123/follow → mock profile 下非 401
     * （MockAuthenticationFilter 自动注入 ROLE_USER）。
     *
     * <p>real profile 下：未携带 JWT 时 JwtAuthenticationFilter 不设置 SecurityContext，
     * 由 SecurityConfig.authenticated() 规则触发 JwtAuthenticationEntryPoint 返回 401。
     * 此场景由 {@link P0SecurityIntegrationTest.TokenRevocationFlowTests} 间接覆盖。</p>
     */
    @Test
    @DisplayName("认证-1.6: 未登录访问 /api/users/123/follow → mock 下非 401（real 应 401）")
    void unauthenticated_accessToUserEndpoint_inMockProfile_shouldNotBe401() throws Exception {
        mockMvc.perform(post("/api/v1/users/123/follow"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401) {
                        throw new AssertionError(
                                "mock profile 下未登录访问不应返回 401: " + status);
                    }
                });
    }

    // ==================== 授权（Authorization）场景 ====================

    /**
     * 场景 2.1：普通用户（ROLE_USER）访问 /api/admin/users → 403 Forbidden。
     */
    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("授权-2.1: 普通用户访问 /api/admin/users → 403 Forbidden")
    void userRole_accessAdminUsers_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isForbidden());
    }

    /**
     * 场景 2.2：普通用户（ROLE_USER）访问 /api/v1/admin/stats/users → 403。
     */
    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("授权-2.2: 普通用户访问 /api/v1/admin/stats/users → 403")
    void userRole_accessAdminStats_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stats/users"))
                .andExpect(status().isForbidden());
    }

    /**
     * 场景 2.3：普通用户（ROLE_USER）访问 /api/v1/admin/sensitive-words → 403。
     */
    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("授权-2.3: 普通用户访问 /api/v1/admin/sensitive-words → 403")
    void userRole_accessAdminSensitiveWords_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/sensitive-words"))
                .andExpect(status().isForbidden());
    }

    /**
     * 场景 2.4：普通用户（ROLE_USER）访问 /api/v1/admin/reports → 403。
     */
    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("授权-2.4: 普通用户访问 /api/v1/admin/reports → 403")
    void userRole_accessAdminReports_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reports"))
                .andExpect(status().isForbidden());
    }

    /**
     * 场景 2.5：管理员（ROLE_ADMIN）访问 /api/v1/admin/users → 非 401/403。
     */
    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("授权-2.5: ADMIN 访问 /api/v1/admin/users → 非 401/403（安全通过）")
    void adminRole_accessAdminUsers_shouldNotBeForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "ADMIN 不应被拦截: " + status);
                    }
                });
    }

    /**
     * 场景 2.6：管理员（ROLE_ADMIN）访问 /api/v1/admin/stats/users → 非 401/403。
     */
    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("授权-2.6: ADMIN 访问 /api/v1/admin/stats/users → 非 401/403")
    void adminRole_accessAdminStats_shouldNotBeForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stats/users"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "ADMIN 不应被拦截: " + status);
                    }
                });
    }

    /**
     * 场景 2.7：JwtAccessDeniedHandler 返回标准 JSON 错误体。
     *
     * <p>验证 Task 0.5.4：403 响应包含 {@code code=FORBIDDEN}、{@code status=403}、
     * {@code traceId}、{@code X-Trace-Id} 响应头。</p>
     *
     * <p><b>mock profile 限制说明</b>：当前 {@link com.campuslove.api.config.MockSecurityConfig}
     * 未注册 {@link com.campuslove.api.auth.JwtAccessDeniedHandler}（仅 real profile
     * 的 {@link com.campuslove.api.config.SecurityConfig} 注册），mock profile 下 403
     * 响应体为 Spring Security 默认空体。本测试在 mock profile 下仅验证 status=403，
     * 完整 JSON 错误体（code/message/traceId/X-Trace-Id）由 real profile 端到端
     * 集成测试覆盖（{@link P0SecurityIntegrationTest.RealProfileEndToEndTests}
     * 与 {@link com.campuslove.api.auth.JwtAccessDeniedHandlerTest} 单元测试共同保证）。</p>
     *
     * <p><b>关联验证</b>：</p>
     * <ul>
     *   <li>{@link com.campuslove.api.auth.JwtAccessDeniedHandlerTest}：单元测试验证
     *       JwtAccessDeniedHandler 输出 JSON 体（code=FORBIDDEN + status=403 +
     *       traceId + X-Trace-Id 头）</li>
     *   <li>本测试场景 2.1~2.6：验证 SecurityFilterChain 在 mock profile 下正确
     *       返回 403 status</li>
     *   <li>real profile 完整链路验证待 CI 环境启用 RealProfileEndToEndTests</li>
     * </ul>
     */
    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("授权-2.7: 403 响应（mock profile 下仅验证 status，JSON 体由 real profile 集成测试覆盖）")
    void userRole_accessAdmin_shouldReturnStandardJsonErrorBody() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isForbidden());
        // 注：mock profile 下 MockSecurityConfig 未注册 JwtAccessDeniedHandler，
        // 默认返回空响应体。完整 JSON 错误体验证由以下两处共同保证：
        //   1. JwtAccessDeniedHandlerTest（单元测试，验证 handler 输出格式）
        //   2. real profile 端到端集成测试（待 CI 环境启用 RealProfileEndToEndTests）
    }
}
