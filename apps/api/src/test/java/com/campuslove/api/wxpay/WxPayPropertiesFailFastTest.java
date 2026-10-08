package com.campuslove.api.wxpay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 微信支付配置 fail-fast 与回调 IP 白名单单元测试（无 Spring 上下文，纯逻辑）。
 */
class WxPayPropertiesFailFastTest {

    /* ==================== 配置校验（enabled fail-fast） ==================== */

    @Test
    @DisplayName("缺省配置：enabled=false 封存态，不视为缺项（不 fail-fast）")
    void disabledByDefault_noMissing() {
        WxPayProperties properties = new WxPayProperties();
        assertFalse(properties.isEnabled());
        assertTrue(properties.findMissingRequired().isEmpty(),
                "enabled=false 时不要求必填项齐全");
    }

    @Test
    @DisplayName("enabled=true 缺全部必填：findMissingRequired 列出全部缺项，checker 拒绝启动")
    void enabledMissingAll_checkerFailsFast() {
        WxPayProperties properties = new WxPayProperties();
        properties.setEnabled(true);

        List<String> missing = properties.findMissingRequired();
        assertEquals(8, missing.size(), "8 个必填项全部缺失");

        WxPayBootstrapChecker checker = new WxPayBootstrapChecker(properties);
        IllegalStateException ex = assertThrows(IllegalStateException.class, checker::afterPropertiesSet);
        assertTrue(ex.getMessage().contains("app-id"), "错误信息应列出缺失项");
    }

    @Test
    @DisplayName("enabled=true 配置齐全 + 合法密钥：checker 校验通过")
    void enabledComplete_checkerPasses() throws Exception {
        WxPayProperties properties = completeEnabledProperties();
        WxPayBootstrapChecker checker = new WxPayBootstrapChecker(properties);
        checker.afterPropertiesSet(); // 不抛异常即通过
    }

    @Test
    @DisplayName("enabled=true 但密钥格式非法：checker fail-fast（本地解析，无网络调用）")
    void enabledBadKey_checkerFailsFast() {
        WxPayProperties properties = completeEnabledProperties();
        properties.setMerchantPrivateKey("-----BEGIN PRIVATE KEY-----\n!!!\n-----END PRIVATE KEY-----");
        WxPayBootstrapChecker checker = new WxPayBootstrapChecker(properties);
        IllegalStateException ex = assertThrows(IllegalStateException.class, checker::afterPropertiesSet);
        assertTrue(ex.getMessage().contains("商户私钥"), "应明确指向私钥解析失败");
    }

    /* ==================== 回调 IP 白名单 ==================== */

    @Test
    @DisplayName("白名单为空：默认放行所有 IP（不限制，告警由日志承担）")
    void emptyWhitelist_allowsAll() {
        WxPayCallbackGuard guard = new WxPayCallbackGuard(new WxPayProperties());
        assertTrue(guard.isIpAllowed("1.2.3.4"));
        assertTrue(guard.isIpAllowed(null), "空名单下不因白名单拒绝（含 null IP）");
    }

    @Test
    @DisplayName("白名单精确 IP：匹配放行，不匹配拒绝")
    void exactIpWhitelist() {
        WxPayProperties properties = new WxPayProperties();
        properties.setCallbackIpWhitelist(List.of("162.62.1.1", " 10.0.0.5 "));
        WxPayCallbackGuard guard = new WxPayCallbackGuard(properties);

        assertTrue(guard.isIpAllowed("162.62.1.1"));
        assertTrue(guard.isIpAllowed("10.0.0.5"), "规则两端空白应被容忍");
        assertFalse(guard.isIpAllowed("192.168.1.1"));
        assertFalse(guard.isIpAllowed(null));
        assertFalse(guard.isIpAllowed(""));
    }

    @Test
    @DisplayName("白名单 CIDR：IPv4 网段匹配（含 /0、/32、/16 边界）")
    void cidrWhitelist() {
        WxPayProperties properties = new WxPayProperties();
        properties.setCallbackIpWhitelist(List.of("162.62.0.0/16", "203.0.113.7/32"));
        WxPayCallbackGuard guard = new WxPayCallbackGuard(properties);

        assertTrue(guard.isIpAllowed("162.62.99.99"), "/16 网段内应放行");
        assertTrue(guard.isIpAllowed("203.0.113.7"), "/32 精确应放行");
        assertFalse(guard.isIpAllowed("203.0.113.8"), "/32 邻址应拒绝");
        assertFalse(guard.isIpAllowed("163.62.1.1"));
    }

    @Test
    @DisplayName("IPv6 映射地址：::ffff: 前缀归一化后匹配")
    void ipv6MappedNormalization() {
        WxPayProperties properties = new WxPayProperties();
        properties.setCallbackIpWhitelist(List.of("162.62.1.1"));
        WxPayCallbackGuard guard = new WxPayCallbackGuard(properties);
        assertTrue(guard.isIpAllowed("::ffff:162.62.1.1"));
    }

    /* ==================== 辅助 ==================== */

    private static WxPayProperties completeEnabledProperties() {
        WxPayProperties properties = new WxPayProperties();
        properties.setEnabled(true);
        properties.setAppId("wx-test-appid");
        properties.setMchid("1900000001");
        properties.setMchSerialNo("SERIAL-001");
        properties.setApiV3Key("0123456789abcdef0123456789abcdef");
        properties.setNotifyUrl("https://example.com/api/v1/vip/payment-callback");
        properties.setRefundNotifyUrl("https://example.com/api/v1/refund/notify");
        // 代码内生成真实 RSA 密钥对：公钥作平台证书 PEM（X.509），私钥作商户私钥 PEM（PKCS#8），
        // 两者结构均合法，可被启动校验（WxPayBootstrapChecker 预热解析）接受
        try {
            java.security.KeyPairGenerator generator = java.security.KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            java.security.KeyPair keyPair = generator.generateKeyPair();
            String publicBase64 = Base64.getMimeEncoder(64, "\n".getBytes())
                    .encodeToString(keyPair.getPublic().getEncoded());
            properties.setPlatformCert("-----BEGIN PUBLIC KEY-----\n" + publicBase64 + "\n-----END PUBLIC KEY-----\n");
            String privateBase64 = Base64.getMimeEncoder(64, "\n".getBytes())
                    .encodeToString(keyPair.getPrivate().getEncoded());
            properties.setMerchantPrivateKey("-----BEGIN PRIVATE KEY-----\n" + privateBase64 + "\n-----END PRIVATE KEY-----\n");
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
        return properties;
    }
}
