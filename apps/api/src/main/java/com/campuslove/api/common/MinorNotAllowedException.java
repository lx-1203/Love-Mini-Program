package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 未成年人注册拒绝异常（3-N 未成年人保护）。
 *
 * <p>触发场景：注册请求携带的出生日期未满 18 周岁，或资料更新补填的出生日期
 * 未满 18 周岁时抛出。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 403 Forbidden</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code MINOR_NOT_ALLOWED}</li>
 * </ul>
 */
public class MinorNotAllowedException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "MINOR_NOT_ALLOWED";

    /**
     * 构造未成年人注册拒绝异常。
     *
     * @param message 错误消息（对终端用户友好）
     */
    public MinorNotAllowedException(String message) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message);
    }

    /**
     * 构造未成年人注册拒绝异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public MinorNotAllowedException(String message, Throwable cause) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message, cause);
    }
}
