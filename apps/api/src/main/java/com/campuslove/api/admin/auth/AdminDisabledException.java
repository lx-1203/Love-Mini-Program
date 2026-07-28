package com.campuslove.api.admin.auth;

/**
 * 管理员账号已被禁用异常。
 *
 * <p>触发场景：登录时 {@code User.status='disabled'}，账号被管理员禁用后尝试登录。
 * 对应 HTTP 403 Forbidden，错误码 {@code ADMIN_DISABLED}。</p>
 *
 * <p>注意：本异常不继承 {@link org.springframework.security.access.AccessDeniedException}，
 * 避免被 Spring Security 的 ExceptionTranslationFilter 提前拦截而绕过
 * {@link com.campuslove.api.config.GlobalExceptionHandler} 的统一错误响应。</p>
 */
public class AdminDisabledException extends AdminAuthException {

    private static final long serialVersionUID = 1L;

    /** 标准化错误码 */
    public static final String ERROR_CODE = "ADMIN_DISABLED";

    /**
     * 构造管理员账号禁用异常。
     *
     * @param message 详细错误信息
     */
    public AdminDisabledException(String message) {
        super(ERROR_CODE, message);
    }

    /**
     * 构造管理员账号禁用异常（带原因）。
     *
     * @param message 详细错误信息
     * @param cause   原始异常
     */
    public AdminDisabledException(String message, Throwable cause) {
        super(ERROR_CODE, message, cause);
    }
}
