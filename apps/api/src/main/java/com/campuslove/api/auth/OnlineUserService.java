package com.campuslove.api.auth;

import com.campuslove.api.common.TimeZones;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * 在线用户会话记录服务（对齐 eladmin「在线用户」能力）。
 *
 * <p>登录成功（微信/手机号/管理员）时写入 Redis 在线会话记录，登出/强制下线时删除，
 * 供管理后台查看在线用户列表与踢下线（复用 {@link TokenBlacklistService} 黑名单机制）。</p>
 *
 * <p>设计要点：</p>
 * <ul>
 *   <li><b>Redis Key 格式</b>：{@code online:user:{userId}}，value 为
 *       {@code jti|loginMethod|loginAtEpochMs|expiresAtEpochMs} 分隔串（jti 为 UUID，
 *       分隔符不会冲突），TTL = JWT 有效期，随 token 自然过期自动清理</li>
 *   <li><b>每用户单条会话</b>：同一用户重复登录（多端）时后写覆盖先写，
 *       保留最新会话的 jti（最小可用设计，满足"查看在线用户 + 踢下线"场景）</li>
 *   <li><b>降级策略</b>：Redis 不可用时降级到本地内存（{@link ConcurrentHashMap}），
 *       与 {@link RedisTokenBlacklistService} 同款降级模式，不阻塞登录/登出主流程</li>
 *   <li><b>值存储</b>：使用分隔串而非 JSON，避免对 RedisTemplate 序列化器的
 *       强类型依赖（当前 value 序列化器为 Jackson2JsonRedisSerializer，String 可兼容读写）</li>
 * </ul>
 *
 * <p>Profile 说明：仅在 real profile 下激活；mock 模式不记录在线会话（mock token 不做会话追踪）。</p>
 */
@Service
@Profile("real")
public class OnlineUserService {

    private static final Logger log = LoggerFactory.getLogger(OnlineUserService.class);

    /** Redis 中存储在线会话记录的 key 前缀 */
    private static final String REDIS_KEY_PREFIX = "online:user:";

    /** 值分隔符：jti|loginMethod|loginAtEpochMs|expiresAtEpochMs */
    private static final String FIELD_SEPARATOR = "|";

    /** 字段数量（防脏数据解析兜底） */
    private static final int FIELD_COUNT = 4;

    /**
     * 本地内存在线会话，作为 Redis 不可用时的降级方案。
     * key 为 userId，value 为会话记录。
     */
    private final ConcurrentHashMap<Long, OnlineSessionRecord> localSessions = new ConcurrentHashMap<>();

    /**
     * Redis 模板，用于持久化在线会话记录。
     *
     * <p>使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常加载；real 模式下 Redis 未启动时
     * 也能通过降级方案继续工作。</p>
     */
    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 记录一次登录会话。
     *
     * @param userId        用户 ID
     * @param jti           JWT 的 jti（用于强制下线时加入黑名单）
     * @param loginMethod   登录方式（wechat / phone / admin / refresh）
     * @param ttlSeconds    JWT 有效期（秒），作为 Redis key 的 TTL
     */
    public void recordLogin(Long userId, String jti, String loginMethod, long ttlSeconds) {
        if (userId == null || jti == null || jti.isBlank()) {
            log.debug("记录在线会话跳过：userId/jti 缺失, userId={}", userId);
            return;
        }
        long nowMs = System.currentTimeMillis();
        // expiresAt 兜底：ttl 非法（<=0）时按 JWT 默认 24h 计算，避免负 TTL 导致 Redis 报错
        long effectiveTtl = ttlSeconds > 0 ? ttlSeconds : TimeUnit.MILLISECONDS.toSeconds(24L * 3600 * 1000);
        OnlineSessionRecord record = new OnlineSessionRecord(
                jti,
                loginMethod != null ? loginMethod : "unknown",
                nowMs,
                nowMs + effectiveTtl * 1000L
        );

        // 1. 写入本地内存（降级方案）
        localSessions.put(userId, record);

        // 2. 写入 Redis（多实例共享方案），通过 try-catch 保护
        try {
            if (redisTemplate != null) {
                String redisKey = buildRedisKey(userId);
                redisTemplate.opsForValue().set(redisKey, serialize(record), effectiveTtl, TimeUnit.SECONDS);
                log.debug("在线会话已记录: userId={}, method={}, ttl={}s", userId, record.loginMethod(), effectiveTtl);
            } else {
                log.debug("redisTemplate 未注入，仅写入本地内存在线会话, userId={}", userId);
            }
        } catch (RuntimeException e) {
            // Redis 不可用时降级到本地内存方案，不影响登录主流程
            log.warn("Redis unavailable, falling back to local memory (recordLogin userId={})", userId, e);
        }
    }

