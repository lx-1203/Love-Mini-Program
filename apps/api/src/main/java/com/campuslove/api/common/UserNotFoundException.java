package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 用户不存在异常（Task 2.5.1）。
 *
 * <p>触发场景：根据 userId / openId 查询用户实体时未找到对应记录。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 404 Not Found</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code USER_NOT_FOUND}</li>
 * </ul>
 */
public class UserNotFoundException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "USER_NOT_FOUND";

    /**
     * 构造用户不存在异常。
     *
     * @param userId 未找到的用户 ID
     */
    public UserNotFoundException(Long userId) {
        super(HttpStatus.NOT_FOUND, ERROR_CODE, "用户不存在: " + userId);
    }

    /**
     * 构造用户不存在异常（自定义消息）。
     *
     * @param message 错误消息
     */
    public UserNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, ERROR_CODE, message);
    }

    /**
     * 构造用户不存在异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public UserNotFoundException(String message, Throwable cause) {
        super(HttpStatus.NOT_FOUND, ERROR_CODE, message, cause);
    }
}
