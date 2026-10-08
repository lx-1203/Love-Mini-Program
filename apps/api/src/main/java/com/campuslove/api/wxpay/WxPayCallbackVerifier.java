package com.campuslove.api.wxpay;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.Signature;
import java.security.SignatureException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 微信支付 APIv3 回调校验器（JDK 内置实现，不引 SDK）。
 *
 * <p>两项职责：</p>
 * <ol>
 *   <li><b>验签</b>：用微信平台证书公钥对请求头 {@code Wechatpay-Signature}
 *       做 RSA-SHA256 验签，签名串为
 *       {@code timestamp\nnonce\nbody\n}（逐段 \n 结尾，含最后一段）；
 *       同时校验 {@code Wechatpay-Timestamp} 与服务器时间偏移（默认 5 分钟），
 *       超窗直接拒绝（防重放）。</li>
 *   <li><b>解密</b>：回调 resource 密文 AES-256-GCM 解密——
 *       key = APIv3 密钥（32 字节），nonce / associated_data / ciphertext 来自 resource，
 *       ciphertext 为 Base64（末 16 字节为 GCM 认证标签 tag），解密失败即认证失败。</li>
 * </ol>
 *
 * <p>验签不通过 / 时间戳过期 / 解密失败都必须拒绝处理（返回 FAIL），否则等于
 * 任意请求可开通 VIP（原骨架实现「非空即过」的漏洞，本次修复关闭）。</p>
 */
@Component
@Profile("real")
public class WxPayCallbackVerifier {

    private static final Logger log = LoggerFactory.getLogger(WxPayCallbackVerifier.class);

    /** SHA256withRSA JCA 算法名（验签用） */
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";

    /** AES-256-GCM：密钥 32 字节、nonce 12 字节、GCM tag 128 位（16 字节） */
    private static final String AES_ALGORITHM = "AES";
    private static final int GCM_TAG_BITS = 128;
    private static final int GCM_NONCE_BYTES = 12;

    private final WxPayProperties properties;
    /** 平台证书公钥（构造时从配置解析；格式非法在启动期由 WxPayBootstrapChecker 拦截） */
    private final PublicKey platformPublicKey;

    public WxPayCallbackVerifier(WxPayProperties properties) {
        this.properties = properties;
        String cert = properties.getPlatformCert();
        if (cert == null || cert.isBlank()) {
            // 封存态（enabled=false）缺省安全：允许空证书构造（管道未开，回调端点 404 兜底，
            // verifyCallback 对 null 公钥一律拒绝）；enabled=true 时由 WxPayBootstrapChecker fail-fast 拦截
            this.platformPublicKey = null;
            log.warn("微信支付平台证书公钥未配置，回调验签不可用（封存态属预期；enabled=true 时启动校验将拦截）");
        } else {
            this.platformPublicKey = loadPlatformPublicKey(cert);
        }
        log.info("微信支付回调校验器初始化完成：验签时间戳容差={}s",
                properties.getCallbackTimestampToleranceSeconds());
    }

