package com.campuslove.api.wxpay;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.InvalidKeyException;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.SignatureException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 微信支付 APIv3 请求签名器（SHA256withRSA，JDK 内置实现，不引 SDK）。
 *
 * <p>官方签名串格式（逐段 \n 结尾，含最后一段）：</p>
 * <pre>
 * HTTP_METHOD\n
 * URL_PATH(with query)\n
 * TIMESTAMP\n
 * NONCE\n
 * BODY\n
 * </pre>
 *
 * <p>Authorization 请求头官方格式：</p>
 * <pre>
 * WECHATPAY2-SHA256-RSA2048 mchid="商户号",nonce_str="随机串",
 * signature="签名",timestamp="时间戳",serial_no="商户证书序列号"
 * </pre>
 *
 * <p>另承担 JSAPI 小程序拉起支付的 paySign 计算（wx.requestPayment 五件套之一），
 * 签名串为 {@code appId\ntimeStamp\nnonceStr\nprepay_id=xxx\n}（同样 SHA256withRSA、商户私钥）。</p>
 */
@Component
@Profile("real")
public class WxPayRequestSigner {

    private static final Logger log = LoggerFactory.getLogger(WxPayRequestSigner.class);

    /** Authorization 头 scheme 前缀（官方规范） */
    public static final String AUTH_SCHEME = "WECHATPAY2-SHA256-RSA2048";

    /** SHA256withRSA JCA 算法名 */
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";

    private final WxPayProperties properties;
    /** 商户私钥（构造时从配置解析；格式非法在启动期由 WxPayBootstrapChecker 拦截） */
    private final PrivateKey privateKey;

    public WxPayRequestSigner(WxPayProperties properties) {
        this.properties = properties;
        String pem = properties.getMerchantPrivateKey();
        if (pem == null || pem.isBlank()) {
            // 封存态（enabled=false）缺省安全：允许空私钥构造（管道未开，所有发起方法内部
            // ensureEnabled 兜底拒绝）；enabled=true 时由 WxPayBootstrapChecker fail-fast 拦截
            this.privateKey = null;
            log.warn("微信支付商户私钥未配置，请求签名不可用（封存态属预期；enabled=true 时启动校验将拦截）");
        } else {
            this.privateKey = loadMerchantPrivateKey(pem);
        }
        log.info("微信支付请求签名器初始化完成：mchid={}, serialNo={}",
                properties.getMchid(), properties.getMchSerialNo());
    }

    /**
     * 构造完整 Authorization 请求头。
     *
     * @param method       HTTP 方法（如 POST）
     * @param pathWithQuery URL 路径（含 query，如 /v3/pay/transactions/jsapi）
     * @param body         请求体原文（GET 等空体传 ""）
     * @return Authorization 头值（WECHATPAY2-SHA256-RSA2048 mchid="...",...）
     */
    public String authorizationHeader(String method, String pathWithQuery, String body) {
        long timestamp = System.currentTimeMillis() / 1000;
        String nonce = newNonce();
        String message = buildRequestMessage(method, pathWithQuery, timestamp, nonce, body);
        String signature = signMessage(message);
        return AUTH_SCHEME
                + " mchid=\"" + properties.getMchid() + "\""
                + ",nonce_str=\"" + nonce + "\""
                + ",signature=\"" + signature + "\""
                + ",timestamp=\"" + timestamp + "\""
                + ",serial_no=\"" + properties.getMchSerialNo() + "\"";
    }

    /**
     * 构造官方请求签名串：METHOD\nURL\nTIMESTAMP\nNONCE\nBODY\n
     * （每段均以 \n 结尾，包括最后一段——官方文档要求）。
     */
    public String buildRequestMessage(String method, String pathWithQuery,
                                      long timestamp, String nonce, String body) {
        return method + "\n"
                + pathWithQuery + "\n"
                + timestamp + "\n"
                + nonce + "\n"
                + (body == null ? "" : body) + "\n";
    }

