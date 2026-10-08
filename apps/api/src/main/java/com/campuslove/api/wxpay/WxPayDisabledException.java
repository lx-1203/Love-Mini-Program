package com.campuslove.api.wxpay;

/**
 * 微信支付未启用异常（配置闸或商业化子闸关闭时的内部守卫异常）。
 *
 * <p>不直接映射 HTTP——端点层在进入业务前已经用 404 配置闸 /
 * 403 COMMERCE_DISABLED 拦截，本异常是服务层兜底（防止绕过端点直调服务）。</p>
 */
public class WxPayDisabledException extends RuntimeException {

    public WxPayDisabledException(String message) {
        super(message);
    }
}
