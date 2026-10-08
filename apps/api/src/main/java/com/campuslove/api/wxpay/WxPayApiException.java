package com.campuslove.api.wxpay;

/**
 * 微信支付 API 调用异常（统一下单 / 关单 / 退款接口返回非 2xx 或响应不可解析时抛出）。
 *
 * <p>携带 HTTP 状态码与微信错误码（{@code code}），便于上层按
 * {@code SYSTEM_ERROR / RATELIMIT_EXCEEDED / ORDER_CLOSED} 等决定是否重试或关单。</p>
 */
public class WxPayApiException extends RuntimeException {

    /** 微信 API HTTP 状态码 */
    private final int httpStatus;

    /** 微信错误码（响应体 code 字段，可能为空） */
    private final String code;

    public WxPayApiException(int httpStatus, String code, String message) {
        super(message);
        this.httpStatus = httpStatus;
        this.code = code;
    }

    public WxPayApiException(String message, Throwable cause) {
        super(message, cause);
        this.httpStatus = -1;
        this.code = "NETWORK_ERROR";
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getCode() {
        return code;
    }
}
