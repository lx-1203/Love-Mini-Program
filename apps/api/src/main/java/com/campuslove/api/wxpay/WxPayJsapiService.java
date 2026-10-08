package com.campuslove.api.wxpay;

import com.campuslove.api.config.FeatureSwitchKeys;
import com.campuslove.api.config.FeatureSwitchService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 微信支付 JSAPI 下单 / 关单 / 退款客户端（java.net.http.HttpClient，不引 SDK）。
 *
 * <p>接口清单：</p>
 * <ul>
 *   <li>统一下单：POST /v3/pay/transactions/jsapi → prepay_id</li>
 *   <li>关单：POST /v3/pay/transactions/out-trade-no/{outTradeNo}/close</li>
 *   <li>退款：POST /v3/refund/domestic/refunds → refund_id（退款结果走异步回调）</li>
 * </ul>
 *
 * <p><b>双闸约定</b>：所有发起真实网络调用的方法内部先校验
 * {@code app.wechat-pay.enabled} 与 {@code @FeatureSwitch(COMMERCE_VIP)}（商业化子闸），
 * 任一关闭即抛 {@link WxPayDisabledException}——构造/启动期<b>不发起任何网络调用</b>，
 * HttpClient 惰性创建。</p>
 *
 * <p>错误处理：非 2xx 响应解析微信错误体（code/message）抛 {@link WxPayApiException}；
 * 网络层异常统一包装为 {@link WxPayApiException}（NETWORK_ERROR）。</p>
 */
@Service
@Profile("real")
public class WxPayJsapiService {

    private static final Logger log = LoggerFactory.getLogger(WxPayJsapiService.class);

    /** 微信支付 API 基地址（APIv3 官方域名） */
    private static final String API_BASE = "https://api.mch.weixin.qq.com";

    private final WxPayProperties properties;
    private final WxPayRequestSigner signer;
    private final FeatureSwitchService featureSwitchService;
    private final ObjectMapper objectMapper;

    /** 惰性创建的 HttpClient（构造/启动期不做任何网络相关初始化） */
    private volatile HttpClient httpClient;

    public WxPayJsapiService(WxPayProperties properties,
                             WxPayRequestSigner signer,
                             FeatureSwitchService featureSwitchService,
                             ObjectMapper objectMapper) {
        this.properties = properties;
        this.signer = signer;
        this.featureSwitchService = featureSwitchService;
        this.objectMapper = objectMapper;
    }

    /**
     * 统一下单（JSAPI）。
     *
     * @param command 下单命令（订单号 / 描述 / 金额 / openid / 通知地址）
     * @return prepay_id
     * @throws WxPayDisabledException 支付未启用（配置闸或商业化子闸关闭）
     * @throws WxPayApiException 微信 API 调用失败
     */
    public PrepayResult createJsapiOrder(CreateOrderCommand command) {
        ensureEnabled();
        String path = "/v3/pay/transactions/jsapi";

        Map<String, Object> bodyMap = new LinkedHashMap<>();
        bodyMap.put("appid", properties.getAppId());
        bodyMap.put("mchid", properties.getMchid());
        bodyMap.put("description", command.description());
        bodyMap.put("out_trade_no", command.outTradeNo());
        if (command.timeExpire() != null && !command.timeExpire().isBlank()) {
            // RFC 3339 格式（如 2026-10-05T12:00:00+08:00）
            bodyMap.put("time_expire", command.timeExpire());
        }
        bodyMap.put("notify_url", command.notifyUrl() != null && !command.notifyUrl().isBlank()
                ? command.notifyUrl() : properties.getNotifyUrl());
        bodyMap.put("amount", Map.of("total", command.totalCents(), "currency", "CNY"));
        bodyMap.put("payer", Map.of("openid", command.openid()));

        String body = writeJson(bodyMap);
        String responseBody = post(path, body);
        PrepayResponse parsed = readJson(responseBody, PrepayResponse.class);
        if (parsed == null || parsed.prepayId() == null || parsed.prepayId().isBlank()) {
            throw new WxPayApiException(200, "INVALID_RESPONSE", "统一下单响应缺少 prepay_id");
        }
        log.info("微信统一下单成功：outTradeNo={}, prepayId={}", command.outTradeNo(), parsed.prepayId());
        return new PrepayResult(parsed.prepayId());
    }

