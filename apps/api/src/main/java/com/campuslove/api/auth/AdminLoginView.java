package com.campuslove.api.auth;

/**
 * 管理后台登录响应视图（infra R2-00026 修复契约断裂）。
 *
 * <p>原实现返回 {@link UserSessionView}（小程序会话结构，无 username/role 字段），
 * 而管理后台前端按 {@code {token, user:{id,username,displayName,role}}} 消费，
 * 导致管理员登录后前端始终判定"非管理员账号"。本视图按前端契约提供载荷。</p>
 *
 * @param token JWT 令牌
 * @param user  管理员用户摘要（含 id/username/displayName/role）
 */
public record AdminLoginView(
        String token,
        AdminUserInfo user
) {

    /**
     * 管理员用户摘要。
     *
     * @param id          用户 ID
     * @param username    登录用户名（user.openid 字段）
     * @param displayName 显示名
     * @param role        角色（ADMIN / SUPER_ADMIN）
     */
    public record AdminUserInfo(
            Long id,
            String username,
            String displayName,
            String role
    ) {
    }
}
