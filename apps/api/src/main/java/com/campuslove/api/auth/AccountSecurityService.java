package com.campuslove.api.auth;

/**
 * 账号安全服务接口（3-B 修改密码 / 3-C 更换手机号 / 3-E 注销账号）。
 *
 * <p>所有操作基于当前登录用户（userId 由 Controller 从 JWT 上下文获取），
 * 修改成功后吊销该用户全部 token（设备会话 jti 黑名单），强制重新登录。
 * 根据激活的 Spring Profile，由 RealAccountSecurityService 或 MockAccountSecurityService 实现。</p>
 */
public interface AccountSecurityService {

    /**
     * 修改密码。
     *
     * <p>流程：校验旧密码（PasswordEncoder.matches）→ 更新密码（BCrypt）→
     * 吊销该用户全部 token（含当前 token，强制重新登录）。</p>
     *
     * @param userId      当前用户 ID
     * @param oldPassword 旧密码（必须匹配）
     * @param newPassword 新密码（6-64 位）
     * @param currentToken 当前请求的 JWT（吊销当前会话用，可空）
     * @throws com.campuslove.api.common.OperationForbiddenException 旧密码错误
     * @throws com.campuslove.api.common.OperationForbiddenException 无密码账号（纯 wechat/apple 注册）
     */
    void changePassword(Long userId, String oldPassword, String newPassword, String currentToken);

    /**
     * 更换手机号（本期实现「验旧密码」路径）。
     *
     * <p>请求体预留 verificationCode 字段（后续接 SMS 服务无需改契约），
     * 本期 password 必填；校验新手机号未被占用（uk_users_phone 唯一）后更新。</p>
     *
     * @param userId   当前用户 ID
     * @param password 旧密码（必须匹配；无密码账号无法走本路径）
     * @param newPhone 新手机号（^1[3-9]\d{9}$）
     * @throws com.campuslove.api.common.ResourceConflictException 新手机号已被占用
     */
    void changePhone(Long userId, String password, String newPhone);

    /**
     * 注销账号（幂等）。
     *
     * <p>流程：校验旧密码（无密码账号校验 confirmationText 替代）→
     * users.status=deactivated + 昵称/头像/手机号匿名化 → 吊销该用户全部 token。</p>
     *
     * @param userId           当前用户 ID
     * @param password         旧密码（有密码账号必填；无密码账号可空，由 confirmationText 替代）
     * @param confirmationText 注销确认文本（无密码账号必填）
     * @param currentToken     当前请求的 JWT（吊销当前会话用，可空）
     */
    void deactivateAccount(Long userId, String password, String confirmationText, String currentToken);
}
