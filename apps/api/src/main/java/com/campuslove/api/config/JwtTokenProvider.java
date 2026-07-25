package com.campuslove.api.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Iterator;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * JWT 令牌生成与验证组件。
 * 负责创建、解析和校验 JWT 令牌。
 *
 * <p>Token 黑名单（撤销）机制：</p>
 * <ul>
 *   <li>本地内存：{@link ConcurrentHashMap} 兼容单实例部署，应用重启后丢失</li>
 *   <li>Redis 持久化：key 前缀 {@code jwt:blacklist:}，TTL = token 剩余有效期
 *       —— 支持多实例共享，重启后仍生效，自动过期清理</li>
 *   <li>查询优先级：Redis 优先，Redis 不可用时降级查本地内存</li>
 *   <li>所有 Redis 调用通过 try-catch 保护，失败时仅记录日志，不影响主流程</li>
 * </ul>
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    /** Redis 中存储黑名单 token 的 key 前缀 */
    private static final String REDIS_BLACKLIST_KEY_PREFIX = "jwt:blacklist:";

    /**
     * Token 黑名单，存储已撤销但尚未过期的 JWT token。
     *
     * <p>实现说明：
     * <ul>
     *   <li>使用 {@link ConcurrentHashMap} 保证线程安全</li>
     *   <li>Set 包装支持快速 contains 判断</li>
     *   <li>作为 Redis 不可用时的降级方案，仍受 token 过期时间限制</li>
     * </ul>
     * </p>
     */
    private final Set<String> revokedTokens = ConcurrentHashMap.newKeySet();

    private final SecretKey signingKey;
    private final long expirationMs;

    /**
     * Redis 模板，用于持久化 token 黑名单。
     *
     * <p>使用 {@link Autowired} 注入而非构造器注入，并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动。</p>
     */
    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    public JwtTokenProvider(JwtConfig jwtConfig) {
        // 确保密钥长度满足 HMAC-SHA256 的最低要求（256 位 = 32 字节）
        byte[] keyBytes = jwtConfig.getSecret().getBytes(StandardCharsets.UTF_8);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = jwtConfig.getExpirationMs();
    }

    /**
     * 根据用户 ID 生成 JWT 令牌。
     *
     * @param userId 用户唯一标识
     * @return 签发后的 JWT 字符串
     */
    public String generateToken(String userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userId)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    /**
     * 从 JWT 令牌中提取用户 ID。
     *
     * @param token JWT 令牌字符串
     * @return 用户 ID，如果令牌无效则返回 null
     */
    public String getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getSubject();
        } catch (ExpiredJwtException ex) {
            log.warn("JWT token expired: {}", ex.getMessage());
            return null;
        } catch (JwtException ex) {
            log.warn("Invalid JWT token: {}", ex.getMessage());
            return null;
        }
    }

    /**
     * 校验 JWT 令牌是否有效。
     *
     * @param token JWT 令牌字符串
     * @return true 表示令牌有效且未过期
     */
    public boolean validateToken(String token) {
        return getUserIdFromToken(token) != null;
    }

    /**
     * 检查令牌是否有效（包括未过期）。
     * 与 validateToken 不同，此方法会捕获并处理过期异常。
     *
     * @param token JWT 令牌字符串
     * @return true 表示令牌有效且未过期
     */
    public boolean isTokenValid(String token) {
        try {
            Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException ex) {
            log.debug("Token expired: {}", ex.getMessage());
            return false;
        } catch (JwtException ex) {
            log.debug("Invalid token: {}", ex.getMessage());
            return false;
        }
    }

    /**
     * 从令牌中提取过期时间。
     *
     * @param token JWT 令牌字符串
     * @return 过期时间，如果令牌无效则返回 null
     */
    public Date getExpirationFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getExpiration();
        } catch (JwtException ex) {
            log.warn("Failed to extract expiration from token: {}", ex.getMessage());
            return null;
        }
    }

    /**
     * 将 token 加入黑名单，实现登出后立即失效。
     *
     * <p>实现策略：</p>
     * <ol>
     *   <li>同时写入本地内存（兼容单机/降级场景）</li>
     *   <li>同时写入 Redis（支持多实例共享、自动过期清理）</li>
     *   <li>Redis 写入失败时仅记录日志，不影响主流程</li>
     *   <li>Redis 中 TTL = token 剩余有效期，过期后自动清理</li>
     * </ol>
     *
     * @param token 已签发的 JWT token
     */
    public void revokeToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        // 1. 写入本地内存（降级方案）
        revokedTokens.add(token);

        // 2. 写入 Redis（多实例共享方案），通过 try-catch 保护
        try {
            if (redisTemplate != null) {
                Date expiration = getExpirationFromToken(token);
                long ttlSeconds;
                if (expiration != null) {
                    long remainingMs = expiration.getTime() - System.currentTimeMillis();
                    // 兜底：剩余时间 ≤ 0 时给 1 秒 TTL，避免负值导致 Redis 报错
                    ttlSeconds = Math.max(1, TimeUnit.MILLISECONDS.toSeconds(remainingMs));
                } else {
                    // 无法解析过期时间，默认使用应用配置的过期时长
                    ttlSeconds = TimeUnit.MILLISECONDS.toSeconds(expirationMs);
                }
                String redisKey = REDIS_BLACKLIST_KEY_PREFIX + token;
                redisTemplate.opsForValue().set(redisKey, "1", ttlSeconds, TimeUnit.SECONDS);
                log.info("Token 已加入 Redis 黑名单，TTL={}秒，长度={}", ttlSeconds, token.length());
            }
        } catch (Exception e) {
            // Redis 不可用时降级到本地内存方案，不影响登出主流程
            log.warn("写入 Redis 黑名单失败，降级使用本地内存方案：{}", e.getMessage());
        }
    }

    /**
     * 检查 token 是否已被撤销（在黑名单中）。
     *
     * <p>查询优先级：</p>
     * <ol>
     *   <li>Redis：key 为 {@code jwt:blacklist:{token}}，存在即视为已撤销</li>
     *   <li>本地内存：Redis 不可用时降级查询</li>
     * </ol>
     *
     * @param token JWT token
     * @return true 表示 token 已被撤销，应拒绝认证
     */
    public boolean isTokenRevoked(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        // 1. 优先查 Redis
        try {
            if (redisTemplate != null) {
                String redisKey = REDIS_BLACKLIST_KEY_PREFIX + token;
                Boolean exists = redisTemplate.hasKey(redisKey);
                if (Boolean.TRUE.equals(exists)) {
                    return true;
                }
                // Redis 可用且 key 不存在，直接返回未撤销（以 Redis 为准）
                return false;
            }
        } catch (Exception e) {
            // Redis 不可用时降级查本地内存
            log.warn("查询 Redis 黑名单失败，降级使用本地内存方案：{}", e.getMessage());
        }

        // 2. 降级查本地内存
        return revokedTokens.contains(token);
    }

    /**
     * 定时清理黑名单中已过期的 token，避免内存无限增长。
     *
     * <p>调度策略：每小时执行一次（fixedDelay = 3600000ms），
     * initialDelay = 1 小时（启动 1 小时后开始第一次清理，避免冷启动开销）。</p>
     *
     * <p>清理逻辑：
     * <ul>
     *   <li>遍历本地黑名单中所有 token</li>
     *   <li>解析过期时间，已过期的从本地黑名单移除（Redis 端由 TTL 自动清理）</li>
     *   <li>解析失败的 token 一并移除（无法解析的 token 没有意义）</li>
     *   <li>使用 iterator 安全移除并发集合中的元素</li>
     * </ul>
     * </p>
     *
     * <p>注：@EnableScheduling 已在 CampusLoveApplication 上启用，本方法自动调度。</p>
     */
    @Scheduled(fixedDelay = 3600000L, initialDelay = 3600000L)
    public void cleanupExpiredRevokedTokens() {
        if (revokedTokens.isEmpty()) {
            return;
        }
        int removed = 0;
        Iterator<String> iterator = revokedTokens.iterator();
        while (iterator.hasNext()) {
            String token = iterator.next();
            Date expiration = getExpirationFromToken(token);
            // 过期时间为 null（无法解析）或已过期，则从黑名单移除
            if (expiration == null || expiration.before(new Date())) {
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.info("清理过期撤销 token 数量: {}，剩余: {}", removed, revokedTokens.size());
        }
    }
}
