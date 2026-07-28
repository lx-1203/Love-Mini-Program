package com.campuslove.api.auth;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * 基于 Redis 的 Token 黑名单服务实现。
 *
 * <p>Task 0.5.3 新增：将 JWT 的 jti（JWT ID）写入 Redis 黑名单，TTL 设为 JWT 剩余有效期，
 * 实现用户主动登出后令牌立即失效。Redis 不可用时降级到本地内存，保证主流程可用。</p>
 *
 * <p>设计要点：</p>
 * <ul>
 *   <li><b>Redis Key 格式</b>：{@code jwt:blacklist:{jti}}，使用 jti 而非完整 token 字符串
 *     <ul>
 *       <li>更短的 key（jti 通常是 36 字符 UUID），节省 Redis 内存</li>
 *       <li>遵循 JWT 标准（jti 是 RFC 7519 定义的 Token ID claim）</li>
 *       <li>避免将完整 token 写入 Redis，降低 token 泄露风险（即使 Redis 被入侵也无法直接拿到可用 token）</li>
 *     </ul>
 *   </li>
 *   <li><b>TTL = JWT 剩余有效期</b>：Token 自然过期后黑名单条目自动清理，避免 Redis 无限增长</li>
 *   <li><b>降级策略</b>：Redis 不可用时（网络异常、Redis 未启动）写入本地内存并降级查询，
 *       不阻塞登出主流程，由后续签名校验兜底</li>
 *   <li><b>幂等性</b>：同一 jti 多次 revoke 不报错，TTL 以最后一次调用为准</li>
 * </ul>
 *
 * <p>Profile 说明：仅在 real profile 下激活，mock 模式无需 Redis 黑名单（mock token 不做严格校验）。</p>
 *
 * @see TokenBlacklistService
 */
@Service
@Profile("real")
public class RedisTokenBlacklistService implements TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(RedisTokenBlacklistService.class);

    /** Redis 中存储黑名单 jti 的 key 前缀 */
    private static final String REDIS_KEY_PREFIX = "jwt:blacklist:";

    /**
     * 本地内存黑名单，作为 Redis 不可用时的降级方案。
     *
     * <p>使用 {@link ConcurrentHashMap} 保证线程安全；存储 jti 而非完整 token，
     * 与 Redis 实现保持一致。降级场景下无法自动过期清理，依赖 JwtTokenProvider
     * 的定时任务（{@code cleanupExpiredRevokedTokens}）间接清理。</p>
     */
    private final ConcurrentHashMap<String, Boolean> localBlacklist = new ConcurrentHashMap<>();

    /**
     * Redis 模板，用于持久化黑名单。
     *
     * <p>使用 {@link Autowired} 注入而非构造器注入，并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动；real 模式下若 Redis 未启动
     * 也能通过降级方案继续工作。</p>
     */
    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 将指定 jti 加入 Redis 黑名单，TTL 为 JWT 剩余有效期。
     *
     * <p>实现策略：</p>
     * <ol>
     *   <li>参数校验：jti 为 null/blank 或 TTL &lt;= 0 时直接返回（幂等无操作）</li>
     *   <li>同时写入本地内存（兼容降级场景，Redis 不可用时仍能查询到）</li>
     *   <li>写入 Redis，TTL = ttlSeconds（由调用方计算 JWT 剩余有效期传入）</li>
     *   <li>Redis 写入失败仅记录日志，不抛异常（保证登出主流程不被 Redis 故障阻塞）</li>
     * </ol>
     *
     * @param jti        JWT ID（RFC 7519 标准 claim）
     * @param ttlSeconds TTL（秒），等于 JWT 剩余有效期；&lt;= 0 时跳过写入
     */
    @Override
    public void revoke(String jti, long ttlSeconds) {
        if (jti == null || jti.isBlank() || ttlSeconds <= 0) {
            // 参数无效时幂等返回，不抛异常
            log.debug("revoke 跳过：jti 为空或 TTL<=0, jti={}, ttlSeconds={}", jti, ttlSeconds);
            return;
        }

        // 1. 写入本地内存（降级方案，Redis 不可用时仍能查询到）
        localBlacklist.put(jti, Boolean.TRUE);

        // 2. 写入 Redis（多实例共享方案），通过 try-catch 保护
        try {
            if (redisTemplate != null) {
                String redisKey = REDIS_KEY_PREFIX + jti;
                redisTemplate.opsForValue().set(redisKey, Boolean.TRUE, ttlSeconds, TimeUnit.SECONDS);
                log.info("jti 已加入 Redis 黑名单, ttl={}秒, jti={}", ttlSeconds, jti);
            } else {
                // redisTemplate 未注入（mock 模式或 Redis 未配置），仅本地内存方案
                log.debug("redisTemplate 未注入，仅写入本地内存黑名单, jti={}", jti);
            }
        } catch (RuntimeException e) {
            // Redis 不可用时降级到本地内存方案，不影响登出主流程
            // 捕获 RuntimeException 而非 DataAccessException：覆盖 Mockito 测试场景与
            // RedisTemplate 在连接异常时可能抛出的非 DataAccessException 子类异常
            log.warn("写入 Redis 黑名单失败，降级使用本地内存方案：{}", e.getMessage());
        }
    }

    /**
     * 查询指定 jti 是否已在黑名单中（即已被主动撤销）。
     *
     * <p>查询优先级：</p>
     * <ol>
     *   <li>Redis：key 为 {@code jwt:blacklist:{jti}}，存在即视为已撤销</li>
     *   <li>本地内存：Redis 不可用时降级查询</li>
     * </ol>
     *
     * <p>降级语义：底层存储不可用时返回 false（不阻塞主流程，由后续 JWT 签名/过期校验兜底）。
     * 此降级可能导致极少数已撤销 token 在 Redis 故障期间仍被接受，但相比阻塞所有请求影响更小。</p>
     *
     * @param jti JWT ID
     * @return true 表示已撤销，应拒绝认证；false 表示未撤销或无法判断
     */
    @Override
    public boolean isRevoked(String jti) {
        if (jti == null || jti.isBlank()) {
            // jti 为空（如旧 token 无 jti claim）直接返回 false，不阻塞认证
            return false;
        }

        // 1. 优先查 Redis
        try {
            if (redisTemplate != null) {
                String redisKey = REDIS_KEY_PREFIX + jti;
                Boolean exists = redisTemplate.hasKey(redisKey);
                if (Boolean.TRUE.equals(exists)) {
                    return true;
                }
                // Redis 可用且 key 不存在，直接返回未撤销（以 Redis 为准）
                return false;
            }
        } catch (RuntimeException e) {
            // Redis 不可用时降级查本地内存
            log.warn("查询 Redis 黑名单失败，降级使用本地内存方案：{}", e.getMessage());
        }

        // 2. 降级查本地内存
        return localBlacklist.containsKey(jti);
    }

    /**
     * 测试辅助方法：清空本地内存黑名单。
     *
     * <p>仅供单元测试使用，生产代码不应调用。用于在测试用例间隔离状态。</p>
     */
    void clearLocalBlacklistForTest() {
        localBlacklist.clear();
    }
}
