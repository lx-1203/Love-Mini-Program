package com.campuslove.api.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import java.time.Duration;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 速率限制令牌桶注册表。
 *
 * <p>基于 Bucket4j 8.10.1 实现的本地内存令牌桶管理器。</p>
 *
 * <p>核心职责：</p>
 * <ol>
 *   <li>使用 {@link ConcurrentHashMap} 缓存每个限流键对应的 {@link Bucket} 实例，
 *       避免每次请求都重建桶（保证线程安全与高并发性能）。</li>
 *   <li>提供 {@link #tryConsume(String, long, double)} 方法，原子地完成"获取或创建桶 →
 *       尝试消费 1 个令牌"的流程。</li>
 *   <li>通过 {@link Scheduled} 定时任务清理超过 {@link #IDLE_THRESHOLD_MS} 毫秒未使用的桶，
 *       避免长期运行下内存泄漏。</li>
 * </ol>
 *
 * <p>注意：当前实现基于本地内存，适用于单实例部署。多实例场景下应替换为
 * Bucket4j + Redis 分布式令牌桶方案。</p>
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

    /** key -> 桶条目映射，线程安全。 */
    private final ConcurrentHashMap<String, BucketEntry> buckets = new ConcurrentHashMap<>();

    /**
     * Redisson 分布式锁客户端（FIN-00136）。
     *
     * <p>用于 {@link #cleanupIdleBuckets()} 定时任务的分布式锁，
     * 确保多实例部署时仅一个实例执行清理，避免重复扫描与数据竞争。
     * 使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动；mock 模式下为 null，
     * 定时任务跳过分布式锁（单实例无需锁）。</p>
     */
    @Autowired(required = false)
    private RedissonClient redissonClient;

    /**
     * 尝试消费 1 个令牌。
     *
     * <p>桶策略：桶容量为 {@code capacity}，每秒补充 {@code refillTokens} 个令牌（greedy 策略，
     * 尽可能快速恢复）。桶不存在时按参数原子创建；已存在时复用，参数仅作首次创建使用。</p>
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

        BucketEntry entry = buckets.computeIfAbsent(key, k -> createBucketEntry(k, capacity, refillTokens));
        // 更新最近使用时间（用于定时清理判断）
        entry.lastUsedAt = System.currentTimeMillis();

        boolean allowed = entry.bucket.tryConsume(1L);
        if (!allowed) {
            log.warn("限流命中：key={}, capacity={}, refillTokens={}/s", key, capacity, refillTokens);
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
        return new BucketEntry(bucket, System.currentTimeMillis());
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

        BucketEntry(Bucket bucket, long lastUsedAt) {
            this.bucket = bucket;
            this.lastUsedAt = lastUsedAt;
        }
    }
}
