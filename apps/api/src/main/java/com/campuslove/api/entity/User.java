package com.campuslove.api.entity;

import com.campuslove.api.utils.SensitiveDataMasker;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 用户主表实体，对应 users 表。
 * 包含微信登录、基础资料、社交计数等字段。
 *
 * <p>索引说明（与数据库 Flyway 脚本保持一致）：</p>
 * <ul>
 *   <li>uk_users_openid：openid 唯一索引，微信登录唯一性保证</li>
 *   <li>idx_users_phone：phone 索引，手机号登录/查询</li>
 *   <li>idx_users_created_at：created_at 索引，用户列表按时间排序</li>
 * </ul>
 *
 * <p>注：任务规格提到 school_id 索引，但 users 表实际无该字段（校区信息存于
 * user_campus_profiles 表），故跳过。详见 V2026.07.25.0001 迁移脚本说明。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "users",
    uniqueConstraints = {
        // openid 唯一约束：保证一个微信号只能注册一个账号
        @UniqueConstraint(name = "uk_users_openid", columnNames = {"openid"})
    },
    indexes = {
        // 手机号索引：用于手机号登录、按手机号查询用户
        @Index(name = "idx_users_phone", columnList = "phone"),
        // 创建时间索引：用于用户列表按注册时间排序、分页
        @Index(name = "idx_users_created_at", columnList = "created_at")
    }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 微信 openid。
     *
     * <p>FIN-00101：使用 {@link JsonIgnore} 标注，确保 User 实体在任何 JSON
     * 序列化场景下（包括 Entity 被误直接返回 Controller、日志输出、调试接口等）
     * 都不会泄露 openid 原始值。需要 openid 的业务场景应通过专用 DTO 显式传递，
     * 日志/审计请使用 {@link #getMaskedOpenid()} 获取脱敏值。</p>
     */
    @JsonIgnore
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

    /**
     * 出生日期（3-N 未成年人保护）。
     * <p>注册时必填（RegisterRequest @NotNull），服务端校验年龄 >= 18；
     * 存量用户可为 null（资料更新时由前端引导补填，后端不强制）。</p>
     */
    @Column(name = "birth_date")
    private java.time.LocalDate birthDate;

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
     * 管理员管辖校区名（商业模式：每个高校一个管理员）。
     *
     * <p>仅对 role 为 ADMIN/SUPER_ADMIN 的账号有意义：
     * <ul>
     *   <li>null —— 全局管理员（可管理全部校区数据）</li>
     *   <li>非空 —— 校区管理员，仅能管理该校区用户/内容（数据隔离由管理端点强制执行）</li>
     * </ul>
     * 校区名与 user_campus_profile.campus_name（字符串）对齐。
     * 普通用户（role=USER）该字段恒为 null。
     * </p>
     */
    @Column(name = "campus_name", length = 128)
    private String campusName;

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
     *
     * <p>Task 0.5.1 安全加固：使用 {@link JsonIgnore} 标注，确保 User 实体在任何 JSON
     * 序列化场景下（包括 Entity 被误直接返回 Controller、日志输出、调试接口等）
     * 都不会泄露密码哈希值。</p>
     */
    @JsonIgnore
    @Column(name = "password", length = 100)
    private String password;

    /**
     * 账号状态。
     * <p>取值：active（正常）/ disabled（禁用）/ deactivated（已注销，3-E）。</p>
     * <p>disabled 由管理后台禁用/启用接口维护；deactivated 由用户主动注销（个人数据已匿名化）。</p>
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

    /**
     * VIP 自动续费开关。
     * <p>由用户在 VIP 页面手动开启/关闭。
     * 开启后，VIP 到期前 24 小时自动扣款续费。
     * 默认关闭（false）。</p>
     */
    @Column(name = "auto_renew_enabled", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean autoRenewEnabled = false;

    /** 记录创建时间（用户注册时间，用于注册时长统计） */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（用户资料变更时刷新） */

    @LastModifiedDate

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     *
     * <p>由 JPA 自动维护，每次实体更新时 version 自增。
     * 并发更新冲突时抛出 {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 409 Conflict。</p>
     *
     * <p>初始值 0L，对应数据库列 {@code version BIGINT DEFAULT 0}（Flyway V2026.07.26.0003）。</p>
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;


    public User() {
    }

    public Boolean getAutoRenewEnabled() {
        return autoRenewEnabled;
    }

    public void setAutoRenewEnabled(Boolean autoRenewEnabled) {
        this.autoRenewEnabled = autoRenewEnabled;
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

    /**
     * 获取脱敏后的 openid（FIN-00101）。
     *
     * <p>供日志输出、审计落库等场景使用，避免原始 openid 泄露。
     * 脱敏规则：保留前 4 + 后 4，中间用星号替换；不足 8 位全部星号。</p>
     *
     * @return 脱敏后的 openid 字符串；openid 为 null/空时返回空串
     */
    public String getMaskedOpenid() {
        return SensitiveDataMasker.mask(openid);
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

    public java.time.LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(java.time.LocalDate birthDate) {
        this.birthDate = birthDate;
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

    public String getCampusName() {
        return campusName;
    }

    public void setCampusName(String campusName) {
        this.campusName = campusName;
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

    /** 是否为管理员（含超级管理员） */
    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(role) || "SUPER_ADMIN".equalsIgnoreCase(role);
    }

    /** 是否为超级管理员（infra R2-00025） */
    public boolean isSuperAdmin() {
        return "SUPER_ADMIN".equalsIgnoreCase(role);
    }

    /**
     * 账号是否不可用（3-E 扩展）。
     * <p>disabled（管理员禁用）与 deactivated（用户主动注销）均视为不可用：
     * 登录路径（wechat/phone/apple/guest/refresh）与 JwtAuthenticationFilter
     * 统一拒绝签发/使用 token（注销用户的会话在其注销时已被吊销，此处兜底防再登录）。</p>
     */
    public boolean isDisabled() {
        return "disabled".equalsIgnoreCase(status) || "deactivated".equalsIgnoreCase(status);
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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
