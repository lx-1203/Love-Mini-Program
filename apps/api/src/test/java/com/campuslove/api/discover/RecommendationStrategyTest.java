package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.RecommendationPreferenceRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * RecommendationStrategy 单元测试（Task 4.1.1）。
 *
 * <p>覆盖范围：</p>
 * <ul>
 *   <li>getExcludedUserIds：排除集合计算（自己 + 已喜欢 + 已 pass + 双向信号）</li>
 *   <li>filterByScope：scope=campus_first / city / unlimited 过滤</li>
 *   <li>calculateScoreOptimized：同校区/同城市/同专业/兴趣标签/共同圈/校园优先加成</li>
 *   <li>hasScheduleOverlap：日程时间窗口重叠检测</li>
 * </ul>
 */
class RecommendationStrategyTest {

    @Mock private RecommendationConfig recommendationConfig;
    @Mock private UserRepository userRepository;
    @Mock private LikeRepository likeRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private RecommendationPreferenceRepository recommendationPreferenceRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private PassRecordRepository passRecordRepository;
    @Mock private CircleMembershipRepository circleMembershipRepository;
    @Mock private DailyAnswerRepository dailyAnswerRepository;
    @Mock private PostRepository postRepository;
    @Mock private UserPreferenceCalculator preferenceCalculator;

