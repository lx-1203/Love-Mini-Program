package com.campuslove.api.config;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * AES-GCM 对称加密工具类。
 *
 * <p>用于敏感数据（如微信 openid、手机号）的加密存储与读取，
 * 避免数据库泄露时直接暴露用户敏感信息。</p>
 *
 * <p>算法选择：
 * <ul>
 *   <li>AES/GCM/NoPadding：提供机密性 + 完整性认证，防止密文被篡改</li>
 *   <li>每次加密生成随机 12 字节 IV（初始化向量），相同明文每次密文不同</li>
 *   <li>认证标签 128 位，防止填充攻击</li>
 * </ul>
 * </p>
 *
 * <p>密钥来源：通过 {@code APP_AES_SECRET} 环境变量配置，长度需 >= 32 字符。
 * mock（本地演示）profile 在 application-mock.yml 中提供开发用默认密钥；
 * real（生产）profile 无任何默认值——未配置 {@code APP_AES_SECRET} 时启动直接
 * 拒绝（fail-fast）。不再回退到 JWT_SECRET（避免签名密钥与加密密钥复用）。</p>
 *
 * <p>线程安全：本类无状态，{@link #encrypt} / {@link #decrypt} 可被多线程并发调用。</p>
 */
@Component
public class AesEncryptor {

    private static final Logger log = LoggerFactory.getLogger(AesEncryptor.class);

    /** AES-GCM 算法名 */
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    /** AES 密钥算法 */
    private static final String KEY_ALGORITHM = "AES";
    /** GCM IV 长度（字节），NIST 推荐值为 12 */
    private static final int IV_LENGTH = 12;
    /** GCM 认证标签长度（位） */
    private static final int AUTH_TAG_BITS = 128;
    /** AES 密钥长度（字节，AES-256） */
    private static final int KEY_LENGTH_BYTES = 32;

    /**
     * 通过环境变量 APP_AES_SECRET 注入的 AES 密钥（Base64 或原始字符串）。
     * mock profile 由 application-mock.yml 提供开发默认值；real profile 无默认值，
     * 未配置时启动失败（R4-00246/R4-01775：已移除 JWT_SECRET 回退与公开兜底密钥）。
     */
    @Value("${app.security.aes-secret:}")
    private String secret;

    /** 安全随机数生成器，用于生成 IV */
    private final SecureRandom secureRandom = new SecureRandom();

    /** 解析后的 AES SecretKey */
    private SecretKey aesKey;

    /**
     * 安全姿态开关（默认 true，保留配置兼容）。
     * 说明：自 R4-00246/R4-01775 移除公开兜底密钥后，无论 strict-aes 取值，
     * 密钥缺失时一律拒绝启动（fail-fast），该开关仅用于日志区分运行模式。
     */
    @Value("${app.security.strict-aes:true}")
    private boolean strictAes;

    /**
     * 启动时校验并初始化 AES 密钥。
     * 密钥来源：
     * <ol>
     *   <li>APP_AES_SECRET 环境变量（推荐，独立密钥）</li>
     *   <li>mock profile：application-mock.yml 中的开发用默认值（仅本地演示）</li>
     * </ol>
     * 密钥长度不足 32 字节时，使用 SHA-256 派生密钥。
     *
     * <p>infra R2-00012 / R4-00246 / R4-01775 修复：公开兜底密钥已移除，
     * 密钥缺失时无论 strict-aes 取值一律拒绝启动（fail-fast）——
     * 生产漏配时 openid/phone 使用公开密钥加密等于明文，属严重隐私风险。
     * 同时不再回退 JWT_SECRET，避免签名密钥与加密密钥复用（R2-00017）。</p>
     */
    @PostConstruct
    public void init() {
        if (secret == null || secret.isBlank()) {
            String mode = strictAes
                    ? "严格模式（app.security.strict-aes=true）"
                    : "非严格模式（app.security.strict-aes=false）";
            String msg = "APP_AES_SECRET 未配置，敏感数据（openid/phone）无法安全加密。"
                    + "请通过环境变量 APP_AES_SECRET 配置独立随机密钥（至少 32 字符）。"
                    + "mock（本地演示）profile 已内置开发用密钥，无需配置；"
                    + "real（生产）profile 未配置时" + mode + "下均拒绝启动。";
            log.error(msg);
            throw new IllegalStateException(msg);
        }
        // 派生固定 32 字节密钥（与 AES-256 兼容）
        byte[] keyBytes = deriveKey(secret);
        this.aesKey = new SecretKeySpec(keyBytes, KEY_ALGORITHM);
        log.info("AES 加密器初始化完成，密钥长度: {} 字节", keyBytes.length);
    }

    /**
     * 从配置的 secret 字符串派生固定长度（32 字节）的 AES 密钥。
     * 使用 SHA-256 哈希作为派生函数，保证密钥长度满足 AES-256 要求。
     *
     * @param secret 原始密钥字符串
     * @return 32 字节 AES 密钥
     */
    private byte[] deriveKey(String secret) {
        try {
            java.security.MessageDigest sha256 = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = sha256.digest(secret.getBytes(StandardCharsets.UTF_8));
            // SHA-256 输出 32 字节，正好满足 AES-256 密钥长度
            byte[] keyBytes = new byte[KEY_LENGTH_BYTES];
            System.arraycopy(hash, 0, keyBytes, 0, KEY_LENGTH_BYTES);
            return keyBytes;
        } catch (java.security.NoSuchAlgorithmException ex) {
            // SHA-256 是 JDK 内置算法，理论上不会缺失
            throw new IllegalStateException("SHA-256 算法不可用", ex);
        }
    }

    /**
     * 加密明文。
     * 输出格式：Base64(IV || ciphertext||authTag)，IV 占前 12 字节。
     *
     * @param plaintext 明文，可为 null（null 原样返回）
     * @return Base64 编码的密文，或 null（输入为 null/空时原样返回）
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return plaintext;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, aesKey, new GCMParameterSpec(AUTH_TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            // 拼接 IV + 密文+认证标签
            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (java.security.GeneralSecurityException ex) {
            // 加密失败抛运行时异常，避免吞掉错误
            throw new IllegalStateException("AES 加密失败", ex);
        }
    }

    /**
     * 解密密文。
     *
     * @param ciphertext Base64 编码的密文（IV + ciphertext + authTag）
     * @return 明文，或 null/空（输入为 null/空时原样返回）
     */
    public String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isEmpty()) {
            return ciphertext;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);
            if (combined.length < IV_LENGTH) {
                // 长度不足，说明不是加密数据，原样返回（兼容历史明文）
                return ciphertext;
            }
            byte[] iv = new byte[IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
            byte[] cipherText = new byte[combined.length - IV_LENGTH];
            System.arraycopy(combined, IV_LENGTH, cipherText, 0, cipherText.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, aesKey, new GCMParameterSpec(AUTH_TAG_BITS, iv));
            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            // Base64 解码失败：说明不是加密数据（可能是历史明文），原样返回
            log.debug("输入非 Base64 编码，视为明文返回");
            return ciphertext;
        } catch (java.security.GeneralSecurityException ex) {
            // 解密失败（如认证标签不匹配）：返回原值，避免影响业务流程
            log.warn("AES 解密失败，原样返回输入: {}", ex.getMessage());
            return ciphertext;
        }
    }

    /**
     * 判断字符串是否为加密格式（Base64 且长度 > IV_LENGTH）。
     * 用于历史明文数据的迁移判断。
     *
     * @param value 待判断的字符串
     * @return true 表示可能是加密数据
     */
    public boolean isEncrypted(String value) {
        if (value == null || value.isEmpty()) {
            return false;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(value);
            return combined.length > IV_LENGTH;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
