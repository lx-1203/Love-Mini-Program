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
     * 注销账号（PIPL 第 47 条删除权；幂等、可重跑）。
     *
     * <p>流程：校验旧密码（无密码账号校验 confirmationText 替代）→
     * 按 {@code PersonalDataTables} 清除清单删除/匿名化主体的全部关联数据
     * （与 {@code PersonalDataService} 的导出清单同源，含实名与校园认证材料）→
     * users 行墓碑化（openid 换随机墓碑、nickname 常量、phone 置 NULL、
     * 出生日期/坐标/校区/密码散列全部销毁、自动续费关闭）→ 吊销该用户全部 token。</p>
     *
     * <p>重复调用不抛异常：清单里每条语句都是幂等的 DELETE/SET 常量，
     * 用于「上一次中途失败、数据只删了一半」的修复路径。</p>
     *
     * @param userId           当前用户 ID
     * @param password         旧密码（有密码账号必填；无密码账号可空，由 confirmationText 替代）
     * @param confirmationText 注销确认文本（无密码账号必填）
     * @param currentToken     当前请求的 JWT（吊销当前会话用，可空）
     */
    void deactivateAccount(Long userId, String password, String confirmationText, String currentToken);
}
