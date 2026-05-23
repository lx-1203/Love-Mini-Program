package com.campuslove.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 配置属性。
 * 绑定 application.yml 中 app.jwt.* 前缀的配置项。
 */
@ConfigurationProperties(prefix = "app.jwt")
public class JwtConfig {

    /**
     * JWT 签名密钥，生产环境必须通过环境变量 JWT_SECRET 覆盖。
     */
    private String secret = "campus-love-default-secret-key-change-in-production";

    /**
     * JWT 令牌有效期（毫秒），默认 24 小时。
     */
    private long expirationMs = 86400000L;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public void setExpirationMs(long expirationMs) {
        this.expirationMs = expirationMs;
    }
}
