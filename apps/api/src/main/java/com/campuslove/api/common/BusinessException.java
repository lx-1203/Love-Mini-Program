package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 业务异常基类（Task 2.5.1）。
 *
 * <p>所有可预期的业务错误 SHALL 继承本类，并携带：</p>
 * <ul>
 *   <li>{@link #errorCode}：标准化业务错误码（如 {@code USER_NOT_FOUND}），
 *       便于前端按错误码做精细化分支处理</li>
 *   <li>{@link #httpStatus}：对应 HTTP 状态码（如 404 / 409 / 422）</li>
 *   <li>{@link #message}：人类可读的错误消息（继承自 {@link RuntimeException}）</li>
 * </ul>
 *
 * <p>由 {@link com.campuslove.api.config.GlobalExceptionHandler} 统一捕获并转换为
 * 标准化 JSON 错误响应。生产环境不暴露堆栈，仅记录日志。</p>
 *
 * <p>典型子类：</p>
 * <ul>
 *   <li>{@link UserNotFoundException} —— 用户不存在（404）</li>
 *   <li>{@link MatchAlreadyExistsException} —— 匹配已存在（409）</li>
 *   <li>{@link DailyLimitExceededException} —— 每日限额超出（429，已有）</li>
 *   <li>{@link ResourceConflictException} —— 资源冲突（409）</li>
 *   <li>{@link OperationForbiddenException} —— 操作被禁止（403）</li>
 *   <li>{@link InvalidOperationException} —— 操作非法（422）</li>
 * </ul>
 *
 * @since P2 / Task 2.5.1
 */
public abstract class BusinessException extends RuntimeException {

    /** 序列化版本号（保持默认，未实现 Serializable 接口，仅作为预留） */
    private static final long serialVersionUID = 1L;

    /** 对应的 HTTP 状态码 */
    private final HttpStatus httpStatus;

    /** 标准化业务错误码（如 USER_NOT_FOUND） */
    private final String errorCode;

    /**
     * 构造业务异常。
     *
     * @param httpStatus 对应的 HTTP 状态码
     * @param errorCode  标准化业务错误码
     * @param message    人类可读错误消息
     */
    protected BusinessException(HttpStatus httpStatus, String errorCode, String message) {
        super(message);
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }

    /**
     * 构造业务异常（带原因）。
     *
     * @param httpStatus 对应的 HTTP 状态码
     * @param errorCode  标准化业务错误码
     * @param message    人类可读错误消息
     * @param cause      原始异常
     */
    protected BusinessException(HttpStatus httpStatus, String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }

    /**
     * 获取对应的 HTTP 状态码。
     *
     * @return HTTP 状态码
     */
    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    /**
     * 获取标准化业务错误码。
     *
     * @return 业务错误码字符串
     */
    public String getErrorCode() {
        return errorCode;
    }
}
