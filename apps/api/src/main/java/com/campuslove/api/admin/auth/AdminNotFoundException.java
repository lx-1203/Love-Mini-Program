package com.campuslove.api.admin.auth;

/**
 * 管理员账号不存在异常。
 *
 * <p>触发场景：登录时根据 username/openid 查询不到对应管理员账号。
 * 对应 HTTP 404 Not Found，错误码 {@code ADMIN_NOT_FOUND}。</p>
 *
 * <p>安全考虑：生产环境中为防止账号枚举攻击，通常将"账号不存在"与"密码错误"统一返回
 * {@link InvalidCredentialsException}（INVALID_CREDENTIALS）。本异常供内部日志、审计
 * 与未来精细化错误处理使用，对外响应可由 GlobalExceptionHandler 决定是否合并。</p>
 */
public class AdminNotFoundException extends AdminAuthException {

    private static final long serialVersionUID = 1L;

    /** 标准化错误码 */
    public static final String ERROR_CODE = "ADMIN_NOT_FOUND";

    /**
     * 构造管理员账号不存在异常。
     *
     * @param message 详细错误信息
     */
    public AdminNotFoundException(String message) {
        super(ERROR_CODE, message);
    }

    /**
     * 构造管理员账号不存在异常（带原因）。
     *
     * @param message 详细错误信息
     * @param cause   原始异常
     */
    public AdminNotFoundException(String message, Throwable cause) {
        super(ERROR_CODE, message, cause);
    }
}
