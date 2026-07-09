package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 管理后台 - 用户列表项视图。
 * <p>用于 GET /api/admin/users 分页列表展示，包含基础信息、角色、状态及注册时间。</p>
 *
 * @param id                用户 ID
 * @param nickname          昵称
 * @param avatarUrl         头像 URL
 * @param phone             手机号（脱敏后展示，如 138****1234）
 * @param role              角色：USER / ADMIN
 * @param status            账号状态：active / disabled
 * @param profileCompletion 资料完善度（0-100）
 * @param followingCount    关注数
 * @param followersCount    粉丝数
 * @param createdAt         注册时间
 */
public record AdminUserSummaryView(
        Long id,
        String nickname,
        String avatarUrl,
        String phone,
        String role,
        String status,
        Integer profileCompletion,
        Integer followingCount,
        Integer followersCount,
        LocalDateTime createdAt
) {
}