    /**
     * 关单（超时未支付订单主动关闭，防止用户在关单后仍拉起支付）。
     *
     * @param outTradeNo 商户订单号
     * @throws WxPayDisabledException 支付未启用
     * @throws WxPayApiException 微信 API 调用失败（订单已支付等场景由调用方按 code 处理）
     */
    public void closeOrder(String outTradeNo) {
        ensureEnabled();
        String path = "/v3/pay/transactions/out-trade-no/" + outTradeNo + "/close";
        Map<String, Object> bodyMap = new LinkedHashMap<>();
        bodyMap.put("mchid", properties.getMchid());
        post(path, writeJson(bodyMap));
        log.info("微信关单成功：outTradeNo={}", outTradeNo);
    }

    /**
     * 申请退款（结果通过退款回调异步通知，见 refundNotifyUrl）。
     *
     * @param command 退款命令（原订单号 / 商户退款单号 / 退款金额 / 原订单金额）
     * @return 退款受理结果（refundId + status，status=PROCESSING 表示已受理）
     * @throws WxPayDisabledException 支付未启用
     * @throws WxPayApiException 微信 API 调用失败
     */
    public RefundResult createRefund(RefundCommand command) {
        ensureEnabled();
        String path = "/v3/refund/domestic/refunds";

        Map<String, Object> bodyMap = new LinkedHashMap<>();
        bodyMap.put("out_trade_no", command.outTradeNo());
        bodyMap.put("out_refund_no", command.outRefundNo());
        bodyMap.put("notify_url", properties.getRefundNotifyUrl());
        bodyMap.put("amount", Map.of(
                "refund", command.refundCents(),
                "total", command.totalCents(),
                "currency", "CNY"));

        String responseBody = post(path, writeJson(bodyMap));
        RefundResponse parsed = readJson(responseBody, RefundResponse.class);
        if (parsed == null || parsed.refundId() == null) {
            throw new WxPayApiException(200, "INVALID_RESPONSE", "退款响应缺少 refund_id");
        }
        log.info("微信退款受理成功：outTradeNo={}, outRefundNo={}, refundId={}, status={}",
                command.outTradeNo(), command.outRefundNo(), parsed.refundId(), parsed.status());
        return new RefundResult(parsed.refundId(), parsed.outRefundNo(), parsed.status());
    }

    /**
     * 构建 wx.requestPayment 五件套（含 paySign：商户私钥按微信规则签名）。
     *
     * <p>paySign 签名串：{@code appId\ntimeStamp\nnonceStr\nprepay_id=xxx\n}
     * （SHA256withRSA，商户私钥——见 {@link WxPayRequestSigner#buildJsapiPaySign}）。</p>
     *
     * @param orderNo  商户订单号（回传给客户端用于支付后查询订单状态）
     * @param prepayId 统一下单返回的 prepay_id
     * @return 客户端拉起支付所需参数（appId/timeStamp/nonceStr/package/signType/paySign）
     */
    public JsapiPayParams buildJsapiPayParams(String orderNo, String prepayId) {
        String timeStamp = String.valueOf(System.currentTimeMillis() / 1000);
        String nonceStr = signer.newNonce();
        String paySign = signer.buildJsapiPaySign(properties.getAppId(), timeStamp, nonceStr, prepayId);
        return new JsapiPayParams(orderNo, properties.getAppId(), timeStamp, nonceStr,
                "prepay_id=" + prepayId, "RSA", paySign);
    }

