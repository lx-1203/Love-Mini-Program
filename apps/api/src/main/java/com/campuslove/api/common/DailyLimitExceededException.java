package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 每日限额超出异常。
 *
 * <p>SubTask 1.4.4 新增：当业务操作超出每日允许次数时抛出。
 * 典型场景：</p>
 * <ul>
 *   <li>{@code RealMatchService.rewind()} 每日限 1 次反悔操作</li>
 *   <li>未来扩展：每日点赞数上限、每日匹配次数上限等</li>
 * </ul>
 *
 * <p>由 {@link com.campuslove.api.config.GlobalExceptionHandler} 捕获并转换为
 * HTTP 429 Too Many Requests 响应，返回标准化错误码 {@link #ERROR_CODE}，
 * 便于前端按错误码做精细化提示（如"今日反悔次数已用完，明日再来"）。</p>
 *
 * <p>Task 2.5.1 改造：继承 {@link BusinessException}，统一异常层次，
 * 便于 GlobalExceptionHandler 通过基类兜底处理。</p>
 */
public class DailyLimitExceededException extends BusinessException {

    /** 序列化版本号（保持默认，未实现 Serializable 接口，仅作为预留）。 */
    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码：每日限额超出 */
    public static final String ERROR_CODE = "DAILY_LIMIT_EXCEEDED";

    /** 业务操作名称（如"反悔"、"点赞"），用于组装友好提示 */
    private final String operationName;

    /** 每日上限次数 */
    private final int dailyLimit;

    /**
     * 构造每日限额超出异常。
     *
     * @param operationName 业务操作名称（如"反悔"），用于日志与提示
     * @param dailyLimit    每日允许次数上限
     * @param message       异常详细信息
     */
    public DailyLimitExceededException(String operationName, int dailyLimit, String message) {
        super(HttpStatus.TOO_MANY_REQUESTS, ERROR_CODE, message);
        this.operationName = operationName;
        this.dailyLimit = dailyLimit;
    }

    /**
     * 构造每日限额超出异常（带原因）。
     *
     * @param operationName 业务操作名称
     * @param dailyLimit    每日允许次数上限
     * @param message       异常详细信息
     * @param cause         原始异常
     */
    public DailyLimitExceededException(String operationName, int dailyLimit, String message, Throwable cause) {
        super(HttpStatus.TOO_MANY_REQUESTS, ERROR_CODE, message, cause);
        this.operationName = operationName;
        this.dailyLimit = dailyLimit;
    }

    /**
     * 获取业务操作名称。
     *
     * @return 操作名称（如"反悔"）
     */
    public String getOperationName() {
        return operationName;
    }

    /**
     * 获取每日上限次数。
     *
     * @return 每日允许次数
     */
    public int getDailyLimit() {
        return dailyLimit;
    }
}
