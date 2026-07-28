package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 资源冲突异常（Task 2.5.1）。
 *
 * <p>触发场景：通用资源冲突，如唯一约束冲突、状态转换非法、
 * 重复提交等。当业务场景无法归类到具体子类时使用本异常。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 409 Conflict</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code RESOURCE_CONFLICT}</li>
 * </ul>
 */
public class ResourceConflictException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "RESOURCE_CONFLICT";

    /**
     * 构造资源冲突异常。
     *
     * @param message 错误消息
     */
    public ResourceConflictException(String message) {
        super(HttpStatus.CONFLICT, ERROR_CODE, message);
    }

    /**
     * 构造资源冲突异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public ResourceConflictException(String message, Throwable cause) {
        super(HttpStatus.CONFLICT, ERROR_CODE, message, cause);
    }
}
