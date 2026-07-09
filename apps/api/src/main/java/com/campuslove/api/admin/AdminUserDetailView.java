package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 管理后台 - 用户详情视图。
 * <p>用于 GET /api/admin/users/{id} 接口返回，相比列表项扩展了个人简介、年级、代词、校园资料等字段。</p>
 *
 * @param id                用户 ID
 * @param nickname          昵称
 * @param avatarUrl         头像 URL
 * @param bio               个人简介
 * @param gradeLabel        年级标签
 * @param pronouns          代词偏好
 * @param phone             手机号（脱敏后展示）
 * @param role              角色：USER / ADMIN
 * @param status            账号状态：active / disabled
 * @param profileCompletion 资料完善度（0-100）
 * @param followingCount    关注数
 * @param followersCount    粉丝数
 * @param campusName        校区名称（来自 user_campus_profile，无则为 null）
 * @param verificationStatus 校园认证状态：draft / pending / verified / rejected
 * @param createdAt         注册时间
 * @param updatedAt         最近更新时间
 */
public record AdminUserDetailView(
        Long id,
        String nickname,
        String avatarUrl,
        String bio,
        String gradeLabel,
        String pronouns,
        String phone,
        String role,
        String status,
        Integer profileCompletion,
        Integer followingCount,
        Integer followersCount,
        String campusName,
        String verificationStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
