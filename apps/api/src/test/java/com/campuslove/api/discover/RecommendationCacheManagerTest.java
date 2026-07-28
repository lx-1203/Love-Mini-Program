package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.User;
import com.campuslove.api.monitor.MatchMetrics;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * RecommendationCacheManager 单元测试（Task 4.1.3）。
 *
 * <p>覆盖范围：</p>
 * <ul>
 *   <li>getCachedRecommendations：委托 Strategy + Ranker，并记录耗时</li>
 *   <li>getCachedRecommendations 异常时仍记录耗时</li>
 *   <li>buildHistory：委托 Ranker.buildHistory</li>
 *   <li>evictRecommendationCache / evictAllRecommendationCaches：空实现方法可调用</li>
 * </ul>
 *
 * <p>注意：@Cacheable / @CacheEvict 注解需 Spring 代理生效，单元测试中不验证缓存行为，
 * 仅验证委托逻辑。</p>
 */
class RecommendationCacheManagerTest {

    @Mock private RecommendationStrategy recommendationStrategy;
    @Mock private RecommendationRanker recommendationRanker;
    @Mock private MatchMetrics matchMetrics;

    private RecommendationCacheManager cacheManager;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        cacheManager = new RecommendationCacheManager(
                recommendationStrategy, recommendationRanker, matchMetrics);
    }

    /**
     * 场景：getCachedRecommendations 应委托 Strategy.doRecommend 与 Ranker.rankAndConvert。
     */
    @Test
    void getCachedRecommendations_normalFlow_delegatesAndRecordsLatency() {
        Long userId = 100L;

        RecommendationStrategy.RecommendResult fakeResult = new RecommendationStrategy.RecommendResult(
                List.of(), "北大", "计算机", Set.of(),
                Map.of(), Map.of(), Map.of());
        when(recommendationStrategy.doRecommend(userId)).thenReturn(fakeResult);

        List<RecommendedPersonView> fakeViews = List.of();
        when(recommendationRanker.rankAndConvert(fakeResult)).thenReturn(fakeViews);

        List<RecommendedPersonView> result = cacheManager.getCachedRecommendations(userId);

        assertEquals(fakeViews, result);
        verify(recommendationStrategy, times(1)).doRecommend(userId);
        verify(recommendationRanker, times(1)).rankAndConvert(fakeResult);
        verify(matchMetrics, times(1)).recordRecommendLatency(anyLong());
    }

    /**
     * 场景：Strategy 抛异常时也应记录耗时，并向上传播异常。
     */
    @Test
    void getCachedRecommendations_strategyThrows_recordsLatencyAndPropagates() {
        Long userId = 200L;
        when(recommendationStrategy.doRecommend(userId))
                .thenThrow(new RuntimeException("DB error"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> cacheManager.getCachedRecommendations(userId));

        assertEquals("DB error", ex.getMessage());
        verify(recommendationRanker, never()).rankAndConvert(
                org.mockito.ArgumentMatchers.any());
        verify(matchMetrics, times(1)).recordRecommendLatency(anyLong());
    }

    /**
     * 场景：MatchMetrics 抛异常时不应影响主流程（finally 块 try-catch 吞掉异常）。
     */
    @Test
    void getCachedRecommendations_metricsThrows_doesNotAffectMainFlow() {
        Long userId = 300L;
        RecommendationStrategy.RecommendResult fakeResult = new RecommendationStrategy.RecommendResult(
                List.of(), "北大", "计算机", Set.of(),
                Map.of(), Map.of(), Map.of());
        when(recommendationStrategy.doRecommend(userId)).thenReturn(fakeResult);
        when(recommendationRanker.rankAndConvert(fakeResult)).thenReturn(List.of());
        // matchMetrics 抛异常
        org.mockito.Mockito.doThrow(new RuntimeException("metrics error"))
                .when(matchMetrics).recordRecommendLatency(anyLong());

        // 主流程不应受影响
        List<RecommendedPersonView> result = cacheManager.getCachedRecommendations(userId);
        assertTrue(result.isEmpty());
    }

    /**
     * 场景：buildHistory 应委托 Ranker.buildHistory。
     */
    @Test
    void buildHistory_delegatesToRanker() {
        Long userId = 400L;
        RecommendedPersonView fakeView = new RecommendedPersonView(
                500L, "历史用户", "历", "headline", "commonGround", "available",
                "campus", "/avatar.jpg", List.of("tag"), "bio", List.of(),
                false, false, 0, null, null, List.of(), null, null, "none");
        when(recommendationRanker.buildHistory(userId))
                .thenReturn(List.of(fakeView));

        List<RecommendedPersonView> result = cacheManager.buildHistory(userId);

        assertEquals(1, result.size());
        assertEquals(500L, result.get(0).id());
        verify(recommendationRanker, times(1)).buildHistory(userId);
    }

    /**
     * 场景：evictRecommendationCache 应可正常调用（空实现，仅依赖注解触发）。
     */
    @Test
    void evictRecommendationCache_invokableWithoutException() {
        // 仅验证可调用，不抛异常
        cacheManager.evictRecommendationCache(1L);
        // 无交互可验证，无 assert 也能通过
    }

    /**
     * 场景：evictAllRecommendationCaches 应可正常调用（空实现，仅依赖注解触发）。
     */
    @Test
    void evictAllRecommendationCaches_invokableWithoutException() {
        cacheManager.evictAllRecommendationCaches();
    }
}
