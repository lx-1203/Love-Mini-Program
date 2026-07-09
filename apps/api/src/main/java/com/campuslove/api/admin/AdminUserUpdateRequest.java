package com.campuslove.api.admin;

import jakarta.validation.constraints.Size;

/**
 * 管理后台 - 编辑用户请求体。
 * <p>用于 PUT /api/admin/users/{id} 接口。</p>
 * <p>仅允许管理员修改用户的非敏感字段（昵称、简介、年级、代词、状态）。
 * 角色、密码、openid 等敏感字段不允许通过此接口修改。</p>
 *
 * @param nickname   新昵称（可为 null 表示不修改，长度 ≤ 64）
 * @param bio        新个人简介（可为 null，长度 ≤ 500）
 * @param gradeLabel 年级标签（可为 null，长度 ≤ 32）
 * @param pronouns   代词偏好（可为 null，长度 ≤ 32）
 * @param status     账号状态（active/disabled，可为 null 表示不修改）
 */
public record AdminUserUpdateRequest(
        @Size(max = 64) String nickname,
        @Size(max = 500) String bio,
        @Size(max = 32) String gradeLabel,
        @Size(max = 32) String pronouns,
        String status
) {
}
