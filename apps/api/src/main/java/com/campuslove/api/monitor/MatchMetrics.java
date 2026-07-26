package com.campuslove.api.monitor;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 匹配业务监控指标。
 *
 * <p>基于 Micrometer 注册业务指标，配合 micrometer-registry-prometheus
 * 暴露到 /actuator/prometheus 端点，供 Prometheus + Grafana 进行监控可视化。</p>
 *
 * <p>指标说明：</p>
 * <ul>
 *   <li>{@code match.swipe.total}：滑动操作计数（标签 direction=like/super_like/dislike）</li>
 *   <li>{@code match.success.count}：互相喜欢（成功匹配）次数</li>
 *   <li>{@code match.recommend.latency}：推荐算法耗时（Timer，支持百分位统计）</li>
 * </ul>
 *
 * <p>容错策略：所有指标记录方法均使用 try-catch 包裹，失败时只记录日志不抛出异常，
 * 避免监控逻辑影响主业务流程。</p>
 */
@Component
public class MatchMetrics {

    private static final Logger log = LoggerFactory.getLogger(MatchMetrics.class);

    /** 滑动操作计数器指标名 */
    private static final String METRIC_SWIPE_TOTAL = "match.swipe.total";
    /** 互相喜欢成功计数器指标名 */
    private static final String METRIC_MATCH_SUCCESS = "match.success.count";
    /** 推荐算法耗时计时器指标名 */
    private static final String METRIC_RECOMMEND_LATENCY = "match.recommend.latency";

    /** 滑动方向标签 key */
    private static final String TAG_DIRECTION = "direction";

    private final MeterRegistry meterRegistry;

    /** 喜欢（右滑）计数器 */
    private final Counter likeCounter;
    /** 超级喜欢计数器 */
    private final Counter superLikeCounter;
    /** 不喜欢（左滑）计数器 */
    private final Counter dislikeCounter;
    /** 互相喜欢成功计数器 */
    private final Counter matchSuccessCounter;
    /** 推荐耗时计时器 */
    private final Timer recommendLatencyTimer;

    public MatchMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        // 初始化各方向滑动计数器，direction 标签区分操作类型
        this.likeCounter = Counter.builder(METRIC_SWIPE_TOTAL)
                .tag(TAG_DIRECTION, "like")
                .description("用户滑动操作总数（按方向区分）")
                .register(meterRegistry);
        this.superLikeCounter = Counter.builder(METRIC_SWIPE_TOTAL)
                .tag(TAG_DIRECTION, "super_like")
                .description("用户滑动操作总数（按方向区分）")
                .register(meterRegistry);
        this.dislikeCounter = Counter.builder(METRIC_SWIPE_TOTAL)
                .tag(TAG_DIRECTION, "dislike")
                .description("用户滑动操作总数（按方向区分）")
                .register(meterRegistry);
        // 互相喜欢成功计数器
        this.matchSuccessCounter = Counter.builder(METRIC_MATCH_SUCCESS)
                .description("互相喜欢（成功匹配）次数")
                .register(meterRegistry);
        // 推荐算法耗时计时器，发布百分位（p50/p95/p99）
        this.recommendLatencyTimer = Timer.builder(METRIC_RECOMMEND_LATENCY)
                .description("推荐算法单次调用耗时")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry);
    }

    /**
     * 记录一次滑动操作。
     * 根据 direction 增加对应方向的计数器。
     *
     * @param direction 滑动方向：like / super_like / dislike
     */
    public void recordSwipe(String direction) {
        try {
            if (direction == null) {
                return;
            }
            switch (direction) {
                case "like" -> likeCounter.increment();
                case "super_like" -> superLikeCounter.increment();
                case "dislike" -> dislikeCounter.increment();
                default -> log.debug("未识别的 swipe direction: {}", direction);
            }
        } catch (Exception e) {
            // 监控逻辑失败不影响主流程，仅记录日志
            log.warn("记录 match.swipe.total 指标失败, direction={}: {}", direction, e.getMessage());
        }
    }

    /**
     * 记录一次互相喜欢（匹配成功）。
     */
    public void recordMatchSuccess() {
        try {
            matchSuccessCounter.increment();
        } catch (Exception e) {
            log.warn("记录 match.success.count 指标失败: {}", e.getMessage());
        }
    }

    /**
     * 记录一次推荐算法调用耗时。
     *
     * @param durationMs 耗时（毫秒）
     */
    public void recordRecommendLatency(long durationMs) {
        try {
            // 使用 Duration 包装毫秒值，避免负数或溢出问题
            recommendLatencyTimer.record(Duration.ofMillis(Math.max(0, durationMs)));
        } catch (Exception e) {
            log.warn("记录 match.recommend.latency 指标失败, durationMs={}: {}", durationMs, e.getMessage());
        }
    }
}
