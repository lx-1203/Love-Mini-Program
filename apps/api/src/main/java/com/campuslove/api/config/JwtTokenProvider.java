package com.campuslove.api.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Iterator;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import javax.crypto.SecretKey;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
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
     * 密钥版本号（SubTask 10.2 安全加固）。
     *
     * <p>签发 token 时写入 JWT header {@code kid}（Key ID），用于支持密钥轮换：
     * 验证方可根据 kid 选择对应版本的密钥校验签名。当前实现仅校验当前密钥，
     * 接入 KMS/Vault 后可实现完整的多版本密钥校验逻辑。</p>
     */
    private final int keyVersion;

    /**
     * Redis 模板，用于持久化 token 黑名单。
     *
     * <p>使用 {@link Autowired} 注入而非构造器注入，并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动。</p>
     */
    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * Redisson 分布式锁客户端（FIN-00082）。
     *
     * <p>用于 {@link #cleanupExpiredRevokedTokens()} 定时任务的分布式锁，
     * 确保多实例部署时仅一个实例执行清理，避免重复扫描与数据竞争。
     * 使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 Redis 配置）下也能正常启动；mock 模式下为 null，
     * 定时任务跳过分布式锁（单实例无需锁）。</p>
     */
    @Autowired(required = false)
    private RedissonClient redissonClient;

    public JwtTokenProvider(JwtConfig jwtConfig) {
        // 确保密钥长度满足 HMAC-SHA256 的最低要求（256 位 = 32 字节）
        // 密钥非空与长度校验由 JwtConfig.validateSecret() 在 @PostConstruct 完成
        byte[] keyBytes = jwtConfig.getSecret().getBytes(StandardCharsets.UTF_8);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = jwtConfig.getExpirationMs();
        this.keyVersion = jwtConfig.getKeyVersion();
    }

    /**
     * 根据用户 ID 生成 JWT 令牌。
     *
     * <p>Task 0.5.3 安全加固：每个 token 都附带唯一 {@code jti}（JWT ID，RFC 7519 标准 claim），
     * 用于支持基于 jti 的 Redis 黑名单撤销机制。jti 由 {@link UUID#randomUUID()} 生成，
     * 全局唯一，不可预测。</p>
     *
     * @param userId 用户唯一标识
     * @return 签发后的 JWT 字符串
     */
    public String generateToken(String userId) {
        Instant now = Instant.now();
        Instant expiryInstant = now.plusMillis(expirationMs);

        return Jwts.builder()
                .subject(userId)
                .id(UUID.randomUUID().toString()) // jti claim，用于 Redis 黑名单撤销
                .header().keyId(String.valueOf(keyVersion)).and() // kid header，用于密钥轮换
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiryInstant))
                .signWith(signingKey)
                .compact();
    }

    /**
     * 签发短期媒体访问令牌（R4-00273）。
     *
     * <p>用于 {@code <image src>} 等无法携带 Authorization 头的媒体请求：
     * 与完整用户 JWT 不同，媒体令牌 TTL 短（默认 5 分钟）、携带
     * {@code scope=media} 声明，即使进入访问日志/浏览器历史，泄露窗口与
     * 可冒用范围也大幅缩小（无法用于业务 API）。</p>
     *
     * <p>客户端通过 {@code GET /api/v1/media/token}（需登录）获取，随后拼入
     * 媒体代理 URL 的 {@code ?token=} 参数。服务端 {@link JwtAuthenticationFilter}
     * 在 query token 路径校验 scope 声明。</p>
     *
     * @param userId 用户唯一标识
     * @return 短期媒体访问 JWT 字符串
     */
    public String generateMediaToken(String userId) {
        Instant now = Instant.now();
        Instant expiryInstant = now.plusMillis(MEDIA_TOKEN_TTL_MS);
        return Jwts.builder()
                .subject(userId)
                .id(UUID.randomUUID().toString())
                .claim("scope", MEDIA_SCOPE)
                .header().keyId(String.valueOf(keyVersion)).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiryInstant))
                .signWith(signingKey)
                .compact();
    }

    /** 媒体访问令牌有效期（毫秒）：5 分钟 */
    private static final long MEDIA_TOKEN_TTL_MS = 5L * 60 * 1000;

    /** 媒体访问令牌的 scope 声明值 */
    public static final String MEDIA_SCOPE = "media";

    /** 媒体访问令牌默认剩余有效期（秒），供响应体返回 */
    public static final long MEDIA_TOKEN_TTL_SECONDS = MEDIA_TOKEN_TTL_MS / 1000;

    /**
     * 提取令牌的 scope 声明。
     *
     * <p>媒体访问令牌（{@link #generateMediaToken}）携带 {@code scope=media}；
     * 普通用户会话令牌无 scope 声明，返回 null。</p>
     *
     * @param token JWT 令牌字符串
     * @return scope 值（无声明返回 null；令牌无效返回 null）
     */
    public String getTokenScope(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Object scope = claims.get("scope");
            return scope != null ? String.valueOf(scope) : null;
        } catch (JwtException ex) {
            log.debug("提取 token scope 失败: {}", ex.getMessage());
            return null;
        }
    }

    /**
     * 从 JWT 令牌中提取 jti（JWT ID）。
     *
     * <p>Task 0.5.3 新增：用于在认证过滤器与登出流程中查询 Redis 黑名单。
     * 兼容旧 token（无 jti claim）：返回 null，调用方应将 null 视为"无法撤销"，
     * 仅依赖 token 自然过期。</p>
     *
     * @param token JWT 令牌字符串
     * @return jti 字符串（UUID 格式），如果令牌无效或无 jti claim 则返回 null
     */
    public String getJtiFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getId();
        } catch (ExpiredJwtException ex) {
            // 过期 token 仍可能需要查询黑名单（理论上过期即自动失效，但保留接口一致性）
            // ExpiredJwtException 的 claims 信息可通过 getClaims() 获取
            log.debug("Token 已过期，仍尝试从异常中提取 jti: {}", ex.getMessage());
            return ex.getClaims() != null ? ex.getClaims().getId() : null;
        } catch (JwtException ex) {
            log.warn("Failed to extract jti from token: {}", ex.getMessage());
            return null;
        }
    }

    /**
     * 计算令牌剩余有效期（秒）。
     *
     * <p>Task 0.5.3 新增：用于 Redis 黑名单 TTL 设置，确保黑名单条目在 token 自然过期后
     * 自动清理，避免 Redis 无限增长。</p>
     *
     * @param token JWT 令牌字符串
     * @return 剩余有效期（秒），&lt;= 0 表示已过期或无法解析；
     *         无法解析过期时间时返回应用配置的默认有效期（秒）
     */
    public long getRemainingTtlSeconds(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Instant expiration = getExpirationInstantFromClaims(claims);
            if (expiration == null) {
                return TimeUnit.MILLISECONDS.toSeconds(expirationMs);
            }
            long remainingMs = expiration.toEpochMilli() - Instant.now().toEpochMilli();
            return Math.max(1, TimeUnit.MILLISECONDS.toSeconds(remainingMs));
        } catch (ExpiredJwtException ex) {
            // 已过期 token 的 TTL 应为 0，调用方一般不会再加入黑名单
            return 0L;
        } catch (JwtException ex) {
            // 无法解析的 token，使用默认有效期作为兜底
            return TimeUnit.MILLISECONDS.toSeconds(expirationMs);
        }
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
     * @return 过期时间（Instant），如果令牌无效则返回 null
     */
    public Instant getExpirationFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return getExpirationInstantFromClaims(claims);
        } catch (JwtException ex) {
            log.warn("Failed to extract expiration from token: {}", ex.getMessage());
            return null;
        }
    }

    /**
     * 将 {@link Claims#getExpiration()} 返回的 {@link java.util.Date} 转换为 {@link Instant}。
     *
     * <p>JJWT 0.12.x 的 {@code Claims.getExpiration()} 仍返回 {@link java.util.Date}，
     * 此方法封装转换逻辑，避免外部调用方直接依赖旧式 Date 类型。
     * 当 claims 为 null 或过期时间为 null 时返回 null。</p>
     *
     * @param claims JWT claims 载荷
     * @return 过期时间 Instant，可能为 null
     */
    private Instant getExpirationInstantFromClaims(Claims claims) {
        if (claims == null || claims.getExpiration() == null) {
            return null;
        }
        return claims.getExpiration().toInstant();
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
                Instant expiration = getExpirationFromToken(token);
                long ttlSeconds;
                if (expiration != null) {
                    long remainingMs = expiration.toEpochMilli() - Instant.now().toEpochMilli();
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
        } catch (DataAccessException e) {
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
        } catch (DataAccessException e) {
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
        // FIN-00082: 分布式锁确保多实例部署时仅一个实例执行清理任务
        // mock profile 下 redissonClient 为 null（Redisson 已排除），跳过锁（单实例无需锁）
        if (redissonClient != null) {
            try {
                if (!redissonClient.getLock("scheduled:cleanupRevokedTokens")
                        .tryLock(0, 30, TimeUnit.SECONDS)) {
                    log.debug("cleanupRevokedTokens 定时任务已被其他实例持有，跳过本次执行");
                    return;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("cleanupRevokedTokens 获取分布式锁被中断");
                return;
            }
            try {
                doCleanupExpiredRevokedTokens();
            } finally {
                // 修复（R2）：tryLock 成功后必须在 finally 释放，否则锁要等 30s 自动过期
                redissonClient.getLock("scheduled:cleanupRevokedTokens").unlock();
            }
        } else {
            doCleanupExpiredRevokedTokens();
        }
    }

    /**
     * 实际清理逻辑（抽取以便统一在锁内执行并保证 finally 释放）。
     */
    private void doCleanupExpiredRevokedTokens() {
        if (revokedTokens.isEmpty()) {
            return;
        }
        int removed = 0;
        Iterator<String> iterator = revokedTokens.iterator();
        while (iterator.hasNext()) {
            String token = iterator.next();
            Instant expiration = getExpirationFromToken(token);
            // 过期时间为 null（无法解析）或已过期，则从黑名单移除
            if (expiration == null || expiration.isBefore(Instant.now())) {
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.info("清理过期撤销 token 数量: {}，剩余: {}", removed, revokedTokens.size());
        }
    }
}