    /**
     * 双闸校验：配置闸（enabled）+ 商业化子闸（COMMERCE_VIP）。
     *
     * @throws WxPayDisabledException 任一闸关闭时抛出
     */
    private void ensureEnabled() {
        if (!properties.isEnabled()) {
            throw new WxPayDisabledException("微信支付未启用（app.wechat-pay.enabled=false）");
        }
        if (!featureSwitchService.isCommerceEnabled(FeatureSwitchKeys.COMMERCE_VIP)) {
            throw new WxPayDisabledException("VIP 商业化开关处于封存态（commerce.vip=false）");
        }
    }

    /** 发送 POST 请求（自动签名 Authorization 头），返回响应体。 */
    private String post(String pathWithQuery, String body) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_BASE + pathWithQuery))
                    .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("User-Agent", "campuslove-api/0.1")
                    .header("Authorization", signer.authorizationHeader("POST", pathWithQuery, body))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient().send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status < 200 || status >= 300) {
                throw toApiException(status, response.body());
            }
            return response.body();
        } catch (java.io.IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new WxPayApiException("微信支付 API 网络调用失败: " + e.getMessage(), e);
        }
    }

    /** 将非 2xx 响应解析为业务异常（微信错误体 {code, message}）。 */
    private WxPayApiException toApiException(int status, String responseBody) {
        String code = null;
        String message = responseBody;
        try {
            ErrorResponse err = objectMapper.readValue(responseBody, ErrorResponse.class);
            if (err != null) {
                code = err.code();
                if (err.message() != null) {
                    message = err.message();
                }
            }
        } catch (Exception ignore) {
            // 非 JSON 错误体：保留原文
        }
        return new WxPayApiException(status, code, "微信支付 API 调用失败（HTTP " + status + "）: " + message);
    }

    /** 惰性 HttpClient（连接超时取配置）。 */
    private HttpClient httpClient() {
        HttpClient client = this.httpClient;
        if (client == null) {
            synchronized (this) {
                client = this.httpClient;
                if (client == null) {
                    client = HttpClient.newBuilder()
                            .connectTimeout(Duration.ofMillis(properties.getConnectTimeoutMs()))
                            .build();
                    this.httpClient = client;
                }
            }
        }
        return client;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new WxPayApiException("微信支付请求体序列化失败", e);
        }
    }

    private <T> T readJson(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new WxPayApiException(200, "INVALID_RESPONSE", "微信支付响应解析失败: " + e.getMessage());
        }
    }

    /* ========== 命令 / 结果模型 ========== */

    /** 统一下单命令 */
    public record CreateOrderCommand(
            String outTradeNo,
            String description,
            int totalCents,
            String openid,
            String timeExpire,
            String notifyUrl
    ) {
    }

    /** 统一下单结果 */
    public record PrepayResult(String prepayId) {
    }

    /**
     * wx.requestPayment 五件套（package 为 JS 侧字段名，Java 组件名用 packageValue 规避关键字，
     * 经 @JsonProperty("package") 序列化为 package）。
     */
    public record JsapiPayParams(
            String orderNo,
            String appId,
            String timeStamp,
            String nonceStr,
            @JsonProperty("package") String packageValue,
            String signType,
            String paySign
    ) {
    }

    /** 退款命令 */
    public record RefundCommand(
            String outTradeNo,
            String outRefundNo,
            int refundCents,
            int totalCents
    ) {
    }

    /** 退款受理结果 */
    public record RefundResult(String refundId, String outRefundNo, String status) {
    }

    /* ========== 微信响应体模型 ========== */

    @JsonIgnoreProperties(ignoreUnknown = true)
    record PrepayResponse(@JsonProperty("prepay_id") String prepayId) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RefundResponse(
            @JsonProperty("refund_id") String refundId,
            @JsonProperty("out_refund_no") String outRefundNo,
            @JsonProperty("out_trade_no") String outTradeNo,
            String status
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ErrorResponse(String code, String message) {
    }
}
