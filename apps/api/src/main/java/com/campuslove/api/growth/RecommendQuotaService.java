package com.campuslove.api.growth;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.RecommendationConfig;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * 每日推荐配额服务（P0-23 / P0-24：签到赠送配额 + 推荐拉取扣减联动）。
 *
 * <p>配额模型：</p>
 * <ul>
 *   <li>每日基础额度：{@code app.recommendation.daily-limit}（默认 10 次）</li>
 *   <li>签到赠送额度：{@link CheckInService#getCheckInStatus} 返回的 extraQuota
 *       （连续签到天数 × 单次奖励，口径与签到模块一致）</li>
 *   <li>剩余 = 基础额度 + 签到赠送额度 - 今日已用</li>
 *   <li>每日计数：Redis key {@code recommend-quota:{userId}:{yyyyMMdd}}（INCR 原子递增，
 *       TTL 36 小时自动清理）；Redis 不可用时降级到本地内存计数</li>
 * </ul>
 *
 * <p><b>TODO（P0-23 协调项）</b>：配额消费的接入点在
 * {@code discover/RealRecommendationService#getRecommendations}（每次拉取按次扣减，
 * 达到上限返回空列表 + 提示字段）。discover/ 模块由另一组负责（缓存/策略/控制器），
 * 本服务仅提供 growth 侧的配额计算与原子扣减能力，接入点待主线程协调后由 discover 组
 * 注入本服务调用 {@link #tryConsume} / {@link #getRemainingQuota}。</p>
 */
@Profile("real")
@Service
public class RecommendQuotaService {

    private static final Logger log = LoggerFactory.getLogger(RecommendQuotaService.class);

    /** Redis 每日计数 key 前缀。 */
    public static final String REDIS_KEY_PREFIX = "recommend-quota:";

    /** 日期格式（yyyyMMdd），用于组装 Redis key。 */
    private static final DateTimeFormatter DATE_KEY_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** 计数 TTL：36 小时（覆盖跨自然日，避免 Redis 无限增长）。 */
    private static final long COUNT_TTL_HOURS = 36L;

    private final RecommendationConfig recommendationConfig;
    private final CheckInService checkInService;

    /**
     * Redis 模板（可选注入）：每日计数持久化；Redis 不可用时降级到本地内存。
     */
    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /** Redis 不可用时的本地内存每日计数降级方案。 */
    private final ConcurrentHashMap<String, Integer> localCount = new ConcurrentHashMap<>();

    public RecommendQuotaService(RecommendationConfig recommendationConfig, CheckInService checkInService) {
        this.recommendationConfig = recommendationConfig;
        this.checkInService = checkInService;
    }

    /**
     * 查询用户今日推荐配额总量（基础额度 + 签到赠送额度）。
     *
     * @param userId 用户 ID
     * @return 今日配额总量
     */
    public int getDailyQuota(Long userId) {
        int baseLimit = recommendationConfig.getDailyLimit();
        int extraQuota = 0;
        try {
            CheckInStatusView status = checkInService.getCheckInStatus(userId);
            if (status != null) {
                extraQuota = status.extraQuota();
            }
        } catch (RuntimeException e) {
            // 签到状态查询失败降级为 0（不阻断推荐配额计算）
            log.warn("查询签到赠送配额失败，降级为 0：userId={}, error={}", userId, e.getMessage());
        }
        return Math.max(0, baseLimit + extraQuota);
    }

    /**
     * 查询用户今日剩余推荐配额（总量 - 已用）。
     *
     * @param userId 用户 ID
     * @return 剩余配额（可能为负数，调用方按 0 处理）
     */
    public int getRemainingQuota(Long userId) {
        return getDailyQuota(userId) - getUsedCount(userId);
    }

    /**
     * 查询用户今日已用推荐次数。
     *
     * @param userId 用户 ID
     * @return 已用次数
     */
    public int getUsedCount(Long userId) {
        String dateKey = LocalDate.now(TimeZones.BUSINESS).format(DATE_KEY_FORMATTER);
        try {
            if (redisTemplate != null) {
                Object value = redisTemplate.opsForValue().get(REDIS_KEY_PREFIX + userId + ":" + dateKey);
                if (value instanceof Number n) {
                    return n.intValue();
                }
                return 0;
            }
        } catch (RuntimeException e) {
            log.warn("查询 Redis 推荐配额计数失败，降级使用本地内存方案：{}", e.getMessage());
        }
        return localCount.getOrDefault(userId + ":" + dateKey, 0);
    }

    /**
     * 原子尝试占用今日一次推荐配额（INCR 返回值判断，参考 MatchPolicy 反悔计数模式）。
     *
     * <p>Redis 侧：{@code INCR} 返回值超过 {@link #getDailyQuota} 时回滚递减并返回 false；
     * 本地降级方案：synchronized 临界区内判断。首次递增时设置 36 小时 TTL。</p>
     *
     * @param userId 用户 ID
     * @return true 表示成功占用一次配额；false 表示已达今日上限
     */
    public boolean tryConsume(Long userId) {
        String dateKey = LocalDate.now(TimeZones.BUSINESS).format(DATE_KEY_FORMATTER);
        String localKey = userId + ":" + dateKey;
        int dailyQuota = getDailyQuota(userId);
        try {
            if (redisTemplate != null) {
                String redisKey = REDIS_KEY_PREFIX + userId + ":" + dateKey;
                Long newValue = redisTemplate.opsForValue().increment(redisKey);
                if (newValue != null && newValue == 1L) {
                    redisTemplate.expire(redisKey, COUNT_TTL_HOURS, TimeUnit.HOURS);
                }
                if (newValue != null && newValue > dailyQuota) {
                    // 超限回滚递增，保证计数不漂移
                    redisTemplate.opsForValue().decrement(redisKey);
                    return false;
                }
                return true;
            }
        } catch (RuntimeException e) {
            log.warn("写入 Redis 推荐配额计数失败，降级使用本地内存方案：{}", e.getMessage());
        }
        // 本地降级方案（无 Redis 时）：临界区内判断+递增，保证单实例内原子性
        synchronized (localCount) {
            int next = localCount.getOrDefault(localKey, 0) + 1;
            if (next > dailyQuota) {
                return false;
            }
            localCount.put(localKey, next);
            return true;
        }
    }

    /**
     * 判断用户今日推荐配额是否已耗尽。
     *
     * @param userId 用户 ID
     * @return true 表示已达上限
     */
    public boolean isExhausted(Long userId) {
        return getUsedCount(userId) >= getDailyQuota(userId);
    }
}