    /**
     * 回调验签（RSA-SHA256 + 时间戳防重放）。
     *
     * @param timestamp 请求头 Wechatpay-Timestamp（秒级）
     * @param nonce     请求头 Wechatpay-Nonce
     * @param body      回调请求体原文（未做任何改写的 raw body）
     * @param signature 请求头 Wechatpay-Signature（Base64）
     * @return true=验签通过且时间戳在容差内；false=拒绝处理
     */
    public boolean verifyCallback(String timestamp, String nonce, String body, String signature) {
        if (signature == null || signature.isBlank()
                || timestamp == null || timestamp.isBlank()
                || nonce == null || nonce.isBlank()) {
            log.warn("微信回调验签失败：签名/时间戳/nonce 头缺失");
            return false;
        }
        if (!isTimestampWithinTolerance(timestamp)) {
            log.warn("微信回调验签失败：时间戳超窗（疑似重放），timestamp={}", timestamp);
            return false;
        }
        if (platformPublicKey == null) {
            log.error("微信回调验签失败：平台证书公钥未加载");
            return false;
        }
        // 官方签名串：timestamp\nnonce\nbody\n（含最后一段 \n）
        String message = timestamp + "\n" + nonce + "\n" + (body == null ? "" : body) + "\n";
        try {
            Signature sig = Signature.getInstance(SIGNATURE_ALGORITHM);
            sig.initVerify(platformPublicKey);
            sig.update(message.getBytes(StandardCharsets.UTF_8));
            return sig.verify(Base64.getDecoder().decode(signature));
        } catch (NoSuchAlgorithmException | InvalidKeyException | SignatureException
                 | IllegalArgumentException e) {
            // IllegalArgumentException: signature 非 Base64
            log.warn("微信回调验签失败：签名不匹配或格式非法: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 时间戳偏移校验（防重放）：|now - timestamp| 超过容差秒数即拒绝。
     *
     * @param timestampSec 请求头时间戳（秒级字符串）
     * @return true=在容差内
     */
    public boolean isTimestampWithinTolerance(String timestampSec) {
        long tolerance = properties.getCallbackTimestampToleranceSeconds();
        long ts;
        try {
            ts = Long.parseLong(timestampSec.trim());
        } catch (NumberFormatException e) {
            return false;
        }
        long now = System.currentTimeMillis() / 1000;
        return Math.abs(now - ts) <= tolerance;
    }

    /**
     * 回调 resource 密文解密（AES-256-GCM，APIv3 密钥）。
     *
     * @param ciphertext     resource.ciphertext（Base64，末 16 字节为 GCM tag）
     * @param associatedData resource.associated_data（可为空串）
     * @param nonce          resource.nonce（12 字符）
     * @return 解密后的明文 JSON 字符串
     * @throws IllegalStateException APIv3 密钥缺失 / 解密失败（含认证标签校验失败——密文被篡改）
     */
    public String decryptResource(String ciphertext, String associatedData, String nonce) {
        if (properties.getApiV3Key() == null || properties.getApiV3Key().isBlank()) {
            throw new IllegalStateException("APIv3 密钥未配置，无法解密回调报文");
        }
        if (ciphertext == null || ciphertext.isBlank() || nonce == null || nonce.isBlank()) {
            throw new IllegalStateException("回调 resource 缺少 ciphertext/nonce，无法解密");
        }
        byte[] key = properties.getApiV3Key().getBytes(StandardCharsets.UTF_8);
        if (key.length != 32) {
            throw new IllegalStateException("APIv3 密钥长度必须为 32 字节，当前: " + key.length);
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,
                    new SecretKeySpec(key, AES_ALGORITHM),
                    new GCMParameterSpec(GCM_TAG_BITS, nonce.getBytes(StandardCharsets.UTF_8)));
            if (associatedData != null && !associatedData.isEmpty()) {
                cipher.updateAAD(associatedData.getBytes(StandardCharsets.UTF_8));
            }
            byte[] cipherBytes = Base64.getDecoder().decode(ciphertext);
            byte[] plain = cipher.doFinal(cipherBytes);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (NoSuchAlgorithmException | NoSuchPaddingException
                 | InvalidKeyException | IllegalArgumentException e) {
            throw new IllegalStateException("回调报文解密失败（参数/密钥非法）: " + e.getMessage(), e);
        } catch (Exception e) {
            // AEADBadTagException 等：密文被篡改或密钥不匹配（GCM 认证失败）
            throw new IllegalStateException("回调报文解密失败（GCM 认证失败，密文可能被篡改）", e);
        }
    }

    /**
     * 解析平台证书公钥（X.509 SubjectPublicKeyInfo PEM）。
     *
     * @param source 配置值（PEM 内容或文件路径）
     * @return 公钥实例
     * @throws IllegalArgumentException PEM 缺失/格式非法/文件不可读时抛出
     */
    public static PublicKey loadPlatformPublicKey(String source) {
        String pem = WxPayRequestSigner.readPem(source, "platform-cert");
        pem = WxPayRequestSigner.stripPemHeaders(pem);
        byte[] decoded;
        try {
            decoded = Base64.getMimeDecoder().decode(pem);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("平台证书公钥 Base64 解码失败（需 PEM 公钥）", e);
        }
        try {
            KeyFactory factory = KeyFactory.getInstance("RSA");
            return factory.generatePublic(new X509EncodedKeySpec(decoded));
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalArgumentException("平台证书公钥解析失败（需 X.509 PEM 公钥）", e);
        }
    }
}
