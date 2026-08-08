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
     * R4-00304 注释更新：登出已将 JWT 的 jti 加入黑名单（TokenBlacklistService，
     * Redis + 本地内存降级），不再是无状态仅记录日志的旧语义。
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
     * 注册新用户（手机号 + 密码 + 昵称）。
     *
     * <p>参考 eladmin 的账号注册模式:手机号作为登录账号,密码 BCrypt 加密存储。
     * 注册成功后直接签发 JWT 会话(与微信登录一致),无需再次登录。</p>
     *
     * @param phone    手机号(唯一,格式校验)
     * @param password 密码(6-64 位)
     * @param nickname 昵称(1-20 字)
     * @return 用户会话视图(包含 JWT 令牌)
     * @throws IllegalArgumentException 手机号已注册/参数非法时抛出
     */
    UserSessionView registerUser(String phone, String password, String nickname);

    /**
     * 手机号 + 密码登录。
     *
     * @param phone    手机号
     * @param password 密码
     * @return 用户会话视图(包含 JWT 令牌)
     * @throws IllegalArgumentException 凭据无效时抛出
     */
    UserSessionView loginWithPhone(String phone, String password);

    /**
     * 体验账号一键登录（临时体验号）。
     *
     * <p>用于登录页「一键体验全部功能」：首次调用自动创建固定体验账号，
     * 后续复用该账号（幂等），并直接签发 JWT 会话，无需注册/输入密码。</p>
     *
     * <p>安全说明：体验账号使用随机密码（不可通过手机号密码登录），
     * 上线前可通过配置 {@code app.guest-login.enabled=false} 关闭该入口。</p>
     *
     * @return 用户会话视图(包含 JWT 令牌)
     * @throws IllegalStateException 体验登录入口被禁用时抛出
     */
    UserSessionView loginAsGuest();

    /**
     * 管理员登出。语义同 logout，单独提供用于审计与未来扩展。
     *
     * @param token 当前管理员 JWT 令牌
     */
    void logoutAsAdmin(String token);
}
