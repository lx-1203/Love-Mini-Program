package com.campuslove.api.testdata;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;

import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.campuslove.api.repository.AdminAppRuleRepository;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import com.campuslove.api.repository.AppLoginHeroConfigRepository;
import com.campuslove.api.repository.AuditLogRepository;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CampusTopicReplyRepository;
import com.campuslove.api.repository.CampusTopicRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleReplyRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.DailyBenefitRepository;
import com.campuslove.api.repository.DailyQuestionRepository;
import com.campuslove.api.repository.DoNotDisturbSettingRepository;
import com.campuslove.api.repository.FeedbackRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.IcebreakerTopicRepository;
import com.campuslove.api.repository.InteractionEventRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.MakeUpQuotaRepository;
import com.campuslove.api.repository.MatchConfigEntityRepository;
import com.campuslove.api.repository.MediaAssetRepository;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.NotifyConfigRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.PostCategoryRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostShareRepository;
import com.campuslove.api.repository.PostTagRepository;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.ProfileVisitorRepository;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.PromoCodeUsageRepository;
import com.campuslove.api.repository.PushPreferenceRepository;
import com.campuslove.api.repository.PushSummaryRepository;
import com.campuslove.api.repository.RecommendStrategyRepository;
import com.campuslove.api.repository.RecommendationPreferenceRepository;
import com.campuslove.api.repository.ReportRepository;
import com.campuslove.api.repository.SensitiveWordRepository;
import com.campuslove.api.repository.SocialProgressRepository;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import com.campuslove.api.repository.ThirdPartyAccountRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserOnlineStatusRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.UserSessionRepository;
import com.campuslove.api.repository.VideoCallRecordRepository;
import com.campuslove.api.repository.VideoCallRepository;
import com.campuslove.api.repository.VisitorRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipRedPacketClaimRepository;
import com.campuslove.api.repository.VipRedPacketRepository;

/**
 * 测试辅助配置：为 mock profile 下的 @SpringBootTest 测试类集中提供所有 JPA Repository 的 @MockBean。
 *
 * <p>背景：mock profile 下 HibernateJpaAutoConfiguration 被排除（参见 application-mock.yml），
 * JPA Repository 不会被 Spring Data JPA 自动注册为 Bean。但 @SpringBootTest 会加载完整
 * ApplicationContext，所有 Controller 都会被实例化并要求注入对应的 Repository，导致
 * NoSuchBeanDefinitionException。</p>
 *
 * <p>使用方式：在需要 mock Repository 的测试类上添加 {@code @Import(MockAllRepositoriesConfig.class)}。
 * 此配置类列出所有 Repository 接口的 @MockBean，保证 ApplicationContext 加载时所有 Controller
 * 的 Repository 依赖都能被满足。</p>
 *
 * <p>说明：mock Repository 仅用于满足 Bean 依赖，不参与业务逻辑测试。测试中如需对特定 Repository
 * 行为进行 stub，可在测试类中通过 {@code @MockBean} 覆盖（Spring Boot Test 会替换 context 中的
 * mock bean，但会触发 context reload，慎用）。</p>
 */
@TestConfiguration
public class MockAllRepositoriesConfig {

    @MockBean private UserRepository userRepository;
    @MockBean private UserCampusProfileRepository userCampusProfileRepository;
    @MockBean private UserScheduleProfileRepository userScheduleProfileRepository;
    @MockBean private UserBasicProfileRepository userBasicProfileRepository;
    @MockBean private UserFollowRepository userFollowRepository;
    @MockBean private UserOnlineStatusRepository userOnlineStatusRepository;
    @MockBean private UserSessionRepository userSessionRepository;
    @MockBean private ProfileVisitorRepository profileVisitorRepository;
    @MockBean private VisitorRepository visitorRepository;
    @MockBean private PrivateConversationRepository privateConversationRepository;
    @MockBean private PrivateMessageRepository privateMessageRepository;
    @MockBean private NotificationRepository notificationRepository;
    @MockBean private PostRepository postRepository;
    @MockBean private PostCategoryRepository postCategoryRepository;
    @MockBean private PostLikeRepository postLikeRepository;
    @MockBean private PostShareRepository postShareRepository;
    @MockBean private PostTagRepository postTagRepository;
    @MockBean private CommentRepository commentRepository;
    @MockBean private LikeRepository likeRepository;
    @MockBean private CheckInRepository checkInRepository;
    @MockBean private MakeUpQuotaRepository makeUpQuotaRepository;
    @MockBean private DoNotDisturbSettingRepository doNotDisturbSettingRepository;
    @MockBean private PassRecordRepository passRecordRepository;
    @MockBean private InteractionEventRepository interactionEventRepository;
    @MockBean private HeartSignalRepository heartSignalRepository;
    @MockBean private FeedbackRepository feedbackRepository;
    @MockBean private ReportRepository reportRepository;
    @MockBean private InterestCircleRepository interestCircleRepository;
    @MockBean private CircleMembershipRepository circleMembershipRepository;
    @MockBean private CircleTopicRepository circleTopicRepository;
    @MockBean private CircleReplyRepository circleReplyRepository;
    @MockBean private DailyQuestionRepository dailyQuestionRepository;
    @MockBean private DailyAnswerRepository dailyAnswerRepository;
    @MockBean private DailyBenefitRepository dailyBenefitRepository;
    @MockBean private ActivityRepository activityRepository;
    @MockBean private ActivityEnrollmentRepository activityEnrollmentRepository;
    @MockBean private CampusTopicRepository campusTopicRepository;
    @MockBean private CampusTopicReplyRepository campusTopicReplyRepository;
    @MockBean private CampusCertificationRepository campusCertificationRepository;
    @MockBean private RecommendationPreferenceRepository recommendationPreferenceRepository;
    @MockBean private RecommendStrategyRepository recommendStrategyRepository;
    @MockBean private PushSummaryRepository pushSummaryRepository;
    @MockBean private PushPreferenceRepository pushPreferenceRepository;
    @MockBean private IcebreakerTopicRepository icebreakerTopicRepository;
    @MockBean private SensitiveWordRepository sensitiveWordRepository;
    @MockBean private NotifyConfigRepository notifyConfigRepository;
    @MockBean private MatchConfigEntityRepository matchConfigEntityRepository;
    @MockBean private AuditLogRepository auditLogRepository;
    @MockBean private AdminAppSwitchRepository adminAppSwitchRepository;
    @MockBean private AdminAppRuleRepository adminAppRuleRepository;
    @MockBean private AdminAppConfigRepository adminAppConfigRepository;
    @MockBean private AppLoginHeroConfigRepository appLoginHeroConfigRepository;
    @MockBean private MediaAssetRepository mediaAssetRepository;
    @MockBean private SocialProgressRepository socialProgressRepository;
    @MockBean private VipRedPacketRepository vipRedPacketRepository;
    @MockBean private VipRedPacketClaimRepository vipRedPacketClaimRepository;
    @MockBean private VipBillRepository vipBillRepository;
    @MockBean private VideoCallRepository videoCallRepository;
    @MockBean private VideoCallRecordRepository videoCallRecordRepository;
    @MockBean private ThirdPartyAccountRepository thirdPartyAccountRepository;
    @MockBean private PromoCodeRepository promoCodeRepository;
    @MockBean private PromoCodeUsageRepository promoCodeUsageRepository;
    @MockBean private TempChatSessionRepository tempChatSessionRepository;
    @MockBean private TempChatMessageRepository tempChatMessageRepository;
    @MockBean private TempChatContactExchangeRepository tempChatContactExchangeRepository;
}
