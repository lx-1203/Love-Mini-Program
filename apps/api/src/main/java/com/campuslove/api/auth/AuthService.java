package com.campuslove.api.auth;

/**
 * 认证服务接口。
 * 定义获取当前会话、微信登录和 Token 刷新的核心方法。
 * 根据激活的 Spring Profile，由 MockAuthService 或 RealAuthService 实现。
 */
public interface AuthService {

    /**
     * 根据 JWT 令牌获取当前用户会话信息。
     *
     * @param token JWT 令牌字符串
     * @return 用户会话视图
     */
    UserSessionView getCurrentSession(String token);

    /**
     * 使用微信小程序临时登录凭证进行登录。
     *
     * @param code 微信小程序登录凭证
     * @return 用户会话视图（包含 JWT 令牌）
     */
    UserSessionView loginWithWechat(String code);

    /**
     * 刷新 JWT 令牌。
     * 验证旧令牌有效性后生成新令牌返回。
     *
     * @param oldToken 需要刷新的旧 JWT 令牌
     * @return 包含新令牌的用户会话视图
     * @throws IllegalArgumentException 如果令牌无效或已过期
     */
    UserSessionView refreshToken(String oldToken);

    /**
     * 用户登出（使 token 失效）。
     * 当前实现使用无状态 JWT，登出仅记录日志；
     * 生产环境如需 token 黑名单可在此扩展。
     *
     * @param token 当前 JWT 令牌
     */
    void logout(String token);

    /**
     * 管理员账号密码登录。
     *
     * @param username 管理员账号
     * @param password 管理员密码
     * @return 用户会话视图（包含 JWT 令牌）
     * @throws IllegalArgumentException 凭据无效或用户不是管理员
     */
    UserSessionView loginAsAdmin(String username, String password);

    /**
     * 管理员登出。语义同 logout，单独提供用于审计与未来扩展。
     *
     * @param token 当前管理员 JWT 令牌
     */
    void logoutAsAdmin(String token);
}