    /**
     * 删除用户的在线会话记录（登出时调用）。
     *
     * @param userId 用户 ID；为 null 时无操作
     */
    public void removeLogin(Long userId) {
        if (userId == null) {
            return;
        }
        localSessions.remove(userId);
        try {
            if (redisTemplate != null) {
                String redisKey = buildRedisKey(userId);
                redisTemplate.delete(redisKey);
            }
        } catch (RuntimeException e) {
            log.warn("Redis unavailable, falling back to local memory (removeLogin userId={})", userId, e);
        }
    }

    /**
     * 查询指定用户的在线会话记录。
     *
     * @param userId 用户 ID
     * @return 会话记录（不存在或已过期返回 empty）
     */
    public Optional<OnlineSessionRecord> getSession(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        // 1. 优先查 Redis
        try {
            if (redisTemplate != null) {
                String redisKey = buildRedisKey(userId);
                Object value = redisTemplate.opsForValue().get(redisKey);
                if (value != null) {
                    OnlineSessionRecord record = deserialize(String.valueOf(value));
                    if (record != null) {
                        return Optional.of(record);
                    }
                }
                return Optional.empty();
            }
        } catch (RuntimeException e) {
            log.warn("Redis unavailable, falling back to local memory (getSession userId={})", userId, e);
        }
        // 2. 降级查本地内存
        OnlineSessionRecord record = localSessions.get(userId);
        if (record == null) {
            return Optional.empty();
        }
        if (record.expiresAtEpochMs() < System.currentTimeMillis()) {
            localSessions.remove(userId, record);
            return Optional.empty();
        }
        return Optional.of(record);
    }

    /**
     * 列出全部在线会话（管理后台「在线用户」列表）。
     *
     * <p>Redis 可用时扫描 {@code online:user:*} key（管理端低频查询，SCAN 规模可控）；
     * 失败时降级遍历本地内存。</p>
     *
     * @return 在线会话列表（不含昵称，昵称由 Controller 批量查询补全）
     */
    public List<OnlineSessionEntry> listOnlineSessions() {
        List<OnlineSessionEntry> result = new ArrayList<>();
        // 1. 优先查 Redis
        try {
            if (redisTemplate != null) {
                // R4-00288：改用 SCAN 迭代替代 redisTemplate.keys()——生产环境 KEYS
                // 命令全量扫描会阻塞 Redis 主线程，在线会话量大时卡顿；SCAN 分批游标
                // 迭代不阻塞（管理端低频查询，量级可控）。
                Set<String> keys = scanKeys(REDIS_KEY_PREFIX + "*");
                for (String key : keys) {
                    Object value = redisTemplate.opsForValue().get(key);
                    OnlineSessionRecord record = value != null ? deserialize(String.valueOf(value)) : null;
                    if (record == null || record.expiresAtEpochMs() < System.currentTimeMillis()) {
                        continue;
                    }
                    Long userId = parseUserIdFromKey(key);
                    if (userId != null) {
                        result.add(new OnlineSessionEntry(userId, record));
                    }
                }
                return result;
            }
        } catch (RuntimeException e) {
            log.warn("Redis unavailable, falling back to local memory (listOnlineSessions)", e);
        }
        // 2. 降级遍历本地内存
        long now = System.currentTimeMillis();
        for (java.util.Map.Entry<Long, OnlineSessionRecord> entry : localSessions.entrySet()) {
            if (entry.getValue().expiresAtEpochMs() >= now) {
                result.add(new OnlineSessionEntry(entry.getKey(), entry.getValue()));
            }
        }
        return result;
    }

