package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.growth.RecommendQuotaService;
import com.campuslove.api.monitor.MatchMetrics;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * S3-6（2026-10-30）：excludeIds 绕版推荐路径的配额核销测试。
 *
 * <p>缺陷确认（不是臆想）：每日推荐配额的唯一核销点在
 * {@link RecommendationCacheManager#getCachedRecommendations} 的方法体首行
 * （修复前后都是原文件第 93 行的 {@code tryConsume}）；而带 excludeIds 的重算路径
 * {@code getRecommendationsWithExclude}（修复前第 216-247 行）里根本没有这一步，
 * 且 {@code RealRecommendationService.getRecommendations} 只要
 * {@code filter.excludeIds()} 非空就无条件走后者。结论：客户端每次请求都带上
 * 非空 excludeIds（发现页滑动去重的正常用法）即可无限拉新推荐，配额永远不减；
 * 同时该路径照常 {@code recordExposure}，表现为「曝光一直涨、配额恒为 0」。</p>
 *
 * <p>因此这里钉三件事：excludeIds 路径与缓存路径同口径扣一次；配额耗尽时不计算、
 * 不记曝光、返回空列表；quota 服务未注入（单测/mock 场景）时行为不变。</p>
 *
 * <p>注：excludeIds 路径「不走缓存」是设计需要（excludeIds 参与缓存 key 会让命中率归零），
 * 本测试不改动该语义。</p>
 */
@DisplayName("RecommendationCacheManager - excludeIds 路径必须核销推荐配额（S3-6）")
class RecommendationExcludeQuotaTest {

    private static final Long USER_ID = 100L;

    @Mock private RecommendationStrategy recommendationStrategy;
    @Mock private RecommendationRanker recommendationRanker;
    @Mock private MatchMetrics matchMetrics;
    @Mock private RecommendQuotaService recommendQuotaService;

    private RecommendationCacheManager cacheManager;

    private final RecommendationStrategy.RecommendResult fakeResult =
            new RecommendationStrategy.RecommendResult(
                    List.of(), "北京大学", "计算机", Set.of(1L),
                    Map.of(), Map.of(), Map.of());

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        cacheManager = new RecommendationCacheManager(
                recommendationStrategy, recommendationRanker, matchMetrics);
        // recommendQuotaService 是 @Autowired(required=false) 字段注入
        ReflectionTestUtils.setField(cacheManager, "recommendQuotaService", recommendQuotaService);
        when(recommendationStrategy.doRecommend(USER_ID)).thenReturn(fakeResult);
    }

    private void stubRankerWithExclude(List<RecommendedPersonView> returned) {
        when(recommendationRanker.rankAndConvert(
                anyList(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(returned);
    }

    @Test
    @DisplayName("excludeIds 路径：每次真实计算扣一次配额（修复前一次都不扣）")
    void getRecommendationsWithExclude_shouldConsumeQuotaOnce() {
        when(recommendQuotaService.tryConsume(USER_ID)).thenReturn(true);
        stubRankerWithExclude(List.of());
        Set<Long> excludeIds = Set.of(201L, 202L);

        List<RecommendedPersonView> views =
                cacheManager.getRecommendationsWithExclude(USER_ID, excludeIds);

        assertTrue(views.isEmpty());
        verify(recommendQuotaService, times(1)).tryConsume(USER_ID);
        // 扣费之后仍要正常计算，并把手上的 excludeIds 原样交给 Ranker
        verify(recommendationStrategy, times(1)).doRecommend(USER_ID);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Set<Long>> excludeCaptor = ArgumentCaptor.forClass(Set.class);
        verify(recommendationRanker).rankAndConvert(anyList(), any(), any(), any(),
                any(), any(), any(), anyLong(), excludeCaptor.capture());
        assertEquals(excludeIds, excludeCaptor.getValue());
    }

    @Test
    @DisplayName("配额耗尽：不查库、不排序、不记曝光，直接空列表（与缓存路径同口径）")
    void getRecommendationsWithExclude_quotaExhausted_shouldShortCircuit() {
        when(recommendQuotaService.tryConsume(USER_ID)).thenReturn(false);
        stubRankerWithExclude(List.of());

        List<RecommendedPersonView> views =
                cacheManager.getRecommendationsWithExclude(USER_ID, Set.of(201L));

        assertTrue(views.isEmpty(), "配额耗尽必须返回空列表，前端才有「今日次数已用完」空态");
        verify(recommendQuotaService, times(1)).tryConsume(USER_ID);
        verify(recommendationStrategy, never()).doRecommend(anyLong());
        verify(recommendationRanker, never()).rankAndConvert(anyList(), any(), any(), any(),
                any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("两条路径同口径：缓存 miss 与 excludeIds 重算都恰好扣一次")
    void bothComputePaths_shouldConsumeQuotaIdentically() {
        when(recommendQuotaService.tryConsume(anyLong())).thenReturn(true);
        when(recommendationRanker.rankAndConvert(
                any(RecommendationStrategy.RecommendResult.class), any()))
                .thenReturn(List.of());
        stubRankerWithExclude(List.of());

        cacheManager.getCachedRecommendations(USER_ID);
        cacheManager.getRecommendationsWithExclude(USER_ID, Set.of(201L));

        verify(recommendQuotaService, times(2)).tryConsume(USER_ID);
    }

    @Test
    @DisplayName("quota 服务未注入（单测 / mock profile）：excludeIds 路径照旧可用")
    void getRecommendationsWithExclude_withoutQuotaService_shouldStillCompute() {
        ReflectionTestUtils.setField(cacheManager, "recommendQuotaService", null);
        stubRankerWithExclude(List.of());

        assertEquals(0, cacheManager.getRecommendationsWithExclude(USER_ID, Set.of(201L)).size());
        verify(recommendationStrategy, times(1)).doRecommend(USER_ID);
    }
}
