package com.campuslove.api.wxpay;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 微信支付 APIv3 配置项（app.wechat-pay.*）。
 *
 * <p><b>缺省安全</b>：{@code enabled} 默认 {@code false}（封存态）——未显式开启时
 * 所有微信支付端点（下单 / 支付回调 / 退款回调）直接 404，管道不通。</p>
 *
 * <p><b>fail-fast</b>：{@code enabled=true} 时任一必填项缺失，由
 * {@link WxPayBootstrapChecker} 在启动期抛出异常拒绝启动（不发起任何网络调用）。</p>
 *
 * <p>全部敏感项（商户私钥 / APIv3 密钥）通过环境变量注入，禁止硬编码：</p>
 * <ul>
 *   <li>APP_WXPAY_APPID —— 小程序 AppID</li>
 *   <li>APP_WXPAY_MCHID —— 商户号</li>
 *   <li>APP_WXPAY_MCH_SERIAL_NO —— 商户 API 证书序列号</li>
 *   <li>APP_WXPAY_MERCHANT_PRIVATE_KEY —— 商户私钥（PEM 文件路径 或 PEM 内容）</li>
 *   <li>APP_WXPAY_API_V3_KEY —— APIv3 密钥（32 字节，用于回调报文 AES-256-GCM 解密）</li>
 *   <li>APP_WXPAY_NOTIFY_URL —— 支付结果回调地址</li>
 *   <li>APP_WXPAY_REFUND_NOTIFY_URL —— 退款结果回调地址</li>
 *   <li>APP_WXPAY_PLATFORM_CERT —— 微信平台证书公钥（PEM 文件路径 或 PEM 内容，验回调签名）</li>
 *   <li>APP_WXPAY_CALLBACK_IP_WHITELIST —— 回调 IP 白名单（逗号分隔，空=不限制）</li>
 * </ul>
 *
 * <p><b>密钥格式约定</b>：{@code merchantPrivateKey} / {@code platformCert} 支持
 * 两种取值——以 {@code -----BEGIN} 开头视为 PEM 内容原文；否则视为 PEM 文件路径，
 * 由 {@link WxPayRequestSigner} / {@link WxPayCallbackVerifier} 启动期加载。</p>
 */
@ConfigurationProperties(prefix = "app.wechat-pay")
public class WxPayProperties {

    /**
     * 微信支付总开关（缺省 false 封存态）。
     * <p>true 但缺任一必填项时启动 fail-fast（见 {@link WxPayBootstrapChecker}）。</p>
     */
    private boolean enabled = false;

    /** 小程序 AppID（必填） */
    private String appId = "";

    /** 商户号 mchid（必填） */
    private String mchid = "";

    /** 商户 API 证书序列号（请求签名的 Authorization 头 serial_no，必填） */
    private String mchSerialNo = "";

    /**
     * 商户私钥（必填）：PEM 文件路径或 PEM 内容（PKCS#8，{@code -----BEGIN PRIVATE KEY-----}）。
     * 用于请求签名（SHA256withRSA）与 JSAPI paySign 计算。
     */
    private String merchantPrivateKey = "";

    /** APIv3 密钥（必填，32 字节）：回调 resource 密文 AES-256-GCM 解密密钥 */
    private String apiV3Key = "";

    /** 支付结果回调通知地址（必填，必须为 https 外网可达 URL） */
    private String notifyUrl = "";

    /** 退款结果回调通知地址（必填，与支付回调同源不同路径） */
    private String refundNotifyUrl = "";

    /**
     * 微信平台证书公钥（必填）：PEM 文件路径或 PEM 内容，
     * 用于校验回调请求头 Wechatpay-Signature（RSA-SHA256 验签）。
     */
    private String platformCert = "";

    /**
     * 回调 IP 白名单（选填）：允许的微信服务器出口 IP / CIDR（如 162.62.x.x 或 162.62.0.0/16）。
     * <p>空列表 = 不做 IP 限制（仅验签兜底），但每次回调会输出告警日志提醒运维补齐。</p>
     */
    private List<String> callbackIpWhitelist = new ArrayList<>();

    /** 下单接口 HTTP 连接超时（毫秒） */
    private long connectTimeoutMs = 3000;

    /** 下单/退款接口 HTTP 读超时（毫秒） */
    private long readTimeoutMs = 6000;

