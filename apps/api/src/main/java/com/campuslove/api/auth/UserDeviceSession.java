package com.campuslove.api.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 用户登录设备会话实体，对应 user_device_session 表（3-D 设备管理）。
 *
 * <p>登录成功时按 (user_id, device_id) UPSERT 一行，记录该设备最近签发的 JWT jti；
 * 用户可在「账号安全」页查看设备列表并吊销某台设备（该设备 token 立即失效）。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "user_device_session",
    uniqueConstraints = {
        // 同一用户 + 同一设备仅一行（重复登录走 UPSERT）
        @UniqueConstraint(name = "uk_user_device", columnNames = {"user_id", "device_id"})
    }
)
public class UserDeviceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 设备标识（请求未携带时统一 "unknown"） */
    @Column(name = "device_id", nullable = false, length = 128)
    private String deviceId;

    /** 登录平台（wechat/phone/apple/guest/unknown） */
    @Column(name = "platform", nullable = false, length = 32)
    private String platform = "unknown";

    /** 该设备最近签发 JWT 的 jti（吊销设备时加入黑名单） */
    @Column(name = "last_token_jti", length = 64)
    private String lastTokenJti;

    /** 最近活跃时间 */
    @Column(name = "last_active_at", nullable = false)
    private LocalDateTime lastActiveAt;

    /** 是否已被用户吊销 */
    @Column(name = "revoked", nullable = false)
    private Boolean revoked = false;

    /** 首次登录时间 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 最近更新时间 */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     * <p>由 JPA 自动维护，每次实体更新时 version 自增。
     * 并发更新冲突时抛出 {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 409 Conflict。</p>
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    public UserDeviceSession() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getLastTokenJti() {
        return lastTokenJti;
    }

    public void setLastTokenJti(String lastTokenJti) {
        this.lastTokenJti = lastTokenJti;
    }

    public LocalDateTime getLastActiveAt() {
        return lastActiveAt;
    }

    public void setLastActiveAt(LocalDateTime lastActiveAt) {
        this.lastActiveAt = lastActiveAt;
    }

    public Boolean getRevoked() {
        return revoked;
    }

    public void setRevoked(Boolean revoked) {
        this.revoked = revoked;
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
