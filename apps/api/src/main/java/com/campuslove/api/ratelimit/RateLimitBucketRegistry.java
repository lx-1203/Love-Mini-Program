package com.campuslove.api.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RRateLimiter;
import org.redisson.api.RateIntervalUnit;
import org.redisson.api.RateType;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
 *       Redis 调用失败时按<b>端点类别</b>降级（见下"Redis 故障降级"），
 *       而不是无脑退化成本地桶。</li>
 *   <li>使用 {@link ConcurrentHashMap} 缓存每个限流键对应的桶实例 /
 *       分布式限流器配置，避免每次请求都重建。</li>
 *   <li>提供 {@link #tryConsume(String, long, double)} 方法，原子地完成
 *       "获取或创建桶 → 尝试消费 1 个令牌"的流程。</li>
 *   <li>通过 {@link Scheduled} 定时任务清理超过闲置阈值的桶，
 *       <b>并同步删除 Redis 侧的 {@code ratelimit:*} 键</b>（{@link #cleanupIdleBuckets()}）。</li>
 * </ol>
 *
 * <h2>Redis 故障降级（2026-10-31 限流轨 P1，缺陷 3-①）</h2>
 * <p>旧实现任何 Redis 异常都 {@code catch → 落本地桶}。本地桶是<b>每实例</b>的，
 * 于是 Redis 挂掉时有效限额被<b>乘以副本数</b>（N 副本 = N 倍配额）——
 * 恰好把攻击面打开在"多副本 + 故障"这个最坏组合上，而且钱类端点（支付/VIP/钱包/短信）
 * 本该在限流失效时宁可拒绝也不该放行。</p>
 * <p>现策略由 {@code app.security.rate-limit.redis-outage-policy} 决定：</p>
 * <ul>
 *   <li>{@code LOCAL}——保持旧行为（每实例本地桶，限额随副本放大），仅供排障回退；</li>
 *   <li>{@code FAIL_OPEN}——直接放行（限流失效但不误伤）；</li>
 *   <li>{@code FAIL_CLOSED}——直接拒绝（429）；</li>
 *   <li>{@code BY_ENDPOINT_CLASS}（<b>默认</b>）——按桶键前缀分流：
 *       钱/凭据类（{@code app.security.rate-limit.critical-key-prefixes}，默认含
 *       Billing/VipOrder/AutoRenew/PromoCode/Wallet/Sms/Auth/实名认证等）⇒ FAIL_CLOSED；
 *       信息类（浏览、点赞、搜索、看板等）⇒ LOCAL（可用性优先，接受副本放大）。</li>
 * </ul>
 * <p>这条取舍本质上是运维决定，不是可以证明的定理，所以做成配置项而不是硬编码；
 * 无论走哪条分支都打 <b>ERROR</b> 日志（旧实现只有 WARN，故障期间等于没有信号）。</p>
 *
 * <h2>速率参数变更必须生效（缺陷 3-②）</h2>
 * <p>{@code RRateLimiter.trySetRate} 是幂等的——<b>只对不存在的键生效</b>。旧实现用
 * {@code ratelimit:<桶键>} 作 Redis 键，注解改了 capacity/refillTokens 之后
 * Redis 里那份旧速率会永久存活（本地桶路径在 R4-00379 已修过同一问题，分布式路径漏了）。
 * 现在 Redis 键名带上速率指纹（{@code #v<capacity>-<窗口秒>s}）：参数一变就是新键、
 * 新键用新速率 {@code trySetRate}，旧键在检测变更后与闲置清理时各删一次。</p>
 *
 * <h2>Redis 键泄漏（缺陷 3-③）</h2>
 * <p>类文档曾声称"分布式桶同步删除 Redis 键"，但代码里没有任何 {@code delete()}
 * 调用，{@code ratelimit:*} 只增不减（RRateLimiter 的键不带 TTL）。
 * 现在 {@link #cleanupIdleBuckets()} 对本地桶与分布式限流器分别清理，
 * 分布式条目闲置超过 {@code max(IDLE_THRESHOLD_MS, 2×速率窗口)} 时调用
 * {@code limiter.delete()}。残余风险：进程重启会丢失内存里的键登记，
 * 重启前那一刻仍存活的键不会被删除——需要真实 Redis 环境验证（本轮未验证）。</p>
 *
 * <p>分布式语义说明（R4-00377）：参数映射 {@code (capacity, refillTokens/s)} →
 * {@code rate(capacity, round(capacity/refillTokens) 秒)}——即「capacity 个令牌 /
 * 每 {capacity/refill} 秒窗口」，长周期速率等价、突发容量一致。
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

    /**
     * 默认的钱/凭据类桶键前缀（{@code BY_ENDPOINT_CLASS} 策略下 Redis 故障时 FAIL_CLOSED）。
     * 判据是"放过一次能直接换来钱、凭据或真实费用"，浏览类一律不算。
     */
    static final Set<String> DEFAULT_CRITICAL_PREFIXES = Set.of(
            "BillingController#", "VipOrderController#", "AutoRenewController#",
            "PromoCodeController#", "WalletController#", "SmsCodeController#",
            "AuthController#", "WechatAuthController#", "ThirdPartyAuthController#",
            "RealNameCertificationController#", "LoveVerificationController#");

    /** key -> 本地令牌桶条目映射，线程安全。 */
    private final ConcurrentHashMap<String, BucketEntry> buckets = new ConcurrentHashMap<>();

    /** key -> 分布式限流器条目（Redis 键名 + 速率指纹 + 最近使用时间），用于清理与变更检测。 */
    private final ConcurrentHashMap<String, DistributedEntry> distributedEntries =
            new ConcurrentHashMap<>();

    /**
     * Redisson 客户端（FIN-00136 / R4-00377）。
     *
     * <p>用途：</p>
     * <ul>
     *   <li>分布式限流（R4-00377）：{@link #tryConsumeDistributed} 通过 RRateLimiter
     *       实现多实例共享的令牌桶，限流阈值不随实例数放大</li>
     *   <li>清理任务分布式锁：确保多实例部署时仅一个实例执行清理</li>
     *   <li>清理时删除 Redis 侧 {@code ratelimit:*} 键（缺陷 3-③）</li>
     * </ul>
     * 使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动；mock 模式下为 null，
     * 限流退化为本地桶、定时任务跳过分布式锁（单实例无需锁）。
     */
    @Autowired(required = false)
    private RedissonClient redissonClient;

    /**
     * Redis 故障降级策略（{@code app.security.rate-limit.redis-outage-policy}）。
     * 取值见类注释；非法值按 {@code BY_ENDPOINT_CLASS} 处理并打 ERROR。
     * 字段注入（非构造参数）以保持 {@code new RateLimitBucketRegistry()} 的测试构造方式；
     * 手工 new 出来的实例（单测）走默认值 {@code BY_ENDPOINT_CLASS}。
     */
    @Value("${app.security.rate-limit.redis-outage-policy:BY_ENDPOINT_CLASS}")
    private String redisOutagePolicyRaw = OutagePolicy.BY_ENDPOINT_CLASS.name();

    /**
     * 钱/凭据类桶键前缀（{@code app.security.rate-limit.critical-key-prefixes}，逗号分隔）。
     * 空串 = 不使用 {@link #DEFAULT_CRITICAL_PREFIXES}，即 {@code BY_ENDPOINT_CLASS}
     * 下全部端点按 LOCAL 降级（显式放宽时才有意义）。
     */
    @Value("${app.security.rate-limit.critical-key-prefixes:}")
    private String criticalKeyPrefixesRaw = "";

    /** 解析后的钱类前缀集合（懒解析 + 原文变更时重解析）。 */
    private volatile String parsedPrefixSource;
    private volatile Set<String> criticalPrefixes = DEFAULT_CRITICAL_PREFIXES;

    /**
     * Redis 故障时的降级动作枚举（缺陷 3-①）。
     */
    enum OutagePolicy {
        /** 落每实例本地桶：限额随副本数放大（旧行为，仅供回退排障）。 */
        LOCAL,
        /** 放行：限流彻底失效，但绝不误伤真实用户。 */
        FAIL_OPEN,
        /** 拒绝（→ HTTP 429）：宁可误伤也不放过超额流量。 */
        FAIL_CLOSED,
        /** 按桶键前缀分流：钱/凭据类拒绝，信息类落本地桶。 */
        BY_ENDPOINT_CLASS
    }

    /**
     * 尝试消费 1 个令牌。
     *
     * <p>桶策略：桶容量为 {@code capacity}，每秒补充 {@code refillTokens} 个令牌（greedy 策略，
     * 尽可能快速恢复）。桶不存在时按参数原子创建；参数变化时<b>重建</b>（R4-00379，
     * 分布式侧对应速率指纹键名，见类注释）。</p>
     *
     * <p>R4-00377：Redisson 可用时优先走分布式限流（多实例阈值不放大）；
     * Redis 调用异常时按 {@code redis-outage-policy} 决定降级动作（缺陷 3-①）。</p>
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
                // 缺陷 3-①：降级方向必须显式选择，且必须是 ERROR 级信号
                OutagePolicy action = outageAction(key);
                log.error("分布式限流不可用，按策略降级：policy={}, key={}, capacity={},"
                        + " refillTokens={}/s, error={}（多副本部署下 LOCAL 会让限额乘以副本数，"
                        + " 详见类注释 Redis 故障降级一节）",
                        action, key, capacity, refillTokens, e.toString());
                if (action == OutagePolicy.FAIL_CLOSED) {
                    return false;
                }
                if (action == OutagePolicy.FAIL_OPEN) {
                    return true;
                }
                // LOCAL / BY_ENDPOINT_CLASS 的非钱类：继续落本地桶
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
     * 突发容量 = capacity。</p>
     *
     * <p>缺陷 3-②：Redis 键名带速率指纹（{@link #redisKeyFor}），注解参数一变即换键，
     * 规避 {@code trySetRate} 幂等导致的"旧速率永久存活"。</p>
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
        String redisKey = redisKeyFor(key, cap, intervalSeconds);

        DistributedEntry entry = distributedEntries.compute(key, (k, existing) -> {
            if (existing == null) {
                return new DistributedEntry(redisKey, cap, rate, System.currentTimeMillis());
            }
            if (existing.capacity != cap || existing.refillTokens != rate
                    || !existing.redisKey.equals(redisKey)) {
                // 速率参数变更：删掉旧指纹键，返回新指纹条目
                if (!existing.redisKey.equals(redisKey)) {
                    deleteRedisKeyQuietly(existing.redisKey);
                }
                return new DistributedEntry(redisKey, cap, rate, System.currentTimeMillis());
            }
            return existing;
        });
        entry.lastUsedAt = System.currentTimeMillis();

        RRateLimiter limiter = redissonClient.getRateLimiter(redisKey);
        // trySetRate 幂等：仅对该 Redis 键的首次创建生效——键名含速率指纹，
        // 所以"注解改了但旧速率不生效"不可能再发生（缺陷 3-②）。
        limiter.trySetRate(RateType.OVERALL, cap, intervalSeconds, RateIntervalUnit.SECONDS);

        boolean allowed = limiter.tryAcquire();
        if (!allowed) {
            log.warn("分布式限流命中：key={}, redisKey={}, capacity={}, refillTokens={}/s",
                    key, redisKey, cap, rate);
        }
        return allowed;
    }

    /**
     * 构造带速率指纹的 Redis 键名（缺陷 3-②）。
     *
     * <p>包内可见 + 静态：单测直接断言"capacity 或窗口变化 ⇒ 键名变化"。</p>
     *
     * @param bucketKey        业务桶键（类名#方法名:解析值）
     * @param capacity         归一化后的桶容量
     * @param intervalSeconds  归一化后的补充窗口（秒）
     * @return Redis 键名
     */
    static String redisKeyFor(String bucketKey, long capacity, long intervalSeconds) {
        return REDIS_RATE_LIMIT_KEY_PREFIX + bucketKey + "#v" + capacity + "-" + intervalSeconds + "s";
    }

    /**
     * 获取当前已注册的桶数量，便于监控与排查。
     *
     * <p>包含本地桶与分布式限流器条目两类，便于运维观测桶规模
     * （异常增长通常意味着 SpEL 降级或客户端 IP 抖动导致每请求新建桶）。</p>
     *
     * @return 桶数量
     */
    public int bucketCount() {
        return buckets.size() + distributedEntries.size();
    }

    /**
     * 定时清理闲置桶。
     *
     * <p>由 Spring {@code @Scheduled} 调度，{@code CampusLoveApplication} 已通过
     * {@code @EnableScheduling} 启用调度支持。</p>
     *
     * <p>清理规则（缺陷 3-③）：</p>
     * <ul>
     *   <li>本地桶：闲置超过 {@link #IDLE_THRESHOLD_MS} 移除 map 条目；</li>
     *   <li>分布式限流器：闲置超过 {@code max(IDLE_THRESHOLD_MS, 2×速率窗口)}
     *       时<b>同时删除 Redis 键</b>（{@code limiter.delete()}）并移除 map 条目，
     *       避免 {@code ratelimit:*} 无 TTL 堆积。阈值含 2×窗口是为了绝不删除
     *       仍在计窗口的活跃桶。</li>
     * </ul>
     */
    @Scheduled(fixedDelay = CLEANUP_INTERVAL_MS, initialDelay = CLEANUP_INTERVAL_MS)
    public void cleanupIdleBuckets() {
        // FIN-00136: 分布式锁确保多实例部署时仅一个实例执行清理任务
        // mock profile 下 redissonClient 为 null（Redisson 已排除），跳过锁（单实例无需锁）
        boolean lockHeld = false;
        if (redissonClient != null) {
            try {
                if (!redissonClient.getLock("scheduled:rateLimitCleanup")
                        .tryLock(0, 30, TimeUnit.SECONDS)) {
                    log.debug("rateLimitCleanup 定时任务已被其他实例持有，跳过本次执行");
                    return;
                }
                lockHeld = true;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("rateLimitCleanup 获取分布式锁被中断");
                return;
            } catch (RuntimeException e) {
                // Redis 不可用时本地桶仍需要回收，不能因为拿不到锁就整体跳过
                log.error("rateLimitCleanup 获取分布式锁失败，仅清理本实例本地桶：error={}",
                        e.toString());
            }
        }
        long now = System.currentTimeMillis();
        int removedLocal = 0;
        int removedDistributed = 0;

        Iterator<Map.Entry<String, BucketEntry>> it = buckets.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, BucketEntry> e = it.next();
            BucketEntry entry = e.getValue();
            if (now - entry.lastUsedAt > IDLE_THRESHOLD_MS) {
                it.remove();
                removedLocal++;
            }
        }

        if (redissonClient != null) {
            Iterator<Map.Entry<String, DistributedEntry>> dit = distributedEntries.entrySet().iterator();
            while (dit.hasNext()) {
                Map.Entry<String, DistributedEntry> e = dit.next();
                DistributedEntry entry = e.getValue();
                long threshold = Math.max(IDLE_THRESHOLD_MS, entry.windowSeconds() * 2000L);
                if (now - entry.lastUsedAt > threshold) {
                    dit.remove();
                    deleteRedisKey(entry.redisKey);
                    removedDistributed++;
                }
            }
        }

        if (removedLocal > 0 || removedDistributed > 0) {
            log.info("清理闲置限流桶：localRemoved={}, redisKeysDeleted={},"
                            + " remainingLocal={}, remainingDistributed={}",
                    removedLocal, removedDistributed, buckets.size(), distributedEntries.size());
        }
        if (lockHeld) {
            try {
                redissonClient.getLock("scheduled:rateLimitCleanup").unlock();
            } catch (RuntimeException e) {
                log.debug("rateLimitCleanup 释放分布式锁异常（可能已超时释放）：{}", e.toString());
            }
        }
    }

    /**
     * 删除 Redis 侧限流键（缺陷 3-③）。失败只记日志——清理任务不得因为一次
     * Redis 异常而中断整轮清理。
     */
    private void deleteRedisKey(String redisKey) {
        try {
            redissonClient.getRateLimiter(redisKey).delete();
        } catch (RuntimeException e) {
            log.error("删除闲置分布式限流 Redis 键失败（ratelimit:* 会继续堆积）：key={},"
                    + " error={}", redisKey, e.toString());
        }
    }

    /** 速率参数变更时删除旧指纹键。 */
    private void deleteRedisKeyQuietly(String redisKey) {
        try {
            redissonClient.getRateLimiter(redisKey).delete();
            log.info("限流速率参数变更，已删除旧 Redis 键：key={}", redisKey);
        } catch (RuntimeException e) {
            log.warn("限流速率参数变更后删除旧 Redis 键失败（旧键将按闲置阈值被清理）："
                    + "key={}, error={}", redisKey, e.toString());
        }
    }

    /**
     * 解析 Redis 故障时对指定桶键采取的降级动作（缺陷 3-①）。
     *
     * @param bucketKey 业务桶键
     * @return 实际动作（只会是 LOCAL / FAIL_OPEN / FAIL_CLOSED 之一）
     */
    OutagePolicy outageAction(String bucketKey) {
        OutagePolicy configured = parsePolicy(redisOutagePolicyRaw);
        return switch (configured) {
            case LOCAL, FAIL_OPEN, FAIL_CLOSED -> configured;
            case BY_ENDPOINT_CLASS -> isCriticalBucket(bucketKey)
                    ? OutagePolicy.FAIL_CLOSED : OutagePolicy.LOCAL;
        };
    }

    /** 桶键是否属于钱/凭据类（按配置的类名前缀匹配）。 */
    boolean isCriticalBucket(String bucketKey) {
        Set<String> prefixes = currentCriticalPrefixes();
        if (bucketKey == null || bucketKey.isBlank()) {
            return false;
        }
        for (String prefix : prefixes) {
            if (bucketKey.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    /** 懒解析钱类前缀配置（配置原文变化时重解析）。 */
    private Set<String> currentCriticalPrefixes() {
        String source = criticalKeyPrefixesRaw == null ? "" : criticalKeyPrefixesRaw;
        if (!source.equals(parsedPrefixSource)) {
            Set<String> parsed = new LinkedHashSet<>();
            if (source.isBlank()) {
                parsed.addAll(DEFAULT_CRITICAL_PREFIXES);
            } else {
                for (String part : source.split(",")) {
                    String entry = part.trim();
                    if (!entry.isEmpty()) {
                        parsed.add(entry.endsWith("#") ? entry : entry + "#");
                    }
                }
            }
            criticalPrefixes = Set.copyOf(parsed);
            parsedPrefixSource = source;
        }
        return criticalPrefixes;
    }

    /** 宽松解析策略配置：非法值按默认 {@code BY_ENDPOINT_CLASS} 并打 ERROR。 */
    private OutagePolicy parsePolicy(String raw) {
        String value = raw == null ? "" : raw.trim().toUpperCase(java.util.Locale.ROOT);
        if (value.isEmpty()) {
            return OutagePolicy.BY_ENDPOINT_CLASS;
        }
        try {
            return OutagePolicy.valueOf(value);
        } catch (IllegalArgumentException e) {
            log.error("app.security.rate-limit.redis-outage-policy 取值非法：{}"
                    + "（合法值 LOCAL/FAIL_OPEN/FAIL_CLOSED/BY_ENDPOINT_CLASS），"
                    + "按默认 BY_ENDPOINT_CLASS 处理", raw);
            return OutagePolicy.BY_ENDPOINT_CLASS;
        }
    }

    /** 测试专用：注入 Redisson 替身，验证故障降级与键清理。 */
    void setRedissonClientForTests(RedissonClient client) {
        this.redissonClient = client;
    }

    /** 测试专用：设置降级策略配置原文。 */
    void setRedisOutagePolicyForTests(String policy) {
        this.redisOutagePolicyRaw = policy;
    }

    /** 测试专用：设置钱类前缀配置原文（空串=用默认清单）。 */
    void setCriticalKeyPrefixesForTests(String prefixes) {
        this.criticalKeyPrefixesRaw = prefixes;
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

    /**
     * 分布式限流器条目：Redis 键名 + 速率指纹，用于变更检测与闲置清理（缺陷 3-②③）。
     */
    static final class DistributedEntry {
        /** Redis 侧键名（含速率指纹） */
        final String redisKey;
        /** 归一化桶容量 */
        final long capacity;
        /** 归一化每秒补充令牌数 */
        final double refillTokens;
        /** 最近使用时间（毫秒） */
        volatile long lastUsedAt;

        DistributedEntry(String redisKey, long capacity, double refillTokens, long lastUsedAt) {
            this.redisKey = redisKey;
            this.capacity = capacity;
            this.refillTokens = refillTokens;
            this.lastUsedAt = lastUsedAt;
        }

        /** 补充窗口秒数（与 {@link #redisKeyFor} 的映射一致），用于计算安全清理阈值。 */
        long windowSeconds() {
            return Math.max(1L, Math.round(capacity / refillTokens));
        }
    }
}
