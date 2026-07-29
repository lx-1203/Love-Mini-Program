package com.campuslove.api.match;

import com.campuslove.api.common.DailyLimitExceededException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

/**
 * 匹配策略组件。
 *
 * <p>职责：实现匹配业务中的策略与限额校验，包括：</p>
 * <ul>
 *   <li>rewind 每日限额校验（{@link #checkRewindLimit}）</li>
 *   <li>rewind 计数查询与递增（{@link #getTodayRewindCount}/{@link #incrementRewindCount}）</li>
 *   <li>用户存在性校验（{@link #requireUserExists}，由调用方提供 Repository）</li>
 *   <li>自身匹配校验（{@link #requireNotSelf}）</li>
 * </ul>
 *
 * <p>从 RealMatchService 拆分而来（Task 4.2.1）。
 * Redis 不可用时降级到本地 {@link ConcurrentHashMap} 内存方案。</p>
 */
@Profile("real")
@Component
public class MatchPolicy {

    private static final Logger log = LoggerFactory.getLogger(MatchPolicy.class);

    /** rewind 每日允许次数上限。业务规则：每个用户每天最多反悔 1 次。 */
    public static final int REWIND_DAILY_LIMIT = 1;

    /** Redis 中存储 rewind 每日计数器的 key 前缀，TTL 36 小时。 */
    public static final String REDIS_KEY_PREFIX_REWIND = "rewind:count:";

    /** 日期格式（yyyy-MM-dd），用于组装 Redis key 与本地降级 map 的 key */
    private static final DateTimeFormatter DATE_KEY_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /** Redis 不可用时的本地内存降级方案（单实例方案，生产应依赖 Redis）。 */
    private final ConcurrentHashMap<String, Integer> localRewindCount = new ConcurrentHashMap<>();

    /**
     * Redis 模板，用于持久化 rewind 每日计数器。
     * <p>使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动。</p>
     */
    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 校验当前用户今日 rewind 次数是否已达上限。
     * 达到上限时抛出 {@link DailyLimitExceededException}，由调用方转换为 HTTP 429 响应。
     *
     * @param userId 用户 ID
     * @throws DailyLimitExceededException 当今日 rewind 次数已达上限时
     */
    public void checkRewindLimit(Long userId) {
        int todayCount = getTodayRewindCount(userId);
        if (todayCount >= REWIND_DAILY_LIMIT) {
            log.info("用户[{}]今日反悔次数已达上限({}/{})，拒绝 rewind",
                    userId, todayCount, REWIND_DAILY_LIMIT);
            throw new DailyLimitExceededException(
                    "反悔",
                    REWIND_DAILY_LIMIT,
                    "今日反悔次数已用完（上限 " + REWIND_DAILY_LIMIT + " 次），请明日再来");
        }
    }

    /**
     * 获取用户今日已 rewind 次数。
     *
     * <p>查询优先级：</p>
     * <ol>
     *   <li>Redis：key 为 {@code rewind:count:{userId}:{yyyy-MM-dd}}</li>
     *   <li>本地内存：Redis 不可用时降级查询</li>
     * </ol>
     *
     * @param userId 用户 ID
     * @return 今日已 rewind 次数
     */
    public int getTodayRewindCount(Long userId) {
        String dateKey = LocalDate.now().format(DATE_KEY_FORMATTER);
        String localKey = userId + ":" + dateKey;

        try {
            if (redisTemplate != null) {
                String redisKey = REDIS_KEY_PREFIX_REWIND + userId + ":" + dateKey;
                Object value = redisTemplate.opsForValue().get(redisKey);
                if (value instanceof Number n) {
                    return n.intValue();
                }
                return 0;
            }
        } catch (RuntimeException e) {
            log.warn("查询 Redis rewind 计数失败，降级使用本地内存方案：{}", e.getMessage());
        }

        return localRewindCount.getOrDefault(localKey, 0);
    }

    /**
     * 递增用户今日 rewind 计数器（Redis 与本地双写）。
     *
     * <p>实现策略：</p>
     * <ol>
     *   <li>本地内存递增（降级方案）</li>
     *   <li>Redis 递增并设置 36 小时 TTL（保证跨自然日后自动清理）</li>
     *   <li>Redis 写入失败仅记录日志，不抛异常</li>
     * </ol>
     *
     * @param userId 用户 ID
     */
    public void incrementRewindCount(Long userId) {
        String dateKey = LocalDate.now().format(DATE_KEY_FORMATTER);
        String localKey = userId + ":" + dateKey;

        localRewindCount.merge(localKey, 1, Integer::sum);

        try {
            if (redisTemplate != null) {
                String redisKey = REDIS_KEY_PREFIX_REWIND + userId + ":" + dateKey;
                Long newValue = redisTemplate.opsForValue().increment(redisKey);
                if (newValue != null && newValue == 1L) {
                    redisTemplate.expire(redisKey, 36, TimeUnit.HOURS);
                }
            }
        } catch (RuntimeException e) {
            log.warn("写入 Redis rewind 计数失败，降级使用本地内存方案：{}", e.getMessage());
        }
    }

    /**
     * 校验自身匹配：禁止对自己执行 like/pass 等操作。
     *
     * @param userId       当前用户 ID
     * @param targetUserId 目标用户 ID
     * @throws IllegalArgumentException 当两 ID 相等时
     */
    public void requireNotSelf(Long userId, Long targetUserId) {
        if (userId != null && userId.equals(targetUserId)) {
            throw new IllegalArgumentException("Cannot operate on yourself");
        }
    }

    /**
     * 暴露注入的 RedisTemplate（仅供测试或显式注入场景使用）。
     */
    public void setRedisTemplate(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 暴露当前注入的 RedisTemplate 实例（仅供测试断言使用）。
     */
    public RedisTemplate<String, Object> getRedisTemplate() {
        return redisTemplate;
    }
}
