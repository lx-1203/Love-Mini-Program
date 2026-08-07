package com.campuslove.api.discover;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.monitor.MatchMetrics;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 推荐结果缓存管理组件。
 *
 * <p>职责：</p>
 * <ul>
 *   <li>通过 {@code @Cacheable} 缓存 {@link #getCachedRecommendations} 计算结果，
 *       key 为 userId，TTL 由 {@link CacheNames#MATCH_RECOMMEND} 配置决定（默认 5 分钟）。</li>
 *   <li>结果为 null 或空列表时不缓存（unless 条件），避免缓存穿透与空结果占用缓存空间。</li>
 *   <li>提供 {@link #evictRecommendationCache} 主动失效方法，
 *       在偏好更新、互动等场景由 {@link UserPreferenceCalculator} 通过 {@code @CacheEvict} 调用。</li>
 *   <li>封装推荐算法耗时监控（{@link MatchMetrics#recordRecommendLatency}）。</li>
 * </ul>
 *
 * <p>从 RealRecommendationService 拆分而来（Task 4.1.3）。
 * Spring Cache 基于代理 AOP，{@code @Cacheable} 必须在独立的 Spring Bean 方法上才能生效，
 * 因此缓存逻辑需要独立组件，避免 RealRecommendationService 内部自调用导致缓存失效。</p>
 */
@Profile("real")
@Component
public class RecommendationCacheManager {

    private final RecommendationStrategy recommendationStrategy;
    private final RecommendationRanker recommendationRanker;
    private final MatchMetrics matchMetrics;

    public RecommendationCacheManager(
            RecommendationStrategy recommendationStrategy,
            RecommendationRanker recommendationRanker,
            MatchMetrics matchMetrics) {
        this.recommendationStrategy = recommendationStrategy;
        this.recommendationRanker = recommendationRanker;
        this.matchMetrics = matchMetrics;
    }

    /**
     * 获取指定用户的推荐人物列表（带缓存）。
     *
     * <p>缓存策略：{@link CacheNames#MATCH_RECOMMEND}，key 为 {@code v2:{userId}}
     * （P0-20 修复：加版本前缀绕开历史序列化器写入的旧键类型残留，避免反序列化
     * 报 Unexpected token / missing type id）。结果为 null 或空列表时不缓存
     * （unless 条件），避免缓存穿透。</p>
     *
     * <p>实现说明：内部委托 {@link RecommendationStrategy#doRecommend} 进行评分，
     * 再委托 {@link RecommendationRanker#rankAndConvert(RecommendationStrategy.RecommendResult)}
     * 完成排序与视图转换，复用 Strategy 预加载的 Map 避免重复查询。</p>
     *
     * <p>监控：记录推荐算法耗时（match.recommend.latency 指标），
     * finally 块保证异常也能记录耗时。</p>
     *
     * @param userId 当前用户 ID
     * @return 推荐人物视图列表
     */
    @Cacheable(cacheNames = CacheNames.MATCH_RECOMMEND, key = "'v2:' + #userId",
            unless = "#result == null || #result.isEmpty()")
    public List<RecommendedPersonView> getCachedRecommendations(Long userId) {
        long startNanos = System.nanoTime();
        try {
            // 委托 Strategy 进行推荐算法计算（返回评分结果 + 预加载的 Map）
            RecommendationStrategy.RecommendResult result = recommendationStrategy.doRecommend(userId);

            // 通过 Ranker 完成排序与视图转换（直接复用 Strategy 预加载的 Map）
            return recommendationRanker.rankAndConvert(result);
        } finally {
            try {
                long durationMs = (System.nanoTime() - startNanos) / 1_000_000;
                matchMetrics.recordRecommendLatency(durationMs);
            } catch (RuntimeException ignore) {
                // 监控逻辑失败忽略，不影响主流程
            }
        }
    }

    /**
     * 主动失效指定用户的推荐缓存。
     * 在以下场景调用：
     * <ul>
     *   <li>偏好更新（通过 {@link UserPreferenceCalculator} 内部 {@code @CacheEvict} 自动触发）</li>
     *   <li>用户主动喜欢/pass 某人后，可调用此方法清除缓存使下次推荐结果实时更新</li>
     *   <li>运营后台批量刷新推荐时调用</li>
     * </ul>
     *
     * <p>key 与 {@link #getCachedRecommendations} 的 {@code v2:} 前缀保持一致
     * （P0-20），确保能命中并清除同一缓存键。</p>
     *
     * @param userId 用户 ID
     */
    @CacheEvict(cacheNames = CacheNames.MATCH_RECOMMEND, key = "'v2:' + #userId")
    public void evictRecommendationCache(Long userId) {
        // 空实现，仅依赖 @CacheEvict 注解触发缓存失效
    }

    /**
     * 批量失效所有用户的推荐缓存（运营后台维护场景使用）。
     * 注意：allEntries=true 会清空整个 match_recommend 缓存，谨慎使用。
     */
    @CacheEvict(cacheNames = CacheNames.MATCH_RECOMMEND, allEntries = true)
    public void evictAllRecommendationCaches() {
        // 空实现，仅依赖 @CacheEvict 注解触发缓存失效
    }

    /**
     * 构建推荐历史列表（委托 {@link RecommendationRanker#buildHistory}）。
     * 用于 {@link RealRecommendationService#getHistory} 等场景，
     * 直接委托 Ranker 完成历史用户列表的视图转换。
     *
     * @param userId 当前用户 ID
     * @return 推荐历史视图列表
     */
    public List<RecommendedPersonView> buildHistory(Long userId) {
        return recommendationRanker.buildHistory(userId);
    }
}
