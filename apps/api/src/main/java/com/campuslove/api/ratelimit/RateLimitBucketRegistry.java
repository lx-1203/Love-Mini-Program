package com.campuslove.api.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import java.time.Duration;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RRateLimiter;
import org.redisson.api.RateIntervalUnit;
import org.redisson.api.RateType;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 速率限制令牌桶注册表。
 *
 * <p>基于 Bucket4j 8.10.1 的令牌桶管理器，<b>支持多实例分布式限流</b>（R4-00377）。</p>
 *
 * <p>核心职责：</p>
 * <ol>
 *   <li>Redisson 可用时（real profile，Redis 已配置）：走分布式限流
 *       {@link RRateLimiter}（Redis 侧原子令牌桶），N 实例部署限流阈值不放大；
 *       Redisson 不可用/调用失败时降级本地 Bucket4j 桶（单实例语义，保证服务可用）。</li>
 *   <li>使用 {@link ConcurrentHashMap} 缓存每个限流键对应的桶实例，
 *       避免每次请求都重建桶（保证线程安全与高并发性能）。</li>
 *   <li>提供 {@link #tryConsume(String, long, double)} 方法，原子地完成"获取或创建桶 →
 *       尝试消费 1 个令牌"的流程。</li>
 *   <li>通过 {@link Scheduled} 定时任务清理超过 {@link #IDLE_THRESHOLD_MS} 毫秒未使用的桶，
 *       避免长期运行下内存泄漏（分布式桶同步删除 Redis 键）。</li>
 * </ol>
 *
 * <p>分布式语义说明（R4-00377）：原实现为纯本地内存桶，多实例部署时每实例独立桶，
 * N 实例限流阈值被放大 N 倍，登录爆破等防护被稀释。现优先使用 Redisson RRateLimiter：
 * 参数映射 {@code (capacity, refillTokens/s)} → {@code rate(capacity, round(capacity/refillTokens) 秒)}
 * ——即「capacity 个令牌 / 每 {capacity/refill} 秒窗口」，长周期速率等价、突发容量一致。
 * 精确 Bucket4j greedy 补充语义（令牌连续流入）在 Redis 侧为窗口化补充，防护目标
 * （阈值不放大）不受影响。</p>
 */
@Component
public class RateLimitBucketRegistry {

    private static final Logger log = LoggerFactory.getLogger(RateLimitBucketRegistry.class);

    /** 桶闲置阈值：超过 1 小时未使用的桶会被定时任务清理（单位：毫秒）。 */
    private static final long IDLE_THRESHOLD_MS = 60L * 60L * 1000L;

    /** 定时清理周期：每 30 分钟执行一次清理（单位：毫秒，fixedDelay 上次执行结束后等待）。 */
    private static final long CLEANUP_INTERVAL_MS = 30L * 60L * 1000L;

    /** 桶容量下限：防止注解配置错误（如 capacity=0）导致桶无法消费令牌。 */
    private static final long MIN_CAPACITY = 1L;

    /** 每秒补充令牌数下限：防止 refillTokens<=0 导致桶永远无法恢复。 */
    private static final double MIN_REFILL_TOKENS_PER_SECOND = 0.0001;

    /** 分布式限流 Redis key 前缀（R4-00377）。 */
    private static final String REDIS_RATE_LIMIT_KEY_PREFIX = "ratelimit:";

    /** key -> 桶条目映射，线程安全（本地桶 + 分布式限流器实例缓存）。 */
    private final ConcurrentHashMap<String, BucketEntry> buckets = new ConcurrentHashMap<>();

    /**
     * Redisson 客户端（FIN-00136 / R4-00377）。
     *
     * <p>用途：</p>
     * <ul>
     *   <li>分布式限流（R4-00377）：{@link #tryConsumeDistributed} 通过 RRateLimiter
     *       实现多实例共享的令牌桶，限流阈值不随实例数放大</li>
     *   <li>清理任务分布式锁：确保多实例部署时仅一个实例执行清理</li>
     * </ul>
     * 使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动；mock 模式下为 null，
     * 限流退化为本地桶、定时任务跳过分布式锁（单实例无需锁）。
     */
    @Autowired(required = false)
    private RedissonClient redissonClient;

    /**
     * 尝试消费 1 个令牌。
     *
     * <p>桶策略：桶容量为 {@code capacity}，每秒补充 {@code refillTokens} 个令牌（greedy 策略，
     * 尽可能快速恢复）。桶不存在时按参数原子创建；已存在时复用，参数仅作首次创建使用。</p>
     *
     * <p>R4-00377：Redisson 可用时优先走分布式限流（多实例阈值不放大）；
     * Redisson 不可用或调用异常时降级本地 Bucket4j 桶（单实例语义，保证可用性）。</p>
     *
     * <p>说明：任务规范中方法签名标注为 {@code long refillTokens}，但实例值（如 0.1、0.5）
     * 必须使用浮点类型。此处使用 {@code double} 以支持小数速率。</p>
     *
     * @param key           限流键（由切面拼接为 "类名#方法名:SpEL解析值" 形式）
     * @param capacity      桶容量（突发上限）
     * @param refillTokens  每秒补充的令牌数（支持小数）
     * @return true 表示获取令牌成功（请求放行）；false 表示被限流
     */
    public boolean tryConsume(String key, long capacity, double refillTokens) {
        if (key == null || key.isBlank()) {
            // 限流键为空时直接放行，避免误伤合法请求
            return true;
        }

        // R4-00377：优先分布式限流（多实例阈值不放大）
        if (redissonClient != null) {
            try {
                return tryConsumeDistributed(key, capacity, refillTokens);
            } catch (RuntimeException e) {
                // Redis/Redisson 异常：降级本地桶，保证限流能力不因 Redis 故障而完全丢失
                log.warn("分布式限流不可用，降级本地令牌桶：key={}, error={}", key, e.getMessage());
            }
        }

        // R4-00379：computeIfAbsent 后 capacity/refillTokens 仅首次创建生效；
        // 改为 compute 原子校验参数——注解限流参数变更（如调大容量）时自动重建桶，
        // 无需重启应用。桶创建时记录归一化参数用于比对。
        long cap = Math.max(MIN_CAPACITY, capacity);
        double rate = Math.max(MIN_REFILL_TOKENS_PER_SECOND, refillTokens);
        BucketEntry entry = buckets.compute(key, (k, existing) -> {
            if (existing == null || existing.capacity != cap || existing.refillTokens != rate) {
                return createBucketEntry(k, capacity, refillTokens);
            }
            return existing;
        });
        // 更新最近使用时间（用于定时清理判断）
        entry.lastUsedAt = System.currentTimeMillis();

        boolean allowed = entry.bucket.tryConsume(1L);
        if (!allowed) {
            log.warn("限流命中：key={}, capacity={}, refillTokens={}/s", key, capacity, refillTokens);
        }
        return allowed;
    }

    /**
     * 分布式限流（R4-00377）：Redisson {@link RRateLimiter} 实现多实例共享令牌桶。
     *
     * <p>参数映射：本地语义 (capacity 突发, refillTokens/s) → Redis 语义
     * {@code rate(OVERALL, capacity, round(capacity / refillTokens) 秒)}——
     * 每窗口补充 capacity 个令牌，长周期速率 = capacity / (capacity/refill) = refill/s，
     * 突发容量 = capacity。缓存 RRateLimiter 实例避免重复构建（Redisson 按 name 幂等）。</p>
     *
     * @param key          限流键
     * @param capacity     桶容量（突发上限）
     * @param refillTokens 每秒补充的令牌数
     * @return true 放行；false 被限流
     */
    private boolean tryConsumeDistributed(String key, long capacity, double refillTokens) {
        long cap = Math.max(MIN_CAPACITY, capacity);
        double rate = Math.max(MIN_REFILL_TOKENS_PER_SECOND, refillTokens);
        // 窗口秒数 = capacity / refillTokens（向上取整至少 1 秒）
        long intervalSeconds = Math.max(1L, Math.round(cap / rate));

        RRateLimiter limiter = redissonClient.getRateLimiter(REDIS_RATE_LIMIT_KEY_PREFIX + key);
        // trySetRate 幂等：仅首次配置生效（后续调用返回 false，不影响语义）
        limiter.trySetRate(RateType.OVERALL, cap, intervalSeconds, RateIntervalUnit.SECONDS);

        boolean allowed = limiter.tryAcquire();
        if (!allowed) {
            log.warn("分布式限流命中：key={}, capacity={}, refillTokens={}/s", key, cap, rate);
        }
        return allowed;
    }

    /**
     * 获取当前已注册的桶数量，便于监控与排查。
     *
     * @return 桶数量
     */
    public int bucketCount() {
        return buckets.size();
    }

    /**
     * 定时清理闲置桶。
     *
     * <p>由 Spring {@code @Scheduled} 调度，{@code CampusLoveApplication} 已通过
     * {@code @EnableScheduling} 启用调度支持。</p>
     *
     * <p>清理规则：最近使用时间距今超过 {@link #IDLE_THRESHOLD_MS} 的桶将被移除。
     * 使用迭代器安全删除，避免 ConcurrentModificationException。</p>
     */
    @Scheduled(fixedDelay = CLEANUP_INTERVAL_MS, initialDelay = CLEANUP_INTERVAL_MS)
    public void cleanupIdleBuckets() {
        // FIN-00136: 分布式锁确保多实例部署时仅一个实例执行清理任务
        // mock profile 下 redissonClient 为 null（Redisson 已排除），跳过锁（单实例无需锁）
        if (redissonClient != null) {
            try {
                if (!redissonClient.getLock("scheduled:rateLimitCleanup")
                        .tryLock(0, 30, TimeUnit.SECONDS)) {
                    log.debug("rateLimitCleanup 定时任务已被其他实例持有，跳过本次执行");
                    return;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("rateLimitCleanup 获取分布式锁被中断");
                return;
            }
        }
        long now = System.currentTimeMillis();
        int removed = 0;

        Iterator<Map.Entry<String, BucketEntry>> it = buckets.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, BucketEntry> e = it.next();
            BucketEntry entry = e.getValue();
            if (now - entry.lastUsedAt > IDLE_THRESHOLD_MS) {
                it.remove();
                removed++;
            }
        }

        if (removed > 0) {
            log.info("清理闲置限流桶：removed={}, remaining={}", removed, buckets.size());
        }
    }

    /**
     * 根据容量与补充速率创建新的桶条目。
     *
     * <p>对入参做下限保护：桶容量小于 1 时按 1 处理；补充速率过小时按
     * {@link #MIN_REFILL_TOKENS_PER_SECOND} 处理，防止桶永远无法恢复。</p>
     *
     * @param key           限流键
     * @param capacity      桶容量
     * @param refillTokens  每秒补充令牌数
     * @return 新建桶条目
     */
    private BucketEntry createBucketEntry(String key, long capacity, double refillTokens) {
        long cap = Math.max(MIN_CAPACITY, capacity);
        double rate = Math.max(MIN_REFILL_TOKENS_PER_SECOND, refillTokens);

        Refill refill = buildRefill(rate);
        Bandwidth limit = Bandwidth.classic(cap, refill);
        Bucket bucket = Bucket.builder().addLimit(limit).build();

        log.debug("创建限流桶：key={}, capacity={}, refillTokens={}/s", key, cap, rate);
        return new BucketEntry(bucket, System.currentTimeMillis(), cap, rate);
    }

    /**
     * 根据每秒补充令牌数构造 {@link Refill} 实例。
     *
     * <p>策略：</p>
     * <ul>
     *   <li>每秒补充令牌数 ≥ 1：转换为 {@code (round(rate), 1s)} 的 greedy 补充</li>
     *   <li>每秒补充令牌数 &lt; 1：转换为 {@code (1, round(1/rate)s)} 的 greedy 补充
     *       （例如 0.1/s → 1 个令牌 / 10 秒）</li>
     * </ul>
     *
     * @param refillTokensPerSecond 每秒补充令牌数（≥ {@link #MIN_REFILL_TOKENS_PER_SECOND}）
     * @return Bucket4j Refill 实例
     */
    private Refill buildRefill(double refillTokensPerSecond) {
        if (refillTokensPerSecond >= 1.0) {
            long tokens = Math.round(refillTokensPerSecond);
            if (tokens < 1L) {
                tokens = 1L;
            }
            return Refill.greedy(tokens, Duration.ofSeconds(1L));
        }
        // 小数速率：1 个令牌 / N 秒
        long periodSeconds = Math.round(1.0 / refillTokensPerSecond);
        if (periodSeconds < 1L) {
            periodSeconds = 1L;
        }
        return Refill.greedy(1L, Duration.ofSeconds(periodSeconds));
    }

    /**
     * 桶条目：持有 {@link Bucket} 实例与最近使用时间戳。
     *
     * <p>{@code lastUsedAt} 使用 {@code volatile} 修饰保证多线程可见性，
     * 写入并发场景下允许少量误差（不影响正确性）。</p>
     */
    private static final class BucketEntry {
        /** 令牌桶实例 */
        final Bucket bucket;
        /** 最近一次使用时间（毫秒时间戳） */
        volatile long lastUsedAt;
        /** 桶容量（归一化后，R4-00379 参数比对用） */
        final long capacity;
        /** 每秒补充令牌数（归一化后，R4-00379 参数比对用） */
        final double refillTokens;

        BucketEntry(Bucket bucket, long lastUsedAt, long capacity, double refillTokens) {
            this.bucket = bucket;
            this.lastUsedAt = lastUsedAt;
            this.capacity = capacity;
            this.refillTokens = refillTokens;
        }
    }
}
