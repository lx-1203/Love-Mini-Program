package com.campuslove.api.auth;

import com.campuslove.api.common.BusinessException;
import org.springframework.http.HttpStatus;

/**
 * 第三方账号绑定冲突异常（R4-00262）。
 *
 * <p>绑定第三方账号时返回的差异化业务错误码，供客户端区分失败原因：</p>
 * <ul>
 *   <li>{@link #CODE_OPENID_TAKEN}：openId 已被其他用户绑定</li>
 *   <li>{@link #CODE_ALREADY_BOUND}：当前用户已绑定该平台</li>
 * </ul>
 *
 * <p>由 {@link com.campuslove.api.config.GlobalExceptionHandler#handleBusinessException}
 * 统一转换为 HTTP 409 + 标准化 JSON 错误体（含 {@code code} 字段）。</p>
 */
public class ThirdPartyBindConflictException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /** 业务错误码：openId 已被其他用户绑定 */
    public static final String CODE_OPENID_TAKEN = "OPENID_TAKEN";

    /** 业务错误码：当前用户已绑定该平台 */
    public static final String CODE_ALREADY_BOUND = "ALREADY_BOUND";

    /**
     * 构造绑定冲突异常。
     *
     * @param errorCode 业务错误码（CODE_OPENID_TAKEN / CODE_ALREADY_BOUND）
     * @param message   面向用户的错误消息
     */
    public ThirdPartyBindConflictException(String errorCode, String message) {
        super(HttpStatus.CONFLICT, errorCode, message);
    }
}
