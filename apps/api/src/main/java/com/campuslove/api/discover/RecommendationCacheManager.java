package com.campuslove.api.discover;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.growth.RecommendQuotaService;
import com.campuslove.api.growth.SocialProgressService;
import com.campuslove.api.monitor.MatchMetrics;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
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

    /**
     * 每日推荐配额服务（R4-00325：配额扣减移入缓存 miss 路径）。
     * real profile 由 Spring 注入；单元测试 / mock 场景为 null 时跳过配额限制。
     * 采用字段注入（required=false）而非构造器参数，避免破坏既有单测构造器。
     */
    @Autowired(required = false)
    private RecommendQuotaService recommendQuotaService;

    /**
     * 社交升温漏斗服务（R4-00327：推荐曝光埋点）。
     * real profile 注入；单元测试 / mock 场景为 null 时跳过埋点。
     */
    @Autowired(required = false)
    private SocialProgressService socialProgressService;

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
     * <p>R4-00325 配额语义：本方法体仅在缓存 miss（真实计算新推荐）时执行，
     * 在此处扣减推荐配额即「每次真实计算扣一次」——首页/聊天概览/发现页等入口
     * 在缓存 TTL 内共享一次计算、只扣一次配额；配额耗尽返回空列表（前端已有
     * 空态兜底），服务未注入（单元测试 / mock 场景）时跳过配额限制。</p>
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
        // R4-00325：配额扣减仅发生在缓存 miss（真实计算）路径。
        // 注意：配额耗尽返回空列表且不缓存（unless 空结果），下次调用重新走本路径
        // 再次 tryConsume（超限时原子回滚递增，不会把配额扣成负数）。
        if (recommendQuotaService != null && !recommendQuotaService.tryConsume(userId)) {
            return List.of();
        }
        long startNanos = System.nanoTime();
        try {
            // 委托 Strategy 进行推荐算法计算（返回评分结果 + 预加载的 Map）
            RecommendationStrategy.RecommendResult result = recommendationStrategy.doRecommend(userId);

            // 通过 Ranker 完成排序与视图转换（直接复用 Strategy 预加载的 Map）；
            // R4-00315：携带当前用户 ID，allowMessage / whisperSent 按解锁集合据实返回
            // 2026-08-12：外层 List 转可变 ArrayList（同 getCachedGuestRecommendations
            // 的 Redis 序列化修复——Stream.toList() 的 ImmutableCollections 无法反序列化）
            List<RecommendedPersonView> views =
                    new java.util.ArrayList<>(recommendationRanker.rankAndConvert(result, userId));

            // R4-00327：社交升温漏斗埋点——发现曝光（L1_EXPOSURE 默认层级计数）。
            // 仅在缓存 miss（真实计算新推荐）时记录一次；埋点失败不影响主流程
            if (socialProgressService != null && !views.isEmpty()) {
                try {
                    socialProgressService.recordExposure(userId);
                } catch (RuntimeException e) {
                    // 埋点失败仅记录日志，不阻断推荐返回
                }
            }
            return views;
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
     * 获取游客（未登录）推荐人物列表（带缓存，2026-08-12 卡顿修复）。
     *
     * <p>游客推荐无个性化上下文（固定 key {@code guest:v1}），每次全量重算
     * ~8 次 SQL（候选池 200 人）是未登录切页卡顿主因；缓存后降为 1 次 Redis GET。
     * TTL 60 秒（{@link CacheNames#GUEST_RECOMMEND}）：新用户/资料更新的可见性
     * 窗口 1 分钟，运营可接受，不额外挂 @CacheEvict。</p>
     *
     * <p>结果为 null 或空列表时不缓存（unless 条件），避免缓存穿透。
     * 注意：filter 筛选在调用方（RealRecommendationService）内存执行，
     * 本方法不含 filter 参数保证缓存 key 单一。</p>
     *
     * @return 游客推荐人物视图列表
     */
    @Cacheable(cacheNames = CacheNames.GUEST_RECOMMEND, key = "'guest:v1'",
            unless = "#result == null || #result.isEmpty()")
    public List<RecommendedPersonView> getCachedGuestRecommendations() {
        long startNanos = System.nanoTime();
        try {
            // 游客无个人上下文：中性排序（活跃度加分），与登录链路同实现保证字段口径一致
            RecommendationStrategy.RecommendResult result = recommendationStrategy.doRecommendForGuest();
            // 2026-08-12 Redis 序列化修复：外层 List 必须返回可变 ArrayList——
            // rankAndConvert 返回 Stream.toList()（ImmutableCollections$ListN，final 类），
            // Jackson default typing（NON_FINAL）不为 final 类型写类型信息 →
            // 缓存值无外层类型名 → 反序列化 List.class 报
            // "Unexpected token (START_OBJECT), expected VALUE_STRING" → 缓存命中失败
            // → 每次全量重算（游客接口 300ms+ 卡顿根因，已用单测复现）
            return new java.util.ArrayList<>(recommendationRanker.rankAndConvert(result, null));
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
