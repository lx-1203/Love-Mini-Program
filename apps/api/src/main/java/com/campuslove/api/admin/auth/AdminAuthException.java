package com.campuslove.api.admin.auth;

/**
 * 管理端认证业务异常基类。
 *
 * <p>所有管理端登录/权限相关业务异常均继承本类，统一持有 {@link #errorCode} 字段，
 * 便于 {@link com.campuslove.api.config.GlobalExceptionHandler} 返回标准化错误响应。</p>
 *
 * <p>继承自 {@link IllegalArgumentException} 以保持与历史登录校验路径的兼容性
 * （历史代码与现有 RealAuthServiceTest 用 {@code assertThrows(IllegalArgumentException.class, ...)}
 * 断言登录失败），子类异常 IS-A IllegalArgumentException，现有测试无需修改。</p>
 *
 * <p>标准化错误码：
 * <ul>
 *   <li>{@code ADMIN_DISABLED} —— 账号已被禁用</li>
 *   <li>{@code ADMIN_NOT_FOUND} —— 账号不存在</li>
 *   <li>{@code INVALID_CREDENTIALS} —— 凭据无效</li>
 *   <li>{@code UNAUTHORIZED} —— 未认证或缺少权限</li>
 * </ul>
 * </p>
 */
public class AdminAuthException extends IllegalArgumentException {

    /** 序列化版本号 */
    private static final long serialVersionUID = 1L;

    /** 标准化错误码，用于响应体与日志检索 */
    private final String errorCode;

    /**
     * 构造管理端认证异常。
     *
     * @param errorCode 标准化错误码（如 ADMIN_DISABLED）
     * @param message   详细错误信息（用于日志与响应）
     */
    public AdminAuthException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * 构造管理端认证异常（带原因）。
     *
     * @param errorCode 标准化错误码
     * @param message   详细错误信息
     * @param cause     原始异常
     */
    public AdminAuthException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    /**
     * 获取标准化错误码。
     *
     * @return 错误码字符串
     */
    public String getErrorCode() {
        return errorCode;
    }
}
