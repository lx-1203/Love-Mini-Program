package com.campuslove.api.wxpay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.wxpay.WxPayModels;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 微信支付请求签名器单元测试（代码内自生成 RSA 密钥对，不联网）。
 *
 * <p>覆盖：Authorization 头官方格式、签名可用公钥验证、
 * JSAPI paySign（wx.requestPayment 五件套之一）计算规则、PEM 加载。</p>
 */
class WxPayRequestSignerTest {

    private static KeyPair merchantKeyPair;

    private WxPayProperties properties;
    private WxPayRequestSigner signer;

    @BeforeAll
    static void generateKeys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        merchantKeyPair = generator.generateKeyPair();
    }

    @BeforeEach
    void setUp() {
        properties = new WxPayProperties();
        properties.setEnabled(true);
        properties.setMchid("1900000001");
        properties.setMchSerialNo("TEST-SERIAL-001");
        properties.setMerchantPrivateKey(toPrivateKeyPem(merchantKeyPair.getPrivate()));
        signer = new WxPayRequestSigner(properties);
    }

    @Test
    @DisplayName("Authorization 头符合官方格式（scheme/mchid/nonce/signature/timestamp/serial_no）")
    void authorizationHeader_officialFormat() {
        String header = signer.authorizationHeader("POST", "/v3/pay/transactions/jsapi", "{\"a\":1}");

        assertTrue(header.startsWith(WxPayRequestSigner.AUTH_SCHEME + " "),
                "scheme 前缀应为 WECHATPAY2-SHA256-RSA2048");
        assertTrue(header.contains("mchid=\"1900000001\""));
        assertTrue(header.contains("serial_no=\"TEST-SERIAL-001\""));
        assertTrue(header.contains("nonce_str=\""));
        assertTrue(header.contains("timestamp=\""));
        assertTrue(header.contains("signature=\""));
        // 五个属性按官方顺序出现
        assertTrue(header.indexOf("mchid=") < header.indexOf("nonce_str="));
        assertTrue(header.indexOf("nonce_str=") < header.indexOf("signature="));
        assertTrue(header.indexOf("signature=") < header.indexOf("timestamp="));
        assertTrue(header.indexOf("timestamp=") < header.indexOf("serial_no="));
    }

    @Test
    @DisplayName("签名串规则：METHOD\\nURL\\nTS\\nNONCE\\nBODY\\n，且签名可用商户公钥验证")
    void signature_verifiableByPublicKey() throws Exception {
        String method = "POST";
        String path = "/v3/pay/transactions/jsapi";
        String body = "{\"appid\":\"wx123\"}";
        String header = signer.authorizationHeader(method, path, body);

        String signatureB64 = extractParam(header, "signature");
        String timestamp = extractParam(header, "timestamp");
        String nonce = extractParam(header, "nonce_str");
        assertNotNull(signatureB64);

        // 用商户公钥按官方签名串规则验证签名
        String message = signer.buildRequestMessage(method, path, Long.parseLong(timestamp), nonce, body);
        assertEquals(method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + body + "\n", message,
                "签名串应为 METHOD\\nURL\\nTS\\nNONCE\\nBODY\\n（含末尾 \\n）");

        Signature verify = Signature.getInstance("SHA256withRSA");
        verify.initVerify(merchantKeyPair.getPublic());
        verify.update(message.getBytes(StandardCharsets.UTF_8));
        assertTrue(verify.verify(Base64.getDecoder().decode(signatureB64)),
                "签名应能用商户公钥验证通过");
    }

    @Test
    @DisplayName("JSAPI paySign：appId\\ntimeStamp\\nnonceStr\\nprepay_id=xxx\\n 规则，公钥可验")
    void buildJsapiPaySign_officialRule() throws Exception {
        String appId = "wx1234567890";
        String timeStamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = signer.newNonce();
        String paySign = signer.buildJsapiPaySign(appId, timeStamp, nonceStr, "wxPrepay123");

        String message = appId + "\n" + timeStamp + "\n" + nonceStr + "\n" + "prepay_id=wxPrepay123" + "\n";
        Signature verify = Signature.getInstance("SHA256withRSA");
        verify.initVerify(merchantKeyPair.getPublic());
        verify.update(message.getBytes(StandardCharsets.UTF_8));
        assertTrue(verify.verify(Base64.getDecoder().decode(paySign)),
                "paySign 应按微信规则可验");
    }

    @Test
    @DisplayName("PEM 加载：文件路径形式（临时文件）与内容形式等价")
    void loadMerchantPrivateKey_fromFilePath() throws Exception {
        java.nio.file.Path pemFile = java.nio.file.Files.createTempFile("wxpay-test", ".pem");
        java.nio.file.Files.writeString(pemFile, toPrivateKeyPem(merchantKeyPair.getPrivate()));
        try {
            properties.setMerchantPrivateKey(pemFile.toString());
            WxPayRequestSigner fileSigner = new WxPayRequestSigner(properties);
            // 两种来源的私钥对同一消息签名，公钥均可验证（等价性）
            String message = "POST\n/v3/test\n123\nnonce\nbody\n";
            String sig = fileSigner.signMessage(message);
            Signature verify = Signature.getInstance("SHA256withRSA");
            verify.initVerify(merchantKeyPair.getPublic());
            verify.update(message.getBytes(StandardCharsets.UTF_8));
            assertTrue(verify.verify(Base64.getDecoder().decode(sig)));
        } finally {
            java.nio.file.Files.deleteIfExists(pemFile);
        }
    }

    @Test
    @DisplayName("非法私钥 fail-fast：空值/非法 Base64/不存在文件均抛 IllegalArgumentException")
    void loadMerchantPrivateKey_invalidRejected() {
        assertThrows(IllegalArgumentException.class, () -> WxPayRequestSigner.loadMerchantPrivateKey(null));
        assertThrows(IllegalArgumentException.class, () -> WxPayRequestSigner.loadMerchantPrivateKey(""));
        assertThrows(IllegalArgumentException.class,
                () -> WxPayRequestSigner.loadMerchantPrivateKey("-----BEGIN PRIVATE KEY-----\n!!!\n-----END PRIVATE KEY-----"));
        assertThrows(IllegalArgumentException.class,
                // 不存在的文件路径：落在临时目录下的一次性子目录里，保证不存在且不依赖任何盘符
                () -> WxPayRequestSigner.loadMerchantPrivateKey(
                        java.nio.file.Paths.get(System.getProperty("java.io.tmpdir"),
                                "wxpay-signer-test-" + System.nanoTime(), "key.pem").toString()));
    }

    @Test
    @DisplayName("通知模型解析：信封 + 支付载荷 + 退款载荷（snake_case 映射）")
    void models_parseSnakeCaseJson() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        WxPayModels.WxPayNotification notification = mapper.readValue(
                "{\"id\":\"EV-1\",\"event_type\":\"TRANSACTION.SUCCESS\",\"resource\":{"
                        + "\"algorithm\":\"AEAD_AES_256_GCM\",\"ciphertext\":\"c\","
                        + "\"associated_data\":\"transaction\",\"nonce\":\"n\"}}",
                WxPayModels.WxPayNotification.class);
        assertEquals("TRANSACTION.SUCCESS", notification.eventType());
        assertEquals("transaction", notification.resource().associatedData());

        WxPayModels.WxPayTransaction tx = mapper.readValue(
                "{\"mchid\":\"m1\",\"out_trade_no\":\"VIP1\",\"transaction_id\":\"WX1\","
                        + "\"trade_state\":\"SUCCESS\",\"amount\":{\"total\":1800,\"payer_total\":1800}}",
                WxPayModels.WxPayTransaction.class);
        assertEquals("VIP1", tx.outTradeNo());
        assertEquals(1800, tx.amount().total());

        WxPayModels.WxPayRefundPayload refund = mapper.readValue(
                "{\"out_trade_no\":\"VIP1\",\"refund_id\":\"RN1\",\"refund_status\":\"SUCCESS\","
                        + "\"amount\":{\"refund\":1800,\"total\":1800}}",
                WxPayModels.WxPayRefundPayload.class);
        assertEquals("RN1", refund.refundId());
        assertEquals("SUCCESS", refund.refundStatus());
    }

    /* ==================== 辅助 ==================== */

    private static String extractParam(String header, String name) {
        Matcher matcher = Pattern.compile(name + "=\"([^\"]+)\"").matcher(header);
        return matcher.find() ? matcher.group(1) : null;
    }

    static String toPrivateKeyPem(java.security.PrivateKey privateKey) {
        String base64 = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                .encodeToString(privateKey.getEncoded());
        return "-----BEGIN PRIVATE KEY-----\n" + base64 + "\n-----END PRIVATE KEY-----\n";
    }
}