    /** 未支付订单有效期（分钟）：超时由定时任务关单置 CLOSED */
    private int orderExpireMinutes = 120;

    /** 回调验签时间戳最大偏移（秒）：超过视为重放攻击拒绝，官方建议 5 分钟 */
    private long callbackTimestampToleranceSeconds = 300;

    /** 必填项清单（enabled=true 时逐项校验非空）。 */
    private static final String[] REQUIRED_KEYS = {
        "app-id", "mchid", "mch-serial-no", "merchant-private-key",
        "api-v3-key", "notify-url", "refund-notify-url", "platform-cert"
    };

    /**
     * 收集 enabled=true 时缺失的必填项 key（供 fail-fast 输出明确缺失清单）。
     *
     * <p>封存态（enabled=false）不做缺项校验——缺省安全：管道未开时空配置属预期，
     * 不视为缺项（与 {@link WxPayBootstrapChecker} 的 enabled 前置闸一致）。</p>
     *
     * @return 缺失项列表（空列表表示配置齐全或处于封存态）
     */
    public List<String> findMissingRequired() {
        List<String> missing = new ArrayList<>();
        if (!enabled) {
            return missing;
        }
        if (appId == null || appId.isBlank()) {
            missing.add(REQUIRED_KEYS[0]);
        }
        if (mchid == null || mchid.isBlank()) {
            missing.add(REQUIRED_KEYS[1]);
        }
        if (mchSerialNo == null || mchSerialNo.isBlank()) {
            missing.add(REQUIRED_KEYS[2]);
        }
        if (merchantPrivateKey == null || merchantPrivateKey.isBlank()) {
            missing.add(REQUIRED_KEYS[3]);
        }
        if (apiV3Key == null || apiV3Key.isBlank()) {
            missing.add(REQUIRED_KEYS[4]);
        }
        if (notifyUrl == null || notifyUrl.isBlank()) {
            missing.add(REQUIRED_KEYS[5]);
        }
        if (refundNotifyUrl == null || refundNotifyUrl.isBlank()) {
            missing.add(REQUIRED_KEYS[6]);
        }
        if (platformCert == null || platformCert.isBlank()) {
            missing.add(REQUIRED_KEYS[7]);
        }
        return missing;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getAppId() {
        return appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public String getMchid() {
        return mchid;
    }

    public void setMchid(String mchid) {
        this.mchid = mchid;
    }

    public String getMchSerialNo() {
        return mchSerialNo;
    }

    public void setMchSerialNo(String mchSerialNo) {
        this.mchSerialNo = mchSerialNo;
    }

    public String getMerchantPrivateKey() {
        return merchantPrivateKey;
    }

    public void setMerchantPrivateKey(String merchantPrivateKey) {
        this.merchantPrivateKey = merchantPrivateKey;
    }

    public String getApiV3Key() {
        return apiV3Key;
    }

    public void setApiV3Key(String apiV3Key) {
        this.apiV3Key = apiV3Key;
    }

    public String getNotifyUrl() {
        return notifyUrl;
    }

    public void setNotifyUrl(String notifyUrl) {
        this.notifyUrl = notifyUrl;
    }

    public String getRefundNotifyUrl() {
        return refundNotifyUrl;
    }

    public void setRefundNotifyUrl(String refundNotifyUrl) {
        this.refundNotifyUrl = refundNotifyUrl;
    }

    public String getPlatformCert() {
        return platformCert;
    }

    public void setPlatformCert(String platformCert) {
        this.platformCert = platformCert;
    }

    public List<String> getCallbackIpWhitelist() {
        return callbackIpWhitelist;
    }

    public void setCallbackIpWhitelist(List<String> callbackIpWhitelist) {
        this.callbackIpWhitelist = callbackIpWhitelist;
    }

    public long getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(long connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public long getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(long readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public int getOrderExpireMinutes() {
        return orderExpireMinutes;
    }

    public void setOrderExpireMinutes(int orderExpireMinutes) {
        this.orderExpireMinutes = orderExpireMinutes;
    }

    public long getCallbackTimestampToleranceSeconds() {
        return callbackTimestampToleranceSeconds;
    }

    public void setCallbackTimestampToleranceSeconds(long callbackTimestampToleranceSeconds) {
        this.callbackTimestampToleranceSeconds = callbackTimestampToleranceSeconds;
    }
}
