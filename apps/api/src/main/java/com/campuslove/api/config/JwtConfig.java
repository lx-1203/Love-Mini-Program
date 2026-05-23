package com.campuslove.api.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 配置属性。
 * 绑定 application.yml 中 app.jwt.* 前缀的配置项。
 * 启动时校验密钥安全性，拒绝使用默认或空密钥。
 */
@ConfigurationProperties(prefix = "app.jwt")
public class JwtConfig {

    private static final Logger log = LoggerFactory.getLogger(JwtConfig.class);

    /** 已知的不安全默认密钥列表，启动时检测到这些值将拒绝启动 */
    private static final java.util.Set<String> UNSAFE_DEFAULT_SECRETS = java.util.Set.of(
            "campus-love-default-secret-key-change-in-production",
            "campus-love-dev-secret-key-change-in-production",
            "change-me",
            "secret",
            "jwt-secret"
    );

    /**
     * JWT 签名密钥，必须通过环境变量 JWT_SECRET 或配置文件设置。
     * 不再提供硬编码默认值，启动时未设置将抛出异常。
     */
    private String secret;

    /**
     * JWT 令牌有效期（毫秒），默认 24 小时。
     */
    private long expirationMs = 86400000L;

    /**
     * 启动后校验 JWT 密钥安全性。
     * 如果密钥未设置、为空或为已知的不安全默认值，抛出异常拒绝启动。
     */
    @PostConstruct
    public void validateSecret() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT 密钥未设置！请通过环境变量 JWT_SECRET 设置安全的密钥后重新启动。");
        }
        if (UNSAFE_DEFAULT_SECRETS.contains(secret)) {
            throw new IllegalStateException(
                    "JWT 密钥使用了不安全的默认值（" + secret + "），"
                    + "请通过环境变量 JWT_SECRET 设置一个安全的随机密钥后重新启动。");
        }
        if (secret.length() < 32) {
            log.warn("JWT 密钥长度不足 32 字节，建议使用至少 32 字符的随机密钥以保障安全性。");
        }
        log.info("JWT 密钥校验通过，密钥长度: {} 字符", secret.length());
    }

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
