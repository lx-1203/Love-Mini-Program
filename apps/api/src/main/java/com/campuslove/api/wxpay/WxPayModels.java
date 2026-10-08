package com.campuslove.api.wxpay;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 微信支付 APIv3 回调报文模型（ envelope + 解密后业务载荷）。
 *
 * <p>两层结构：</p>
 * <ol>
 *   <li>信封 {@link WxPayNotification}：HTTP 回调请求体原文，含通知 ID、事件类型与
 *       {@link Resource}（ciphertext / associated_data / nonce）——resource 密文需用
 *       APIv3 密钥 AES-256-GCM 解密；</li>
 *   <li>解密载荷 {@link WxPayTransaction}（支付结果）与 {@link WxPayRefundPayload}
 *       （退款结果）：字段名与微信官方文档对齐（snake_case，经 @JsonProperty 映射）。</li>
 * </ol>
 */
public final class WxPayModels {

    private WxPayModels() {
    }

    /** 回调信封（请求体原文 JSON 结构） */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WxPayNotification(
            String id,
            @JsonProperty("event_type") String eventType,
            @JsonProperty("resource") Resource resource
    ) {
        /** 回调 resource（密文容器） */
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Resource(
                String algorithm,
                String ciphertext,
                @JsonProperty("associated_data") String associatedData,
                String nonce,
                @JsonProperty("original_type") String originalType
        ) {
        }
    }

    /** 支付结果通知解密载荷（transaction） */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WxPayTransaction(
            String mchid,
            String appid,
            @JsonProperty("out_trade_no") String outTradeNo,
            @JsonProperty("transaction_id") String transactionId,
            @JsonProperty("trade_type") String tradeType,
            @JsonProperty("trade_state") String tradeState,
            @JsonProperty("trade_time") String tradeTime,
            Amount amount
    ) {
        /** 金额（分） */
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Amount(
                Integer total,
                @JsonProperty("payer_total") Integer payerTotal,
                String currency
        ) {
        }
    }

    /** 退款结果通知解密载荷（refund） */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WxPayRefundPayload(
            String mchid,
            @JsonProperty("out_trade_no") String outTradeNo,
            @JsonProperty("transaction_id") String transactionId,
            @JsonProperty("out_refund_no") String outRefundNo,
            @JsonProperty("refund_id") String refundId,
            @JsonProperty("refund_status") String refundStatus,
            Amount amount
    ) {
        /** 退款金额（分） */
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Amount(
                Integer total,
                Integer refund,
                @JsonProperty("payer_total") Integer payerTotal
        ) {
        }
    }
}
