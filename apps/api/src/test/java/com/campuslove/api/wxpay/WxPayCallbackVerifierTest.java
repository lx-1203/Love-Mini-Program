package com.campuslove.api.wxpay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.Signature;
import java.security.SignatureException;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 微信支付回调校验器单元测试（纯 JDK 密码学，不联网、不连库）。
 *
 * <p>测试策略：代码内自生成 RSA 密钥对模拟「微信平台证书公钥/商户私钥」，
 * 自构造 AES-256-GCM 密文模拟微信回调 resource，覆盖：</p>
 * <ul>
 *   <li>验签往返成功（正确签名 → 通过）；</li>
 *   <li>报文篡改拒绝（body 被改 → 验签失败）；</li>
 *   <li>过期时间戳拒绝（防重放，偏移超 5 分钟 → 拒绝）；</li>
 *   <li>解密往返成功 / 篡改密文解密失败（GCM 认证）。</li>
 * </ul>
 */
class WxPayCallbackVerifierTest {

    private static KeyPair platformKeyPair;
    private static final String API_V3_KEY = "0123456789abcdef0123456789abcdef";

    private WxPayProperties properties;
    private WxPayCallbackVerifier verifier;

    @BeforeAll
    static void generateKeys() throws NoSuchAlgorithmException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        platformKeyPair = generator.generateKeyPair();
    }

    @BeforeEach
    void setUp() {
        properties = new WxPayProperties();
        properties.setEnabled(true);
        properties.setApiV3Key(API_V3_KEY);
        properties.setPlatformCert(toPublicKeyPem(platformKeyPair.getPublic()));
        verifier = new WxPayCallbackVerifier(properties);
    }

    /* ==================== 验签 ==================== */

    @Test
    @DisplayName("验签往返：正确签名的回调验签通过")
    void verifyCallback_roundtripSucceeds() throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonce = "nonce-abc";
        String body = "{\"id\":\"EV-1\",\"resource\":{\"ciphertext\":\"x\"}}";
        String signature = signWithPlatformKey(timestamp, nonce, body);

        assertTrue(verifier.verifyCallback(timestamp, nonce, body, signature),
                "正确签名 + 新鲜时间戳应验签通过");
    }

    @Test
    @DisplayName("篡改拒绝：请求体被篡改后验签失败")
    void verifyCallback_tamperedBodyRejected() throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonce = "nonce-abc";
        String body = "{\"id\":\"EV-1\",\"resource\":{\"ciphertext\":\"x\"}}";
        String signature = signWithPlatformKey(timestamp, nonce, body);

        String tamperedBody = "{\"id\":\"EV-1\",\"resource\":{\"ciphertext\":\"y\"}}";
        assertFalse(verifier.verifyCallback(timestamp, nonce, tamperedBody, signature),
                "报文被篡改（签名不匹配）必须拒绝");
    }

    @Test
    @DisplayName("防重放：时间戳偏移超过 5 分钟拒绝")
    void verifyCallback_expiredTimestampRejected() throws Exception {
        long expired = System.currentTimeMillis() / 1000 - 301;
        String timestamp = String.valueOf(expired);
        String nonce = "nonce-abc";
        String body = "{\"id\":\"EV-1\"}";
        String signature = signWithPlatformKey(timestamp, nonce, body);

        assertFalse(verifier.verifyCallback(timestamp, nonce, body, signature),
                "时间戳偏移超窗（防重放）必须拒绝");
        assertFalse(verifier.isTimestampWithinTolerance(timestamp));
    }

    @Test
    @DisplayName("缺头拒绝：签名/时间戳/nonce 缺失时拒绝")
    void verifyCallback_missingHeadersRejected() {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        assertFalse(verifier.verifyCallback(timestamp, "nonce", "{}", null));
        assertFalse(verifier.verifyCallback(null, "nonce", "{}", "sig"));
        assertFalse(verifier.verifyCallback(timestamp, null, "{}", "sig"));
    }

    @Test
    @DisplayName("非法签名拒绝：非 Base64 / 伪造签名拒绝且不抛出")
    void verifyCallback_bogusSignatureRejected() {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        assertFalse(verifier.verifyCallback(timestamp, "nonce", "{}", "not-base64!!!"));
        assertFalse(verifier.verifyCallback(timestamp, "nonce", "{}",
                Base64.getEncoder().encodeToString("forged".getBytes(StandardCharsets.UTF_8))));
    }

    /* ==================== 解密 ==================== */

    @Test
    @DisplayName("解密往返：AES-256-GCM 密文正确解密为明文 JSON")
    void decryptResource_roundtripSucceeds() throws Exception {
        String plaintext = "{\"out_trade_no\":\"VIP20261005TEST\",\"trade_state\":\"SUCCESS\"}";
        String nonce = "1234567890ab";
        String aad = "transaction";
        String ciphertext = encryptWithApiV3Key(plaintext, nonce, aad);

        assertEquals(plaintext, verifier.decryptResource(ciphertext, aad, nonce));
    }

    @Test
    @DisplayName("篡改拒绝：密文被篡改后 GCM 认证失败抛异常")
    void decryptResource_tamperedCiphertextRejected() throws Exception {
        String plaintext = "{\"amount\":100}";
        String nonce = "1234567890ab";
        String ciphertext = encryptWithApiV3Key(plaintext, nonce, "transaction");

        // 篡改密文首字节
        byte[] raw = Base64.getDecoder().decode(ciphertext);
        raw[0] ^= 0x01;
        String tampered = Base64.getEncoder().encodeToString(raw);

        assertThrows(IllegalStateException.class,
                () -> verifier.decryptResource(tampered, "transaction", nonce),
                "密文被篡改（GCM tag 校验失败）必须拒绝");
    }

    @Test
    @DisplayName("参数防御：缺 ciphertext/nonce / APIv3 密钥长度非法时抛异常")
    void decryptResource_invalidParamsRejected() {
        assertThrows(IllegalStateException.class, () -> verifier.decryptResource(null, "a", "n"));
        assertThrows(IllegalStateException.class, () -> verifier.decryptResource("ciph", "a", null));

        WxPayProperties badKeyProps = new WxPayProperties();
        badKeyProps.setApiV3Key("short-key");
        WxPayCallbackVerifier badKeyVerifier = new WxPayCallbackVerifier(badKeyProps);
        assertThrows(IllegalStateException.class,
                () -> badKeyVerifier.decryptResource("ciph", "a", "1234567890ab"));
    }

    /* ==================== 辅助 ==================== */

    /** 用平台私钥按官方签名串规则签名。 */
    private String signWithPlatformKey(String timestamp, String nonce, String body)
            throws NoSuchAlgorithmException, SignatureException, java.security.InvalidKeyException {
        String message = timestamp + "\n" + nonce + "\n" + body + "\n";
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(platformKeyPair.getPrivate());
        signature.update(message.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signature.sign());
    }

    /** 用 APIv3 密钥构造 AES-256-GCM 密文（模拟微信侧加密）。 */
    private String encryptWithApiV3Key(String plaintext, String nonce, String associatedData) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,
                new SecretKeySpec(API_V3_KEY.getBytes(StandardCharsets.UTF_8), "AES"),
                new GCMParameterSpec(128, nonce.getBytes(StandardCharsets.UTF_8)));
        cipher.updateAAD(associatedData.getBytes(StandardCharsets.UTF_8));
        byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encrypted);
    }

    /** 公钥 → PEM 文本（X.509）。 */
    static String toPublicKeyPem(java.security.PublicKey publicKey) {
        String base64 = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                .encodeToString(publicKey.getEncoded());
        return "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----\n";
    }

    /** 平台证书解析失败（非法内容）应 fail-fast；空证书属封存态合法配置（构造成功但验签拒绝）。 */
    @Test
    @DisplayName("平台证书格式校验：非法 PEM 构造失败；空证书=封存态可构造（验签恒拒绝）")
    void constructor_invalidPlatformCertRejected() {
        WxPayProperties bad = new WxPayProperties();
        bad.setPlatformCert("-----BEGIN PUBLIC KEY-----\n!!!not-base64!!!\n-----END PUBLIC KEY-----");
        assertThrows(IllegalArgumentException.class, () -> new WxPayCallbackVerifier(bad));

        // 空证书（缺省 enabled=false 封存态）：构造不抛（缺省安全，否则 real profile 无法启动），
        // 但验签一律拒绝——开闸时缺项由 WxPayBootstrapChecker fail-fast 拦截
        WxPayProperties empty = new WxPayProperties();
        empty.setPlatformCert("");
        WxPayCallbackVerifier emptyCertVerifier = new WxPayCallbackVerifier(empty);
        assertFalse(emptyCertVerifier.verifyCallback(
                String.valueOf(java.time.Instant.now().getEpochSecond()), "nonce", "{}", "c2ln"),
                "空证书（封存态）下验签必须拒绝，不得放行任何回调");
    }

    @Test
    @DisplayName("不同密钥解密失败：密钥不匹配时 GCM 认证失败")
    void decryptResource_wrongKeyRejected() throws Exception {
        String plaintext = "{\"k\":1}";
        String nonce = "1234567890ab";
        String ciphertext = encryptWithApiV3Key(plaintext, nonce, "transaction");

        WxPayProperties otherProps = new WxPayProperties();
        otherProps.setApiV3Key("ffffffffffffffffffffffffffffffff");
        otherProps.setPlatformCert(toPublicKeyPem(platformKeyPair.getPublic()));
        WxPayCallbackVerifier otherVerifier = new WxPayCallbackVerifier(otherProps);

        assertThrows(IllegalStateException.class,
                () -> otherVerifier.decryptResource(ciphertext, "transaction", nonce),
                "密钥不同（GCM 认证失败）必须拒绝");
    }

    @Test
    @DisplayName("签名私钥校验：用错误私钥签名的回调被拒（模拟私钥泄露换签场景）")
    void verifyCallback_wrongSignerRejected() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair attacker = generator.generateKeyPair();

        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonce = "nonce-xyz";
        String body = "{\"id\":\"EV-2\"}";
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(attacker.getPrivate());
        signature.update((timestamp + "\n" + nonce + "\n" + body + "\n").getBytes(StandardCharsets.UTF_8));
        String forged = Base64.getEncoder().encodeToString(signature.sign());

        assertFalse(verifier.verifyCallback(timestamp, nonce, body, forged),
                "非平台证书私钥签名的回调必须拒绝");
    }
}
