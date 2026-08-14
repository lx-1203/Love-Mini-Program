package com.campuslove.api.block;

import com.campuslove.api.common.BusinessException;
import org.springframework.http.HttpStatus;

/**
 * 拉黑拦截业务异常（3-F 拉黑）。
 *
 * <p>触发场景：消息发送时任一方已拉黑对方（我拉黑对方或对方拉黑我），
 * 消息发送被拦截。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 403 Forbidden</li>
 *   <li>错误码：{@link #ERROR_CODE} = {@code BLOCKED}</li>
 * </ul>
 */
public class BlockedException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码：BLOCKED */
    public static final String ERROR_CODE = "BLOCKED";

    /**
     * 构造拉黑拦截异常。
     *
     * @param message 错误消息
     */
    public BlockedException(String message) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message);
    }
}
