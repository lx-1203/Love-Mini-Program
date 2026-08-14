package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * RealRecommendationService 单元测试（Task 4.1.5 验证）。
 *
 * <p>验证 RealRecommendationService 在 Task 4.1 重构后正确委托 4 个组件：</p>
 * <ul>
 *   <li>{@link RecommendationStrategy}：算法核心（本测试不直接覆盖，由 RecommendationStrategyTest 负责）</li>
 *   <li>{@link UserPreferenceCalculator}：偏好查询与保存</li>
 *   <li>{@link RecommendationCacheManager}：推荐结果缓存</li>
 *   <li>{@link RecommendationRanker}：排序与字符串辅助</li>
 * </ul>
 *
 * <p>测试策略：仅验证委托关系（调用次数 + 返回值透传），
 * 不验证算法逻辑（由各组件自身的单元测试覆盖）。</p>
 */
class RealRecommendationServiceTest {

    @Mock private ActivityRepository activityRepository;
    @Mock private ActivityEnrollmentRepository activityEnrollmentRepository;
    @Mock private CircleTopicRepository circleTopicRepository;
    @Mock private PostRepository postRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private RecommendationStrategy recommendationStrategy;
    @Mock private UserPreferenceCalculator preferenceCalculator;
    @Mock private RecommendationCacheManager cacheManager;
    @Mock private RecommendationRanker ranker;

