package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 资源不存在异常（Task 2.5.1）。
 *
 * <p>触发场景：通用资源未找到（帖子、活动、消息、圈子等），
 * 当业务场景无法归类到 {@link UserNotFoundException} 等具体子类时使用本异常。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 404 Not Found</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code RESOURCE_NOT_FOUND}</li>
 * </ul>
 */
public class ResourceNotFoundException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "RESOURCE_NOT_FOUND";

    /**
     * 构造资源不存在异常。
     *
     * @param message 错误消息
     */
    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, ERROR_CODE, message);
    }

    /**
     * 构造资源不存在异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public ResourceNotFoundException(String message, Throwable cause) {
        super(HttpStatus.NOT_FOUND, ERROR_CODE, message, cause);
    }
}
