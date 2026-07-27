package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 匹配已存在异常（Task 2.5.1）。
 *
 * <p>触发场景：用户尝试重复创建已存在的匹配关系（如同一个用户重复喜欢、
 * 重复发起临时聊天会话等）。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 409 Conflict</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code MATCH_ALREADY_EXISTS}</li>
 * </ul>
 */
public class MatchAlreadyExistsException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "MATCH_ALREADY_EXISTS";

    /**
     * 构造匹配已存在异常。
     *
     * @param message 错误消息
     */
    public MatchAlreadyExistsException(String message) {
        super(HttpStatus.CONFLICT, ERROR_CODE, message);
    }

    /**
     * 构造匹配已存在异常（带原因）。
     *
     * @param message 错误消息
     * @param cause   原始异常
     */
    public MatchAlreadyExistsException(String message, Throwable cause) {
        super(HttpStatus.CONFLICT, ERROR_CODE, message, cause);
    }
}
