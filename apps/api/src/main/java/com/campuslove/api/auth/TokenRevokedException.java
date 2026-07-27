package com.campuslove.api.auth;

/**
 * Token 已撤销业务异常。
 *
 * <p>Task 0.5.3 新增：当 JWT 已被加入 Redis 黑名单（用户主动登出）后，
 * 仍尝试使用该 JWT 访问受保护资源时抛出。由
 * {@link com.campuslove.api.config.GlobalExceptionHandler} 统一转换为
 * HTTP 401 + 标准 JSON 错误体（{@code TOKEN_REVOKED} 错误码）。</p>
 *
 * <p>触发场景：</p>
 * <ul>
 *   <li>用户点击"退出登录"后，原 JWT jti 被 {@link TokenBlacklistService#revoke} 加入黑名单</li>
 *   <li>后续请求携带原 JWT 时，{@link com.campuslove.api.config.JwtAuthenticationFilter}
 *       通过 {@link TokenBlacklistService#isRevoked} 检测到 jti 在黑名单中</li>
 *   <li>过滤器抛出本异常，由全局异常处理器或 AuthenticationEntryPoint 转换为 401 响应</li>
 * </ul>
 *
 * <p>与 {@link InvalidTokenException} 的区别：本异常表示 Token 本身签名/有效期均正常，
 * 仅因被主动撤销而拒绝；后者表示 Token 本身已失效（无法解析/过期/签名错误）。
 * 两者最终都映射为 HTTP 401，但错误码不同，便于前端按场景提示用户重新登录。</p>
 */
public class TokenRevokedException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** 标准化业务错误码，用于前端分支处理与监控告警 */
    public static final String ERROR_CODE = "TOKEN_REVOKED";

    /**
     * 构造 Token 已撤销异常。
     *
     * @param message 异常详细信息（不会直接暴露给前端，由 GlobalExceptionHandler 包装）
     */
    public TokenRevokedException(String message) {
        super(message);
    }

    /**
     * 构造 Token 已撤销异常并携带原因。
     *
     * @param message 异常详细信息
     * @param cause   原始异常
     */
    public TokenRevokedException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * 获取标准化业务错误码。
     *
     * @return 错误码字符串 {@code "TOKEN_REVOKED"}
     */
    public String getErrorCode() {
        return ERROR_CODE;
    }
}
