package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 用户主表实体，对应 users 表。
 * 包含微信登录、基础资料、社交计数等字段。
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 微信 openid */
    @Column(name = "openid", length = 128)
    private String openid;

    /** 昵称 */
    @Column(name = "nickname", length = 64)
    private String nickname;

    /** 头像 URL */
    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    /** 个人简介 */
    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    /** 年级标签 */
    @Column(name = "grade_label", length = 32)
    private String gradeLabel;

    /** 代词偏好 */
    @Column(name = "pronouns", length = 32)
    private String pronouns;

    /** 手机号 */
    @Column(name = "phone", length = 32)
    private String phone;

    /** 资料完善度百分比 (0-100) */
    @Column(name = "profile_completion", nullable = false, columnDefinition = "TINYINT DEFAULT 0")
    private Integer profileCompletion = 0;

    /**
     * 用户角色
     * - USER: 普通用户（默认）
     * - ADMIN: 管理员，可访问 /api/admin/** 端点
     * 修复：原代码无角色字段，导致管理端点无法做权限校验
     */
    @Column(name = "role", length = 16, nullable = false, columnDefinition = "VARCHAR(16) DEFAULT 'USER'")
    private String role = "USER";

    /**
     * 密码哈希（支持管理员与密码登录的普通用户）。
     *
     * <p>存储 BCrypt 哈希值（格式 {@code $2a$10$...}），cost factor 为 10。
     * 微信登录的普通用户该字段为 null（无密码登录），管理员账号必须设置。</p>
     *
     * <p>Phase 3 任务 13 扩展：原 javadoc 限制为"仅管理员使用"，现扩展语义以支持
     * 未来可能开通的密码登录普通用户（如手机号+密码登录）。字段定义本身未变更，
     * 仅文档与迁移脚本 V2026.06.25.0008 明确该字段可被任何密码登录用户使用。</p>
     *
     * <p>修复历史：原架构管理员密码仅通过环境变量 ADMIN_PASSWORD 明文配置，存在安全风险。
     * 现增加数据库字段支持 BCrypt 哈希存储，由 RealAuthService 优先校验数据库哈希，
     * 环境变量作为兜底。校验通过 {@link org.springframework.security.crypto.password.PasswordEncoder#matches} 完成。</p>
     *
     * <p>历史明文兼容：V2026.06.25.0002 迁移脚本已将所有管理员密码升级为 BCrypt 哈希，
     * 但 RealAuthService#loginAsAdmin 仍保留对历史明文密码的兼容校验与自动迁移逻辑（一次性升级），
     * 以应对手工录入异常等边界场景。</p>
     */
    @Column(name = "password", length = 100)
    private String password;

    /**
     * 账号状态。
     * <p>取值：active（正常）/ disabled（禁用）。</p>
     * <p>由管理后台禁用/启用接口维护，disabled 状态的用户禁止登录与写操作。</p>
     * <p>与 role 字段正交：role 表示身份（USER/ADMIN），status 表示账号是否可用。</p>
     */
    @Column(name = "status", length = 16, nullable = false, columnDefinition = "VARCHAR(16) DEFAULT 'active'")
    private String status = "active";

    /** 关注数 */
    @Column(name = "following_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer followingCount = 0;

    /** 粉丝数 */
    @Column(name = "followers_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer followersCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public User() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOpenid() {
        return openid;
    }

    public void setOpenid(String openid) {
        this.openid = openid;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getGradeLabel() {
        return gradeLabel;
    }

    public void setGradeLabel(String gradeLabel) {
        this.gradeLabel = gradeLabel;
    }

    public String getPronouns() {
        return pronouns;
    }

    public void setPronouns(String pronouns) {
        this.pronouns = pronouns;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Integer getProfileCompletion() {
        return profileCompletion;
    }

    public void setProfileCompletion(Integer profileCompletion) {
        this.profileCompletion = profileCompletion;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    /**
     * 获取密码哈希（管理员账号及密码登录的普通用户有值）。
     * @return BCrypt 哈希字符串，微信登录用户返回 null
     */
    public String getPassword() {
        return password;
    }

    /**
     * 设置密码哈希（管理员账号及密码登录的普通用户使用）。
     * @param password BCrypt 哈希字符串
     */
    public void setPassword(String password) {
        this.password = password;
    }

    /** 是否为管理员 */
    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(role);
    }

    /** 是否为禁用状态 */
    public boolean isDisabled() {
        return "disabled".equalsIgnoreCase(status);
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getFollowingCount() {
        return followingCount;
    }

    public void setFollowingCount(Integer followingCount) {
        this.followingCount = followingCount;
    }

    public Integer getFollowersCount() {
        return followersCount;
    }

    public void setFollowersCount(Integer followersCount) {
        this.followersCount = followersCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
