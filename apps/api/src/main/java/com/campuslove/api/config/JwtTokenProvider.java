package com.campuslove.api.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * JWT 令牌生成与验证组件。
 * 负责创建、解析和校验 JWT 令牌。
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey signingKey;
    private final long expirationMs;

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
}