    private RealRecommendationService realService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        realService = new RealRecommendationService(
                activityRepository,
                activityEnrollmentRepository,
                circleTopicRepository,
                postRepository,
                userBasicProfileRepository,
                recommendationStrategy,
                preferenceCalculator,
                cacheManager,
                ranker);
    }

    // ---- 偏好委托：UserPreferenceCalculator ----

    /**
     * 场景：getPreferences(userId) 应委托 preferenceCalculator.getPreferences。
     */
    @Test
    void getPreferences_withUserId_delegatesToPreferenceCalculator() {
        Long userId = 100L;
        RecommendationPreferencesView expected =
                new RecommendationPreferencesView("09:00", "city", false);
        when(preferenceCalculator.getPreferences(userId)).thenReturn(expected);

        RecommendationPreferencesView result = realService.getPreferences(userId);

        assertSame(expected, result);
        verify(preferenceCalculator, times(1)).getPreferences(userId);
    }

    /**
     * 场景：updatePreferences(userId, data) 应委托 preferenceCalculator.updatePreferences。
     */
    @Test
    void updatePreferences_withEntity_delegatesToPreferenceCalculator() {
        Long userId = 100L;
        RecommendationPreference data = new RecommendationPreference();
        data.setPreferredTime("10:00");
        data.setScope("unlimited");
        RecommendationPreferencesView expected =
                new RecommendationPreferencesView("10:00", "unlimited", true);
        when(preferenceCalculator.updatePreferences(eq(userId), eq(data))).thenReturn(expected);

        RecommendationPreferencesView result = realService.updatePreferences(userId, data);

        assertSame(expected, result);
        verify(preferenceCalculator, times(1)).updatePreferences(userId, data);
    }

    /**
     * 场景：savePreferences(userId, time, scope, priority) 应委托 preferenceCalculator.savePreferences。
     */
    @Test
    void savePreferences_withAllArgs_delegatesToPreferenceCalculator() {
        Long userId = 100L;
        RecommendationPreferencesView expected =
                new RecommendationPreferencesView("20:00", "campus_first", true);
        when(preferenceCalculator.savePreferences(userId, "20:00", "campus_first", true))
                .thenReturn(expected);

        RecommendationPreferencesView result =
                realService.savePreferences(userId, "20:00", "campus_first", true);

        assertSame(expected, result);
        verify(preferenceCalculator, times(1))
                .savePreferences(userId, "20:00", "campus_first", true);
    }

    // ---- 人物推荐委托：RecommendationCacheManager ----

    /**
     * 场景：getRecommendations(userId) 应委托 cacheManager.getCachedRecommendations。
     */
    @Test
    void getRecommendations_withUserId_delegatesToCacheManager() {
        Long userId = 100L;
        List<RecommendedPersonView> expected = List.of(
                new RecommendedPersonView(1L, "Alice", "A", "bio",
                        "同校", "今天有空", "北大", "/avatar1.jpg",
                        List.of("读书"), "bio", List.of(), true, false, 0,
                        165, "bachelor", List.of(), null, null, "none",
                        "CL-1", "1.2km", "offline", true, false,
                        List.of("开朗"), "INTJ", null, false, List.of(),
                        null, false, "北京", null, null, null, null));
        when(cacheManager.getCachedRecommendations(userId)).thenReturn(expected);

        List<RecommendedPersonView> result = realService.getRecommendations(userId);

        assertSame(expected, result);
        verify(cacheManager, times(1)).getCachedRecommendations(userId);
    }

    /**
     * 场景：getRecommendations(userId=null) 应抛 IllegalArgumentException。
     */
    @Test
    void getRecommendations_nullUserId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realService.getRecommendations(null));
        assertTrue(ex.getMessage().contains("userId is required"));
    }

    /**
     * 场景：getRecommendations(userId, filter) 在 filter 为空时应直接返回 cacheManager 结果。
     */
    @Test
    void getRecommendations_emptyFilter_returnsCacheManagerResult() {
        Long userId = 100L;
        List<RecommendedPersonView> cached = List.of(
                new RecommendedPersonView(1L, "Alice", "A", "bio",
                        "同校", "今天有空", "北大", "/avatar1.jpg",
                        List.of("读书"), "bio", List.of(), true, false, 0,
                        165, "bachelor", List.of(), null, null, "none",
                        "CL-1", "1.2km", "offline", true, false,
                        List.of("开朗"), "INTJ", null, false, List.of(),
                        null, false, "北京", null, null, null, null));
        when(cacheManager.getCachedRecommendations(userId)).thenReturn(cached);
        RecommendationFilter emptyFilter = new RecommendationFilter(
                null, null, null, null, null, null, null, null, null, null);

        List<RecommendedPersonView> result = realService.getRecommendations(userId, emptyFilter);

        assertSame(cached, result);
        verify(cacheManager, times(1)).getCachedRecommendations(userId);
    }

    /**
     * 场景（2026-08-09 免登录可逛，2026-08-12 卡顿修复）：游客推荐在空 filter 时
     * 委托 cacheManager.getCachedGuestRecommendations（60s 缓存，不再每次全量重算）。
     */
    @Test
    void getRecommendationsForGuest_emptyFilter_delegatesToGuestCache() {
        List<RecommendedPersonView> views = List.of();
        when(cacheManager.getCachedGuestRecommendations()).thenReturn(views);
        RecommendationFilter emptyFilter = new RecommendationFilter(
                null, null, null, null, null, null, null, null, null, null);

        List<RecommendedPersonView> got = realService.getRecommendationsForGuest(emptyFilter);

        assertSame(views, got);
        verify(cacheManager, times(1)).getCachedGuestRecommendations();
        // 游客场景不得走用户级缓存/配额路径
        verify(cacheManager, times(0)).getCachedRecommendations(anyLong());
    }

    /**
     * 场景（2026-08-09 免登录可逛）：游客推荐应用非空 filter 时走 in-memory 筛选
     * （与登录用户 matchesFilter 同一逻辑）。
     */
    @Test
    void getRecommendationsForGuest_withFilter_appliesInMemoryFilter() {
        RecommendedPersonView alice = new RecommendedPersonView(
                1L, "Alice", "A", "bio", "同校", "今天有空", "北大", "/avatar1.jpg",
                List.of("读书"), "bio", List.of(), true, false, 0,
                165, "bachelor", List.of(), null, null, "none",
                "CL-1", "1.2km", "offline", true, false,
                List.of("开朗"), "INTJ", null, false, List.of(),
                null, false, "北京", null, null, null, null);
        when(cacheManager.getCachedGuestRecommendations()).thenReturn(List.of(alice));
        // 关键词 filter：命中 Alice 的 name/bio/tags
        RecommendationFilter keywordFilter = new RecommendationFilter(
                null, null, null, null, null, null, null, "alice", null, null);

        List<RecommendedPersonView> got = realService.getRecommendationsForGuest(keywordFilter);

        assertEquals(1, got.size());
        assertEquals(1L, got.get(0).id());
        verify(cacheManager, times(1)).getCachedGuestRecommendations();
    }

    /**
     * 场景：getHistory(userId) 应委托 cacheManager.buildHistory。
     */
    @Test
    void getHistory_withUserId_delegatesToCacheManager() {
        Long userId = 100L;
        List<RecommendedPersonView> expected = List.of(
                new RecommendedPersonView(2L, "Bob", "B", "bio2",
                        "同专业", "本周忙", "北大", "/avatar2.jpg",
                        List.of("运动"), "bio2", List.of(), false, true, 1,
                        180, "master", List.of(), null, null, "verified",
                        "CL-2", "1.2km", "offline", true, false,
                        List.of("沉稳"), "ISFJ", null, false, List.of(),
                        null, false, "南京", null, null, null, null));
        when(cacheManager.buildHistory(userId)).thenReturn(expected);

        List<RecommendedPersonView> result = realService.getHistory(userId);

        assertSame(expected, result);
        verify(cacheManager, times(1)).buildHistory(userId);
    }

    /**
     * 场景：getHistory(userId=null) 应抛 IllegalArgumentException。
     */
    @Test
    void getHistory_nullUserId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realService.getHistory(null));
        assertTrue(ex.getMessage().contains("userId is required"));
    }

    // ---- 向后兼容方法（无 userId 版本） ----

    /**
     * 场景：getPreferences() 无 userId 版本应返回默认值，不委托 preferenceCalculator。
     * 该方法为 @Deprecated，仅返回默认 RecommendationPreferencesView。
     */
    @Test
    void getPreferences_noArgs_returnsDefaults() {
        RecommendationPreferencesView result = realService.getPreferences();

        // 默认值：dailyNotifyTime=12:00, scope=campus_first, campusPriority=true
        assertEquals("12:00", result.dailyNotifyTime());
        assertEquals("campus_first", result.scope());
        assertTrue(result.campusPriority());
        // 不应该委托给 preferenceCalculator（无 userId 无法查询）
        verify(preferenceCalculator, times(0)).getPreferences(anyLong());
    }

    /**
     * 场景：updatePreferences(RecommendationPreferencesView) 无 userId 版本应抛 UnsupportedOperationException。
     * 该方法为 @Deprecated，无法持久化。
     */
    @Test
    void updatePreferences_noArgs_throwsUnsupported() {
        RecommendationPreferencesView prefs =
                new RecommendationPreferencesView("12:00", "campus_first", true);
        assertThrows(UnsupportedOperationException.class,
                () -> realService.updatePreferences(prefs));
    }
}
