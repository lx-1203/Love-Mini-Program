package com.campuslove.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 管理后台 - 创建管理员请求体（商业模式：每个高校一个管理员）。
 *
 * <p>仅超级管理员可调用（{@code @PreAuthorize("hasRole('SUPER_ADMIN')")}），
 * 用于为各高校创建校区管理员。</p>
 *
 * @param phone      手机号（唯一，登录账号）
 * @param password   初始密码（6-64 位，BCrypt 加密存储）
 * @param nickname   昵称（1-20 字）
 * @param role       角色：ADMIN（校区管理员）/ SUPER_ADMIN（全局超级管理员），默认 ADMIN
 * @param campusName 管辖校区名（可为空：null 表示全局管理员；
 *                   非空表示该校区管理员，仅能管理该校区数据）
 */
public record AdminCreateAdminRequest(
        @NotBlank(message = "手机号不能为空")
        @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确") String phone,
        @NotBlank(message = "密码不能为空")
        @Size(min = 6, max = 64, message = "密码长度须为 6-64 位") String password,
        @NotBlank(message = "昵称不能为空")
        @Size(min = 1, max = 20, message = "昵称长度须为 1-20 字") String nickname,
        @Pattern(regexp = "ADMIN|SUPER_ADMIN", message = "role 必须为 ADMIN 或 SUPER_ADMIN") String role,
        @Size(max = 128, message = "校区名长度不能超过 128 字") String campusName) {

    /**
     * 归一化角色：null 默认 ADMIN。
     *
     * @return ADMIN / SUPER_ADMIN
     */
    public String normalizedRole() {
        return role == null ? "ADMIN" : role;
    }
}
