package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 操作非法异常（Task 2.5.1）。
 *
 * <p>触发场景：业务规则不允许的操作，如：</p>
 * <ul>
 *   <li>状态机非法转换（如已结束的会话尝试发消息）</li>
 *   <li>资料未完善时尝试匹配</li>
 *   <li>非 VIP 用户访问付费功能</li>
 *   <li>传入参数语义非法（无法用 {@code @Valid} 静态校验捕获）</li>
 * </ul>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 422 Unprocessable Entity</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code INVALID_OPERATION}</li>
 * </ul>
 */
public class InvalidOperationException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "INVALID_OPERATION";

    /**
     * 构造操作非法异常。
     *
     * @param message 错误消息
     */
    public InvalidOperationException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, ERROR_CODE, message);
    }

    /**
     * 构造操作非法异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public InvalidOperationException(String message, Throwable cause) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, ERROR_CODE, message, cause);
    }
}