    private RecommendationStrategy strategy;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        strategy = new RecommendationStrategy(
                recommendationConfig, userRepository, likeRepository,
                userCampusProfileRepository, userScheduleProfileRepository,
                recommendationPreferenceRepository, userBasicProfileRepository,
                heartSignalRepository, passRecordRepository,
                circleMembershipRepository, dailyAnswerRepository,
                postRepository,
                new ObjectMapper(), preferenceCalculator);
    }

    // ============ getExcludedUserIds ============

    /**
     * 场景：无任何互动记录时，应仅排除自己。
     */
    @Test
    void getExcludedUserIds_noInteractions_onlyContainsSelf() {
        Long userId = 100L;
        when(likeRepository.findByUserIdAndStatusIn(userId, List.of(LikeStatus.active)))
                .thenReturn(List.of());
        when(heartSignalRepository.findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted))
                .thenReturn(List.of());
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of());

        Set<Long> excluded = strategy.getExcludedUserIds(userId);

        assertEquals(1, excluded.size());
        assertTrue(excluded.contains(userId));
    }

    /**
     * 场景：已喜欢的用户应被排除。
     */
    @Test
    void getExcludedUserIds_hasLikes_includesLikedUsers() {
        Long userId = 100L;
        Like like1 = new Like();
        like1.setUserId(userId);
        like1.setTargetUserId(200L);
        like1.setStatus(LikeStatus.active);
        when(likeRepository.findByUserIdAndStatusIn(userId, List.of(LikeStatus.active)))
                .thenReturn(List.of(like1));
        when(heartSignalRepository.findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted))
                .thenReturn(List.of());
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of());

        Set<Long> excluded = strategy.getExcludedUserIds(userId);

        assertTrue(excluded.contains(userId));
        assertTrue(excluded.contains(200L));
        assertEquals(2, excluded.size());
    }

    /**
     * 场景：已 pass 的用户应被排除。
     */
    @Test
    void getExcludedUserIds_hasPassRecords_includesPassedUsers() {
        Long userId = 100L;
        PassRecord pass = new PassRecord();
        pass.setUserId(userId);
        pass.setPassedUserId(300L);
        when(likeRepository.findByUserIdAndStatusIn(userId, List.of(LikeStatus.active)))
                .thenReturn(List.of());
        when(heartSignalRepository.findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted))
                .thenReturn(List.of());
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(pass));

        Set<Long> excluded = strategy.getExcludedUserIds(userId);

        assertTrue(excluded.contains(300L));
        assertEquals(2, excluded.size());
    }

    /**
     * 场景：双向信号对方应被排除（无论 userAId 还是 userBId 是当前用户）。
     */
    @Test
    void getExcludedUserIds_hasAcceptedSignals_includesPartners() {
        Long userId = 100L;
        HeartSignal sig1 = new HeartSignal();
        sig1.setUserAId(userId);
        sig1.setUserBId(400L);
        sig1.setStatus(SignalStatus.accepted);

        HeartSignal sig2 = new HeartSignal();
        sig2.setUserAId(500L);
        sig2.setUserBId(userId);
        sig2.setStatus(SignalStatus.accepted);

        when(likeRepository.findByUserIdAndStatusIn(userId, List.of(LikeStatus.active)))
                .thenReturn(List.of());
        when(heartSignalRepository.findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted))
                .thenReturn(List.of(sig1, sig2));
        when(passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of());

        Set<Long> excluded = strategy.getExcludedUserIds(userId);

        assertTrue(excluded.contains(400L));
        assertTrue(excluded.contains(500L));
        assertEquals(3, excluded.size());
    }

    // ============ filterByScope ============

    /**
     * 场景：scope=unlimited 时，所有候选用户都应通过过滤。
     */
    @Test
    void filterByScope_unlimited_returnsTrue() {
        when(userCampusProfileRepository.findByUserId(1L))
                .thenReturn(Optional.empty());

        assertTrue(strategy.filterByScope(1L, "unlimited", "北大", "北京"));
    }

    /**
     * 场景：scope=campus_first 时，候选用户同校区应通过。
     */
    @Test
    void filterByScope_campusFirst_sameCampus_returnsTrue() {
        Long candidateId = 1L;
        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("北大");
        candidateCampus.setCityName("北京");
        when(userCampusProfileRepository.findByUserId(candidateId))
                .thenReturn(Optional.of(candidateCampus));

        assertTrue(strategy.filterByScope(candidateId, "campus_first", "北大", "北京"));
    }

    /**
     * 场景：scope=campus_first 时，候选用户不同校区应不通过。
     */
    @Test
    void filterByScope_campusFirst_differentCampus_returnsFalse() {
        Long candidateId = 2L;
        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("清华");
        candidateCampus.setCityName("北京");
        when(userCampusProfileRepository.findByUserId(candidateId))
                .thenReturn(Optional.of(candidateCampus));

        assertFalse(strategy.filterByScope(candidateId, "campus_first", "北大", "北京"));
    }

    /**
     * 场景：scope=city 时，候选用户同城市应通过。
     */
    @Test
    void filterByScope_city_sameCity_returnsTrue() {
        Long candidateId = 3L;
        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("复旦");
        candidateCampus.setCityName("上海");
        when(userCampusProfileRepository.findByUserId(candidateId))
                .thenReturn(Optional.of(candidateCampus));

        assertTrue(strategy.filterByScope(candidateId, "city", "北大", "上海"));
    }

    /**
     * 场景：scope=campus_first 时，候选用户无校区资料应不通过。
     */
    @Test
    void filterByScope_campusFirst_noCampusProfile_returnsFalse() {
        Long candidateId = 4L;
        when(userCampusProfileRepository.findByUserId(candidateId))
                .thenReturn(Optional.empty());

        assertFalse(strategy.filterByScope(candidateId, "campus_first", "北大", "北京"));
    }

    // ============ calculateScoreOptimized ============

    /**
     * 场景：campusProfile 为 null 时，分数应为 0。
     */
    @Test
    void calculateScore_nullCampusProfile_returnsZero() {
        int score = strategy.calculateScoreOptimized(
                1L, "北大", "北京", Set.of(), "{}",
                "计算机", Set.of(), Set.of(), true,
                null, null, List.of());
        assertEquals(0, score);
    }

    /**
     * 场景：同校区 + 同城市 + 同专业应累加对应权重。
     */
    @Test
    void calculateScore_sameCampusCityMajor_accumulatesWeights() {
        when(recommendationConfig.getCampusWeight()).thenReturn(50);
        when(recommendationConfig.getCityWeight()).thenReturn(20);
        when(recommendationConfig.getSameMajorWeight()).thenReturn(20);
        when(recommendationConfig.getCircleWeight()).thenReturn(8);

        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("北大");
        candidateCampus.setCityName("北京");
        candidateCampus.setDepartmentName("计算机");

        int score = strategy.calculateScoreOptimized(
                1L, "北大", "北京", Set.of(), "{}",
                "计算机", Set.of(), Set.of(), false,
                candidateCampus, null, List.of());

        // 50 (campus) + 20 (city) + 20 (major) = 90；boost 关闭，不乘 1.3
        assertEquals(90, score);
    }

    /**
     * 场景：开启校园优先加成时，同校用户分数应乘 1.3。
     */
    @Test
    void calculateScore_campusPriorityEnabledAndSameCampus_appliesBoost() {
        when(recommendationConfig.getCampusWeight()).thenReturn(50);
        when(recommendationConfig.getCityWeight()).thenReturn(20);
        when(recommendationConfig.getSameMajorWeight()).thenReturn(20);
        when(recommendationConfig.getCircleWeight()).thenReturn(8);

        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("北大");
        candidateCampus.setCityName("北京");
        candidateCampus.setDepartmentName("计算机");

        int score = strategy.calculateScoreOptimized(
                1L, "北大", "北京", Set.of(), "{}",
                "计算机", Set.of(), Set.of(), true,
                candidateCampus, null, List.of());

        // (50+20+20) * 1.3 = 117，转 int 取整
        assertEquals(117, score);
    }

    /**
     * 场景：兴趣标签匹配时应累加 interestWeight * commonTagCount。
     */
    @Test
    void calculateScore_interestTagMatch_addsInterestWeight() {
        when(recommendationConfig.getCampusWeight()).thenReturn(50);
        when(recommendationConfig.getCityWeight()).thenReturn(20);
        when(recommendationConfig.getSameMajorWeight()).thenReturn(20);
        when(recommendationConfig.getInterestWeight()).thenReturn(10);
        when(recommendationConfig.getCircleWeight()).thenReturn(8);

        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("北大");
        candidateCampus.setCityName("北京");
        candidateCampus.setDepartmentName("计算机");

        UserBasicProfile candidateBasic = new UserBasicProfile();
        candidateBasic.setInterestTags("[\"摄影\", \"篮球\"]");

        // preferenceCalculator.parseInterestTags 直接调用真实 ObjectMapper
        UserPreferenceCalculator realCalc = new UserPreferenceCalculator(
                recommendationPreferenceRepository, new ObjectMapper());
        when(preferenceCalculator.parseInterestTags("[\"摄影\", \"篮球\"]"))
                .thenReturn(realCalc.parseInterestTags("[\"摄影\", \"篮球\"]"));

        Set<String> myTags = Set.of("摄影", "篮球", "旅行");
        int score = strategy.calculateScoreOptimized(
                1L, "北大", "北京", myTags, "{}",
                "计算机", Set.of(), Set.of(), false,
                candidateCampus, candidateBasic, List.of());

        // 50 (campus) + 20 (city) + 20 (major) + 2 (匹配标签) * 10 = 110
        assertEquals(110, score);
    }

    /**
     * 场景：共同兴趣圈应累加 circleWeight * commonCircleCount。
     */
    @Test
    void calculateScore_commonCircles_addsCircleWeight() {
        when(recommendationConfig.getCampusWeight()).thenReturn(50);
        when(recommendationConfig.getCityWeight()).thenReturn(20);
        when(recommendationConfig.getSameMajorWeight()).thenReturn(20);
        when(recommendationConfig.getCircleWeight()).thenReturn(8);

        UserCampusProfile candidateCampus = new UserCampusProfile();
        candidateCampus.setCampusName("北大");
        candidateCampus.setCityName("北京");
        candidateCampus.setDepartmentName("计算机");

        InterestCircle circle1 = new InterestCircle();
        circle1.setId(10L);
        InterestCircle circle2 = new InterestCircle();
        circle2.setId(20L);
        InterestCircle circle3 = new InterestCircle();
        circle3.setId(30L);

        CircleMembership m1 = new CircleMembership();
        m1.setCircle(circle1);
        CircleMembership m2 = new CircleMembership();
        m2.setCircle(circle2);
        CircleMembership m3 = new CircleMembership();
        m3.setCircle(circle3);

        Set<Long> myCircleIds = Set.of(10L, 20L);
        int score = strategy.calculateScoreOptimized(
                1L, "北大", "北京", Set.of(), "{}",
                "计算机", myCircleIds, Set.of(), false,
                candidateCampus, null, List.of(m1, m2, m3));

        // 50 (campus) + 20 (city) + 20 (major) + 2 (共同圈) * 8 = 106
        assertEquals(106, score);
    }

    // ============ hasScheduleOverlap ============

    /**
     * 场景：null / 空白时间窗口应返回 false。
     */
    @Test
    void hasScheduleOverlap_nullOrBlank_returnsFalse() {
        assertFalse(strategy.hasScheduleOverlap(null, "{}"));
        assertFalse(strategy.hasScheduleOverlap("{}", null));
        assertFalse(strategy.hasScheduleOverlap("", "{}"));
        assertFalse(strategy.hasScheduleOverlap("{}", "  "));
    }

    /**
     * 场景：两个时间窗口有共同键应返回 true。
     */
    @Test
    void hasScheduleOverlap_commonKeys_returnsTrue() {
        String myWindow = "{\"morning\": true, \"afternoon\": false}";
        String candidateWindow = "{\"morning\": true, \"evening\": true}";

        assertTrue(strategy.hasScheduleOverlap(myWindow, candidateWindow));
    }

    /**
     * 场景：两个时间窗口无共同键应返回 false。
     */
    @Test
    void hasScheduleOverlap_noCommonKeys_returnsFalse() {
        String myWindow = "{\"morning\": true}";
        String candidateWindow = "{\"evening\": true}";

        assertFalse(strategy.hasScheduleOverlap(myWindow, candidateWindow));
    }

    /**
     * 场景：JSON 解析失败应返回 false，不抛异常。
     */
    @Test
    void hasScheduleOverlap_invalidJson_returnsFalse() {
        assertFalse(strategy.hasScheduleOverlap("invalid", "{}"));
        assertFalse(strategy.hasScheduleOverlap("{}", "{unclosed"));
    }
}
