package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 账号未设置密码异常（3-B/3-C 账号安全）。
 *
 * <p>触发场景：纯微信/Apple 注册的无密码账号尝试修改密码或更换手机号
 * （本接口校验旧密码，无密码账号无法走密码路径），返回明确业务错误。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 403 Forbidden</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code PASSWORD_NOT_SET}</li>
 * </ul>
 */
public class PasswordNotSetException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "PASSWORD_NOT_SET";

    /**
     * 构造账号未设置密码异常。
     *
     * @param message 错误消息（对终端用户友好）
     */
    public PasswordNotSetException(String message) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message);
    }

    /**
     * 构造账号未设置密码异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public PasswordNotSetException(String message, Throwable cause) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message, cause);
    }
}