    /**
     * 商户私钥签名（SHA256withRSA），返回 Base64 签名。
     *
     * @param message 待签名串（按官方规则拼装，结尾含 \n）
     * @return Base64 编码签名
     * @throws IllegalStateException 私钥未加载或签名失败（配置/密钥错误）
     */
    public String signMessage(String message) {
        if (privateKey == null) {
            throw new IllegalStateException("微信支付商户私钥未加载，无法签名");
        }
        try {
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initSign(privateKey);
            signature.update(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(signature.sign());
        } catch (NoSuchAlgorithmException | InvalidKeyException | SignatureException e) {
            throw new IllegalStateException("微信支付请求签名失败: " + e.getMessage(), e);
        }
    }

    /**
     * 计算 JSAPI 拉起支付的 paySign（wx.requestPayment 五件套之一）。
     *
     * <p>签名串：{@code appId\ntimeStamp\nnonceStr\npackage\n}（package 为
     * {@code prepay_id=xxx} 原文，结尾同样含 \n），商户私钥 SHA256withRSA。</p>
     *
     * @param appId     小程序 AppID
     * @param timeStamp 秒级时间戳（字符串）
     * @param nonceStr  随机串
     * @param prepayId  统一下单返回的 prepay_id
     * @return Base64 paySign
     */
    public String buildJsapiPaySign(String appId, String timeStamp, String nonceStr, String prepayId) {
        String paySignMessage = (appId == null ? "" : appId) + "\n"
                + timeStamp + "\n"
                + nonceStr + "\n"
                + "prepay_id=" + prepayId + "\n";
        return signMessage(paySignMessage);
    }

    /** 生成 32 位随机 nonce（官方建议随机串即可，未限制字符集）。 */
    public String newNonce() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 解析商户私钥（PKCS#8 PEM）。
     *
     * <p>支持两种取值：以 {@code -----BEGIN} 开头视为 PEM 内容原文；
     * 否则视为 PEM 文件路径（从磁盘读取）。</p>
     *
     * @param source 配置值（PEM 内容或文件路径）
     * @return 私钥实例
     * @throws IllegalArgumentException PEM 缺失/格式非法/文件不可读时抛出
     */
    public static PrivateKey loadMerchantPrivateKey(String source) {
        String pem = readPem(source, "merchant-private-key");
        pem = stripPemHeaders(pem);
        byte[] decoded;
        try {
            decoded = Base64.getMimeDecoder().decode(pem);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("商户私钥 Base64 解码失败（需 PKCS#8 PEM）", e);
        }
        try {
            KeyFactory factory = KeyFactory.getInstance("RSA");
            return factory.generatePrivate(new PKCS8EncodedKeySpec(decoded));
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalArgumentException("商户私钥解析失败（需 PKCS#8 格式，"
                    + "PKCS#1 请先转换: openssl pkcs8 -topk8 -nocrypt）", e);
        }
    }

    /**
     * 读取 PEM 文本：PEM 内容原文或文件路径统一返回 PEM 文本。
     *
     * @param source 配置值
     * @param name   配置项名（用于错误提示）
     * @return PEM 文本
     */
    static String readPem(String source, String name) {
        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException("微信支付配置 " + name + " 为空");
        }
        String trimmed = source.trim();
        if (trimmed.startsWith("-----BEGIN")) {
            // 直接是 PEM 内容（环境变量注入场景）
            return trimmed;
        }
        // 视为文件路径
        try {
            return Files.readString(Path.of(trimmed), StandardCharsets.UTF_8).trim();
        } catch (IOException e) {
            throw new IllegalArgumentException("微信支付配置 " + name
                    + " 既不是 PEM 内容也无法作为文件读取: " + trimmed, e);
        }
    }

    /** 去除 PEM 头尾行与空白，仅保留 Base64 主体。 */
    static String stripPemHeaders(String pem) {
        return pem.replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replaceAll("\\s", "");
    }
}
