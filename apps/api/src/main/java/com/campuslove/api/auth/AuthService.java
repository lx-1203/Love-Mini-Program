package com.campuslove.api.auth;

/**
 * 认证服务接口。
 * 定义获取当前会话和微信登录的核心方法。
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
}
