package com.campuslove.api.auth;

/**
 * 无效 Token 业务异常。
 *
 * <p>Task 0.5.3 新增：当 JWT 解析失败、签名无效、已过期、格式错误或缺失时抛出。
 * 由 {@link com.campuslove.api.config.GlobalExceptionHandler} 统一转换为
 * HTTP 401 + 标准 JSON 错误体（{@code UNAUTHORIZED} 错误码）。</p>
 *
 * <p>属于认证失败类异常，与 {@link TokenRevokedException}（Token 已被主动撤销）区分：
 * <ul>
 *   <li>{@link InvalidTokenException} —— Token 本身无效（无法解析/已过期/签名错误）</li>
 *   <li>{@link TokenRevokedException} —— Token 本身有效但已被加入黑名单（用户已登出）</li>
 * </ul>
 * </p>
 *
 * <p>两者最终都映射为 HTTP 401，但通过错误码区分便于前端/监控/日志分析。</p>
 */
public class InvalidTokenException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码，用于前端分支处理与监控告警 */
    public static final String ERROR_CODE = "UNAUTHORIZED";

    /**
     * 构造无效 Token 异常。
     *
     * @param message 异常详细信息（不会直接暴露给前端，由 GlobalExceptionHandler 包装）
     */
    public InvalidTokenException(String message) {
        super(message);
    }

    /**
     * 构造无效 Token 异常并携带原因。
     *
     * @param message 异常详细信息
     * @param cause   原始异常（如 ExpiredJwtException、JwtException）
     */
    public InvalidTokenException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * 获取标准化业务错误码。
     *
     * @return 错误码字符串 {@code "UNAUTHORIZED"}
     */
    public String getErrorCode() {
        return ERROR_CODE;
    }
}