    /**
     * 测试辅助方法：清空本地内存在线会话。
     * 仅供单元测试使用，生产代码不应调用。
     */
    void clearLocalSessionsForTest() {
        localSessions.clear();
    }

    private String buildRedisKey(Long userId) {
        return REDIS_KEY_PREFIX + userId;
    }

    private Long parseUserIdFromKey(String key) {
        if (key == null || !key.startsWith(REDIS_KEY_PREFIX)) {
            return null;
        }
        try {
            return Long.parseLong(key.substring(REDIS_KEY_PREFIX.length()));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * R4-00288：SCAN 游标迭代匹配的 Redis key（替代 {@code keys()} 全量扫描）。
     *
     * <p>SCAN 分批迭代（每批 500 个）不阻塞 Redis 主线程；返回的 key 集合由
     * RedisTemplate 的 value 序列化器编码为字符串（当前 value 序列化器为
     * Jackson2JsonRedisSerializer，对纯字符串 key 无影响）。</p>
     *
     * @param pattern 匹配模式（如 {@code online:user:*}）
     * @return 匹配的 key 集合（SCAN 失败时返回空集合，由调用方降级）
     */
    private Set<String> scanKeys(String pattern) {
        return redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Set<String>>) connection -> {
            Set<String> matched = new java.util.HashSet<>();
            try (org.springframework.data.redis.core.Cursor<byte[]> cursor = connection.scan(
                    org.springframework.data.redis.core.ScanOptions.scanOptions()
                            .match(pattern)
                            .count(500)
                            .build())) {
                while (cursor.hasNext()) {
                    matched.add(new String(cursor.next(), java.nio.charset.StandardCharsets.UTF_8));
                }
            } catch (RuntimeException e) {
                throw new IllegalStateException("SCAN 迭代失败", e);
            }
            return matched;
        });
    }

    /** 序列化：jti|loginMethod|loginAtEpochMs|expiresAtEpochMs */
    private String serialize(OnlineSessionRecord record) {
        return record.jti() + FIELD_SEPARATOR
                + record.loginMethod() + FIELD_SEPARATOR
                + record.loginAtEpochMs() + FIELD_SEPARATOR
                + record.expiresAtEpochMs();
    }

    /** 反序列化：解析失败返回 null（容忍脏数据） */
    private OnlineSessionRecord deserialize(String raw) {
        if (raw == null) {
            return null;
        }
        String[] parts = raw.split("\\|", -1);
        if (parts.length != FIELD_COUNT) {
            log.warn("在线会话记录格式异常，忽略: length={}", parts.length);
            return null;
        }
        try {
            return new OnlineSessionRecord(
                    parts[0],
                    parts[1],
                    Long.parseLong(parts[2]),
                    Long.parseLong(parts[3])
            );
        } catch (NumberFormatException e) {
            log.warn("在线会话记录时间戳非法，忽略: {}", raw);
            return null;
        }
    }

    /**
     * 在线会话记录（内部值对象）。
     *
     * @param jti             JWT ID（强制下线时加入黑名单）
     * @param loginMethod     登录方式（wechat / phone / admin / refresh）
     * @param loginAtEpochMs  登录时间（epoch 毫秒）
     * @param expiresAtEpochMs 会话过期时间（epoch 毫秒）
     */
    public record OnlineSessionRecord(String jti, String loginMethod, long loginAtEpochMs, long expiresAtEpochMs) {

        /** 登录时间 ISO 格式（时区取系统默认，管理端展示用） */
        public String loginAtIso() {
            return LocalDateTime.ofInstant(Instant.ofEpochMilli(loginAtEpochMs), TimeZones.BUSINESS).toString();
        }

        /** 剩余有效秒数（踢下线黑名单 TTL 用）；已过期返回 0 */
        public long remainingTtlSeconds() {
            long remainingMs = expiresAtEpochMs - System.currentTimeMillis();
            return remainingMs > 0 ? TimeUnit.MILLISECONDS.toSeconds(remainingMs) : 0L;
        }
    }

    /**
     * 在线会话条目（列表展示用，含 userId）。
     *
     * @param userId 用户 ID
     * @param session 会话记录
     */
    public record OnlineSessionEntry(Long userId, OnlineSessionRecord session) {
    }
}
