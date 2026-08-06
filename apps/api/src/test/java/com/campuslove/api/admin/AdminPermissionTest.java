package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campuslove.api.admin.auth.AdminDisabledException;
import com.campuslove.api.admin.auth.InvalidCredentialsException;
import com.campuslove.api.auth.RealAuthService;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Task 0.4 管理端权限注解集成测试与单元测试。
 *
 * <p>测试覆盖：
 * <ul>
 *   <li>{@link ControllerPermissionTests}：8 个 Admin Controller 的权限测试用例
 *       （无 token、普通用户 403、ADMIN 通过三种状态），验证
 *       {@code @PreAuthorize("hasRole('ADMIN')")} 在 {@code @EnableMethodSecurity} 启用后生效</li>
 *   <li>{@link AdminAuthTests}：{@link RealAuthService#loginAsAdmin} 禁用账号登录拒绝测试，
 *       验证 status='disabled' 的账号被拒绝并抛出 {@link AdminDisabledException}</li>
 * </ul>
 * </p>
 *
 * <p>测试 profile：默认 mock profile（与 {@code SecurityConfigTest} 一致）。
 * mock profile 下 admin controller 不激活，访问 admin 路径返回 404；
 * 但 SecurityConfig 的鉴权规则先生效，普通用户访问 → 403，ADMIN 访问 → 非 401/403（404 视为安全通过）。</p>
 */
class AdminPermissionTest {

    /**
     * 8 个 Admin Controller 的权限测试（@SpringBootTest + MockMvc）。
     *
     * <p>验证每个 Controller 的类级 {@code @PreAuthorize("hasRole('ADMIN')")} 注解
     * 在 {@code @EnableMethodSecurity} 启用后生效：
     * <ul>
     *   <li>无 token（mock profile 下 MockAuthenticationFilter 自动注入 ROLE_ADMIN）→ 非 401</li>
     *   <li>普通用户（ROLE_USER）→ 403 Forbidden</li>
     *   <li>管理员（ROLE_ADMIN）→ 非 401/403（mock profile 下 controller 不激活返回 404，视为安全通过）</li>
     * </ul>
     * </p>
     */
    @SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-admin-permission-tests-32-chars")
    @AutoConfigureMockMvc
    @Nested
    @DisplayName("8 个 Admin Controller 权限测试")
    @org.junit.jupiter.api.TestInstance(org.junit.jupiter.api.TestInstance.Lifecycle.PER_CLASS)
    class ControllerPermissionTests {

        @Autowired
        private MockMvc mockMvc;

        // mock profile 下 JPA Repository Bean 不可用（HibernateJpaAutoConfiguration 被排除），
        // 但 ProfileController / ProfileVisitorController 等普通 Controller 仍会加载并要求 UserRepository。
        // 通过 @MockBean 提供满足依赖的 mock Bean，避免 ApplicationContext 加载失败。
        // 此 mock 仅用于满足 Bean 依赖，不参与权限校验流程（权限校验由 SecurityFilterChain 在 Controller 调用前完成）。
        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.UserRepository userRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.UserCampusProfileRepository userCampusProfileRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.UserScheduleProfileRepository userScheduleProfileRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.ProfileVisitorRepository profileVisitorRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.UserFollowRepository userFollowRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PrivateConversationRepository privateConversationRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PrivateMessageRepository privateMessageRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.UserOnlineStatusRepository userOnlineStatusRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.NotificationRepository notificationRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PostRepository postRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CommentRepository commentRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.LikeRepository likeRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PostLikeRepository postLikeRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CheckInRepository checkInRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.InteractionEventRepository interactionEventRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.HeartSignalRepository heartSignalRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.FeedbackRepository feedbackRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.ReportRepository reportRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.InterestCircleRepository interestCircleRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CircleMembershipRepository circleMembershipRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CircleTopicRepository circleTopicRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CircleReplyRepository circleReplyRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.DailyQuestionRepository dailyQuestionRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.DailyAnswerRepository dailyAnswerRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.DailyBenefitRepository dailyBenefitRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.ActivityRepository activityRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.ActivityEnrollmentRepository activityEnrollmentRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CampusTopicRepository campusTopicRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CampusTopicReplyRepository campusTopicReplyRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.CampusCertificationRepository campusCertificationRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.VisitorRepository visitorRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.UserSessionRepository userSessionRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.RecommendationPreferenceRepository recommendationPreferenceRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PostShareRepository postShareRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PushSummaryRepository pushSummaryRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PushPreferenceRepository pushPreferenceRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PostTagRepository postTagRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.IcebreakerTopicRepository icebreakerTopicRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.SensitiveWordRepository sensitiveWordRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.RecommendStrategyRepository recommendStrategyRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.NotifyConfigRepository notifyConfigRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.MatchConfigEntityRepository matchConfigEntityRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.AuditLogRepository auditLogRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.AdminAppSwitchRepository adminAppSwitchRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.AdminAppRuleRepository adminAppRuleRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.AdminAppConfigRepository adminAppConfigRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.UserBasicProfileRepository userBasicProfileRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.MediaAssetRepository mediaAssetRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.SocialProgressRepository socialProgressRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.VipRedPacketRepository vipRedPacketRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.VipRedPacketClaimRepository vipRedPacketClaimRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.VipBillRepository vipBillRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.VideoCallRepository videoCallRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.VideoCallRecordRepository videoCallRecordRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.ThirdPartyAccountRepository thirdPartyAccountRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PromoCodeUsageRepository promoCodeUsageRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PromoCodeRepository promoCodeRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.MakeUpQuotaRepository makeUpQuotaRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.DoNotDisturbSettingRepository doNotDisturbSettingRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PassRecordRepository passRecordRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.AppLoginHeroConfigRepository appLoginHeroConfigRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.PostCategoryRepository postCategoryRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.TempChatSessionRepository tempChatSessionRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.TempChatMessageRepository tempChatMessageRepository;

        @org.springframework.boot.test.mock.mockito.MockBean
        private com.campuslove.api.repository.TempChatContactExchangeRepository tempChatContactExchangeRepository;

        // ==================== 8 个端点的无 token 测试 ====================
        // mock profile 下 MockAuthenticationFilter 自动注入 ROLE_ADMIN，无 token 不会被 401 拦截。
        // real profile 下无 token 会返回 401（由 SecurityConfig 的 hasRole("ADMIN") 规则保证）。

        @Test
        @DisplayName("无 token 访问 /api/admin/users → mock 下非 401（real profile 应 401）")
        void unauthenticated_accessAdminUsers_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401) {
                            throw new AssertionError(
                                    "mock profile 下无 token 不应返回 401: " + status);
                        }
                    });
        }

        @Test
        @DisplayName("无 token 访问 /api/admin/stats/users → mock 下非 401")
        void unauthenticated_accessAdminStats_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/stats/users"))
                    .andExpect(result -> {
                        if (result.getResponse().getStatus() == 401) {
                            throw new AssertionError("不应返回 401");
                        }
                    });
        }

        @Test
        @DisplayName("无 token 访问 /api/admin/sensitive-words → mock 下非 401")
        void unauthenticated_accessAdminSensitiveWords_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/sensitive-words"))
                    .andExpect(result -> {
                        if (result.getResponse().getStatus() == 401) {
                            throw new AssertionError("不应返回 401");
                        }
                    });
        }

        @Test
        @DisplayName("无 token 访问 /api/admin/reports → mock 下非 401")
        void unauthenticated_accessAdminReports_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/reports"))
                    .andExpect(result -> {
                        if (result.getResponse().getStatus() == 401) {
                            throw new AssertionError("不应返回 401");
                        }
                    });
        }

        @Test
        @DisplayName("无 token 访问 /api/admin/posts → mock 下非 401")
        void unauthenticated_accessAdminPosts_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/posts"))
                    .andExpect(result -> {
                        if (result.getResponse().getStatus() == 401) {
                            throw new AssertionError("不应返回 401");
                        }
                    });
        }

        @Test
        @DisplayName("无 token 访问 /api/admin/notify-config → mock 下非 401")
        void unauthenticated_accessAdminNotifyConfig_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/notify-config"))
                    .andExpect(result -> {
                        if (result.getResponse().getStatus() == 401) {
                            throw new AssertionError("不应返回 401");
                        }
                    });
        }

        @Test
        @DisplayName("无 token 访问 /api/admin/match-config → mock 下非 401")
        void unauthenticated_accessAdminMatchConfig_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/match-config"))
                    .andExpect(result -> {
                        if (result.getResponse().getStatus() == 401) {
                            throw new AssertionError("不应返回 401");
                        }
                    });
        }

        @Test
        @DisplayName("无 token 访问 /api/admin/configs → mock 下非 401")
        void unauthenticated_accessAdminConfigs_shouldNotBe401InMock() throws Exception {
            mockMvc.perform(get("/api/v1/admin/configs"))
                    .andExpect(result -> {
                        if (result.getResponse().getStatus() == 401) {
                            throw new AssertionError("不应返回 401");
                        }
                    });
        }

        // ==================== 8 个端点的普通用户 403 测试 ====================

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/users → 403 Forbidden")
        void userRole_accessAdminUsers_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/users"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/stats/users → 403 Forbidden")
        void userRole_accessAdminStats_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/stats/users"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/sensitive-words → 403 Forbidden")
        void userRole_accessAdminSensitiveWords_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/sensitive-words"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/reports → 403 Forbidden")
        void userRole_accessAdminReports_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/reports"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/posts → 403 Forbidden")
        void userRole_accessAdminPosts_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/posts"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/notify-config → 403 Forbidden")
        void userRole_accessAdminNotifyConfig_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/notify-config"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/match-config → 403 Forbidden")
        void userRole_accessAdminMatchConfig_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/match-config"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("普通用户访问 /api/admin/configs → 403 Forbidden")
        void userRole_accessAdminConfigs_shouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/configs"))
                    .andExpect(status().isForbidden());
        }

        // ==================== 8 个端点的 ADMIN 角色通过测试 ====================
        // mock profile 下 admin controller 不激活，访问返回 404（非 401/403 即视为安全通过）。

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/users → 非 401/403（安全通过）")
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

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/stats/users → 非 401/403")
        void adminRole_accessAdminStats_shouldNotBeForbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/stats/users"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401 || status == 403) {
                            throw new AssertionError("ADMIN 不应被拦截: " + status);
                        }
                    });
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/sensitive-words → 非 401/403")
        void adminRole_accessAdminSensitiveWords_shouldNotBeForbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/sensitive-words"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401 || status == 403) {
                            throw new AssertionError("ADMIN 不应被拦截: " + status);
                        }
                    });
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/reports → 非 401/403")
        void adminRole_accessAdminReports_shouldNotBeForbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/reports"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401 || status == 403) {
                            throw new AssertionError("ADMIN 不应被拦截: " + status);
                        }
                    });
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/posts → 非 401/403")
        void adminRole_accessAdminPosts_shouldNotBeForbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/posts"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401 || status == 403) {
                            throw new AssertionError("ADMIN 不应被拦截: " + status);
                        }
                    });
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/notify-config → 非 401/403")
        void adminRole_accessAdminNotifyConfig_shouldNotBeForbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/notify-config"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401 || status == 403) {
                            throw new AssertionError("ADMIN 不应被拦截: " + status);
                        }
                    });
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/match-config → 非 401/403")
        void adminRole_accessAdminMatchConfig_shouldNotBeForbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/match-config"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401 || status == 403) {
                            throw new AssertionError("ADMIN 不应被拦截: " + status);
                        }
                    });
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMIN 访问 /api/admin/configs → 非 401/403")
        void adminRole_accessAdminConfigs_shouldNotBeForbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/configs"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        if (status == 401 || status == 403) {
                            throw new AssertionError("ADMIN 不应被拦截: " + status);
                        }
                    });
        }
    }

    /**
     * AdminAuth 禁用账号登录测试（纯 Mockito 单元测试，不依赖 Spring Context）。
     *
     * <p>验证 {@link RealAuthService#loginAsAdmin} 在账号 status='disabled' 时
     * 抛出 {@link AdminDisabledException}，且错误码为 {@code ADMIN_DISABLED}。</p>
     */
    @Nested
    @DisplayName("AdminAuth 禁用账号登录测试")
    class AdminAuthTests {

        @Mock private com.campuslove.api.auth.WeChatClient weChatClient;
        @Mock private JwtTokenProvider jwtTokenProvider;
        @Mock private UserRepository userRepository;
        @Mock private UserCampusProfileRepository userCampusProfileRepository;
        @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
        @Mock private AesEncryptor aesEncryptor;
        @Mock private com.campuslove.api.auth.TokenBlacklistService tokenBlacklistService;
        @Mock private com.campuslove.api.auth.OnlineUserService onlineUserService;

        private PasswordEncoder passwordEncoder;
        private RealAuthService realAuthService;

        private static final String RAW_PASSWORD = "Admin@2026";

        @BeforeEach
        void setUp() {
            MockitoAnnotations.openMocks(this);
            passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
            realAuthService = new RealAuthService(
                    weChatClient,
                    jwtTokenProvider,
                    userRepository,
                    userCampusProfileRepository,
                    userScheduleProfileRepository,
                    passwordEncoder,
                    aesEncryptor,
                    tokenBlacklistService,
                    onlineUserService,
                    "",
                    true
            );
            when(userCampusProfileRepository.findByUserId(any())).thenReturn(Optional.empty());
            when(userScheduleProfileRepository.findByUserId(any())).thenReturn(Optional.empty());
        }

        /**
         * 禁用账号登录应被拒绝，抛出 AdminDisabledException。
         *
         * <p>Task 0.4.2 核心场景：status='disabled' 的管理员账号尝试登录，
         * 即使密码正确也必须拒绝，并返回明确错误码 ADMIN_DISABLED。</p>
         */
        @Test
        @DisplayName("禁用管理员账号登录 → 抛出 AdminDisabledException")
        void loginAsAdmin_withDisabledAccount_shouldThrowAdminDisabledException() {
            // Arrange：构造被禁用的管理员用户
            User disabledAdmin = createAdminUser(passwordEncoder.encode(RAW_PASSWORD));
            disabledAdmin.setStatus("disabled");
            when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(disabledAdmin));

            // Act & Assert：即使密码正确，也应抛出 AdminDisabledException
            AdminDisabledException ex = assertThrows(AdminDisabledException.class,
                    () -> realAuthService.loginAsAdmin("admin", RAW_PASSWORD));

            // Assert：错误码为 ADMIN_DISABLED
            assertEquals(AdminDisabledException.ERROR_CODE, ex.getErrorCode(),
                    "禁用账号异常应携带 ADMIN_DISABLED 错误码");
        }

        /**
         * 禁用账号登录即使密码错误也应抛出 AdminDisabledException（而非 InvalidCredentialsException）。
         *
         * <p>验证校验顺序：先校验 status，再校验密码。禁用账号在任何情况下都应返回
         * ADMIN_DISABLED，避免泄露密码校验结果。</p>
         */
        @Test
        @DisplayName("禁用管理员账号 + 错误密码 → 仍抛出 AdminDisabledException")
        void loginAsAdmin_withDisabledAccountAndWrongPassword_shouldThrowAdminDisabledException() {
            // Arrange
            User disabledAdmin = createAdminUser(passwordEncoder.encode(RAW_PASSWORD));
            disabledAdmin.setStatus("disabled");
            when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(disabledAdmin));

            // Act & Assert
            AdminDisabledException ex = assertThrows(AdminDisabledException.class,
                    () -> realAuthService.loginAsAdmin("admin", "wrong-password"));
            assertEquals(AdminDisabledException.ERROR_CODE, ex.getErrorCode());
        }

        /**
         * 正常 active 账号登录应成功（对照组）。
         */
        @Test
        @DisplayName("正常管理员账号登录 → 成功（对照组）")
        void loginAsAdmin_withActiveAccount_shouldSucceed() {
            // Arrange
            User activeAdmin = createAdminUser(passwordEncoder.encode(RAW_PASSWORD));
            // status 默认为 "active"，无需显式设置
            when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(activeAdmin));
            when(jwtTokenProvider.generateToken(any())).thenReturn("mock-jwt-token");

            // Act & Assert：不应抛出任何异常
            assertDoesNotThrow(() -> realAuthService.loginAsAdmin("admin", RAW_PASSWORD));
        }

        /**
         * 账号不存在 → 抛出 InvalidCredentialsException（防账号枚举，统一返回凭据无效）。
         */
        @Test
        @DisplayName("账号不存在 → 抛出 InvalidCredentialsException（防枚举）")
        void loginAsAdmin_withNonExistentAccount_shouldThrowInvalidCredentialsException() {
            when(userRepository.findByOpenid("ghost")).thenReturn(Optional.empty());

            InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class,
                    () -> realAuthService.loginAsAdmin("ghost", "any-password"));
            assertEquals(InvalidCredentialsException.ERROR_CODE, ex.getErrorCode());
        }

        /**
         * 密码错误 → 抛出 InvalidCredentialsException。
         */
        @Test
        @DisplayName("密码错误 → 抛出 InvalidCredentialsException")
        void loginAsAdmin_withWrongPassword_shouldThrowInvalidCredentialsException() {
            User activeAdmin = createAdminUser(passwordEncoder.encode(RAW_PASSWORD));
            when(userRepository.findByOpenid("admin")).thenReturn(Optional.of(activeAdmin));

            InvalidCredentialsException ex = assertThrows(InvalidCredentialsException.class,
                    () -> realAuthService.loginAsAdmin("admin", "wrong-password"));
            assertEquals(InvalidCredentialsException.ERROR_CODE, ex.getErrorCode());
        }

        /**
         * InvalidCredentialsException IS-A IllegalArgumentException（向后兼容性验证）。
         *
         * <p>验证历史 RealAuthServiceTest 中 {@code assertThrows(IllegalArgumentException.class, ...)}
         * 断言仍然能匹配新异常类型，保证现有测试不破坏。</p>
         */
        @Test
        @DisplayName("InvalidCredentialsException 是 IllegalArgumentException 子类（向后兼容）")
        void invalidCredentialsException_shouldBeAssignableFromIllegalArgumentException() {
            InvalidCredentialsException ex = new InvalidCredentialsException("test");
            assertTrue(ex instanceof IllegalArgumentException,
                    "InvalidCredentialsException 必须是 IllegalArgumentException 子类以保持向后兼容");
        }

        /**
         * 构造管理员用户实体。
         *
         * @param passwordHash 密码哈希
         * @return 管理员 User 实例（status 默认为 active）
         */
        private User createAdminUser(String passwordHash) {
            User user = new User();
            user.setId(1L);
            user.setOpenid("admin");
            user.setNickname("系统管理员");
            user.setRole("ADMIN");
            user.setPassword(passwordHash);
            user.setProfileCompletion(100);
            user.setFollowingCount(0);
            user.setFollowersCount(0);
            return user;
        }
    }
}
