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
     * 密钥版本号，用于支持密钥轮换（SubTask 10.2 安全加固）。
     *
     * <p>轮换机制说明：</p>
     * <ul>
     *   <li>每个密钥版本对应一份签名密钥，存储于外部密钥管理服务（KMS / Vault）</li>
     *   <li>签发 token 时将 keyVersion 写入 JWT header {@code kid}（Key ID）</li>
     *   <li>验证 token 时根据 kid 选择对应版本的密钥校验签名</li>
     *   <li>轮换时：新签发 token 使用新版本；旧版本 token 在过期前继续被接受</li>
     *   <li>紧急撤销：移除旧版本密钥配置，所有旧 token 立即失效</li>
     * </ul>
     *
     * <p>当前实现：签发时写入 kid header，验证时仅校验当前密钥（轮换能力预留）。
     * 后续接入 KMS 后可实现完整的多版本密钥校验。</p>
     */
    private int keyVersion = 1;

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
            throw new IllegalStateException(
                    "JWT_SECRET 长度必须 >= 32 字符以满足 HS256 安全要求（当前长度: "
                    + secret.length() + "）。请通过环境变量 JWT_SECRET 设置更长的随机密钥。");
        }
        log.info("JWT 密钥校验通过，密钥长度: {} 字符，密钥版本: {}", secret.length(), keyVersion);
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

    public int getKeyVersion() {
        return keyVersion;
    }

    public void setKeyVersion(int keyVersion) {
        this.keyVersion = keyVersion;
    }
}
