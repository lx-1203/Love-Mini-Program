package com.campuslove.api.auth;

import org.springframework.http.HttpStatus;

/**
 * 微信登录业务异常。
 *
 * <p>携带明确的业务错误码，供 {@link com.campuslove.api.config.GlobalExceptionHandler}
 * 转换为标准化 JSON 错误响应。前端依据 error 字段做分支处理（重新拉起登录、
 * 提示账号禁用、提示微信服务不可用等）。</p>
 *
 * <p>业务错误码：</p>
 * <ul>
 *   <li>{@link ErrorCode#INVALID_CODE}：微信 code 失效或已过期（errcode 40029）</li>
 *   <li>{@link ErrorCode#WECHAT_API_ERROR}：微信 API 调用失败（网络错误 / 其他 errcode）</li>
 *   <li>{@link ErrorCode#USER_DISABLED}：用户已被管理员禁用，禁止登录</li>
 * </ul>
 *
 * <p>HTTP 状态码映射：</p>
 * <ul>
 *   <li>INVALID_CODE → 401 Unauthorized</li>
 *   <li>WECHAT_API_ERROR → 502 Bad Gateway</li>
 *   <li>USER_DISABLED → 403 Forbidden</li>
 * </ul>
 */
public class WechatLoginException extends RuntimeException {

    /**
     * 微信登录业务错误码枚举。
     * 每个错误码绑定固定的 HTTP 状态码与默认用户友好消息。
     */
    public enum ErrorCode {
        /** 微信 code 失效或已过期（errcode 40029），需重新拉起 wx.login */
        INVALID_CODE(HttpStatus.UNAUTHORIZED, "微信登录凭证已失效，请重新登录"),

        /** 微信 API 调用失败（网络异常 / 其他非 0 errcode） */
        WECHAT_API_ERROR(HttpStatus.BAD_GATEWAY, "微信服务暂时不可用，请稍后重试"),

        /** 用户已被管理员禁用，禁止登录 */
        USER_DISABLED(HttpStatus.FORBIDDEN, "账号已被禁用，请联系管理员");

        private final HttpStatus status;
        private final String default_message;

        ErrorCode(HttpStatus status, String message) {
            this.status = status;
            this.default_message = message;
        }

        public HttpStatus getStatus() {
            return status;
        }

        public String getDefaultMessage() {
            return default_message;
        }
    }

    private final ErrorCode errorCode;

    /**
     * 使用错误码默认消息构造异常。
     *
     * @param errorCode 业务错误码
     */
    public WechatLoginException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    /**
     * 使用错误码 + 自定义消息构造异常。
     *
     * @param errorCode 业务错误码
     * @param message   自定义错误消息（如包含 errcode 详情）
     */
    public WechatLoginException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * 使用错误码 + 自定义消息 + 原因构造异常。
     *
     * @param errorCode 业务错误码
     * @param message   自定义错误消息
     * @param cause     原始异常（如 WeChatAuthException）
     */
    public WechatLoginException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public HttpStatus getStatus() {
        return errorCode.getStatus();
    }
}
