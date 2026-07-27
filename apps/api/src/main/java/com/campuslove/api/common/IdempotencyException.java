package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 幂等性冲突异常（Task 2.4.3）。
 *
 * <p>触发场景：客户端使用相同 {@code Idempotency-Key} 重复发起写请求，
 * 由 {@link IdempotentInterceptor} 检测到 Redis 中已存在对应幂等记录时抛出。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 409 Conflict</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code IDEMPOTENT_CONFLICT}</li>
 * </ul>
 */
public class IdempotencyException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码 */
    public static final String ERROR_CODE = "IDEMPOTENT_CONFLICT";

    /**
     * 构造幂等性冲突异常。
     *
     * @param message 错误消息
     */
    public IdempotencyException(String message) {
        super(HttpStatus.CONFLICT, ERROR_CODE, message);
    }
}
