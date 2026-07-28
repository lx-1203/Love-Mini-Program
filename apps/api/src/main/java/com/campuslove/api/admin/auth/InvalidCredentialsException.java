package com.campuslove.api.admin.auth;

/**
 * 管理员凭据无效异常。
 *
 * <p>触发场景：
 * <ul>
 *   <li>用户名/密码为空</li>
 *   <li>用户名不存在（生产环境为防账号枚举，统一返回本异常）</li>
 *   <li>密码哈希校验失败</li>
 *   <li>用户角色不是 ADMIN</li>
 * </ul>
 * </p>
 *
 * <p>对应 HTTP 401 Unauthorized，错误码 {@code INVALID_CREDENTIALS}。</p>
 */
public class InvalidCredentialsException extends AdminAuthException {

    private static final long serialVersionUID = 1L;

    /** 标准化错误码 */
    public static final String ERROR_CODE = "INVALID_CREDENTIALS";

    /**
     * 构造凭据无效异常。
     *
     * @param message 详细错误信息
     */
    public InvalidCredentialsException(String message) {
        super(ERROR_CODE, message);
    }

    /**
     * 构造凭据无效异常（带原因）。
     *
     * @param message 详细错误信息
     * @param cause   原始异常
     */
    public InvalidCredentialsException(String message, Throwable cause) {
        super(ERROR_CODE, message, cause);
    }
}
