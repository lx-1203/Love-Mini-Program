package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 操作被禁止异常（Task 2.5.1）。
 *
 * <p>触发场景：用户尝试执行无权限的操作（如普通用户访问他人资源、
 * 未实名用户发起匹配、未签署隐私协议时调用敏感接口等）。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 403 Forbidden</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code OPERATION_FORBIDDEN}</li>
 * </ul>
 */
public class OperationForbiddenException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "OPERATION_FORBIDDEN";

    /**
     * 构造操作被禁止异常。
     *
     * @param message 错误消息
     */
    public OperationForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message);
    }

    /**
     * 构造操作被禁止异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public OperationForbiddenException(String message, Throwable cause) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message, cause);
    }
}
