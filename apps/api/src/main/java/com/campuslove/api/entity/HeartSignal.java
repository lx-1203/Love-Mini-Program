package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 心动信号实体，对应 heart_signals 表。
 * 状态枚举: pending / accepted / expired / declined。
 *
 * <p>索引说明（与数据库 Flyway 脚本保持一致）：</p>
 * <ul>
 *   <li>idx_heart_signals_user_a：user_a_id 单列索引，按发起方查询</li>
 *   <li>idx_heart_signals_user_b：user_b_id 单列索引，按接收方查询</li>
 *   <li>idx_heart_signals_expires_at：expires_at 索引，按过期时间扫描</li>
 *   <li>idx_heart_signals_status：status 索引，按状态过滤（pending/accepted/expired/declined）</li>
 *   <li>idx_heart_signals_created_at：created_at 索引，按创建时间排序（任务规格中 sender_id+receiver_id 的对应，因表已对 (user_a_id, user_b_id) 建有功能性唯一约束，这里补充 created_at 单列索引）</li>
 * </ul>
 *
 * <p>注：任务规格中提到 sender_id + receiver_id 索引，实际表中为 user_a_id + user_b_id，
 * 数据库已对 (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id)) 建立功能性唯一约束
 * （uk_heart_signals_users），单列索引 idx_heart_signals_user_a / idx_heart_signals_user_b 已覆盖，
 * 此处补充 created_at 单列索引。详见 V2026.05.21.0005 建表脚本。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "heart_signals",
    indexes = {
        // 用户 A ID 索引：按发起方查询心动信号
        @Index(name = "idx_heart_signals_user_a", columnList = "user_a_id"),
        // 用户 B ID 索引：按接收方查询心动信号
        @Index(name = "idx_heart_signals_user_b", columnList = "user_b_id"),
        // 过期时间索引：定时任务扫描过期信号
        @Index(name = "idx_heart_signals_expires_at", columnList = "expires_at"),
        // 状态索引：按状态过滤（pending/accepted/expired/declined）
        @Index(name = "idx_heart_signals_status", columnList = "status"),
        // 创建时间索引：按时间排序、分页查询
        @Index(name = "idx_heart_signals_created_at", columnList = "created_at")
    }
)
public class HeartSignal {

    /** 心动信号状态枚举 */
    public enum SignalStatus {
        pending, accepted, expired, declined
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 A ID */
    @Column(name = "user_a_id", nullable = false)
    private Long userAId;

    /** 用户 B ID */
    @Column(name = "user_b_id", nullable = false)
    private Long userBId;

    /** 状态 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('pending','accepted','expired','declined') DEFAULT 'pending'")
    private SignalStatus status = SignalStatus.pending;

    /** 匹配类型（mutual_like-互相喜欢, topic-话题匹配, coffee-咖啡散步, study-自习搭子, quick-快速匹配） */
    @Column(name = "match_type", length = 20)
    private String matchType;

    /** 过期时间 */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** 记录创建时间（心动信号发起时间，用于排序展示） */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（信号状态变更时刷新） */

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


    public HeartSignal() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserAId() {
        return userAId;
    }

    public void setUserAId(Long userAId) {
        this.userAId = userAId;
    }

    public Long getUserBId() {
        return userBId;
    }

    public void setUserBId(Long userBId) {
        this.userBId = userBId;
    }

    public SignalStatus getStatus() {
        return status;
    }

    public void setStatus(SignalStatus status) {
        this.status = status;
    }

    public String getMatchType() {
        return matchType;
    }

    public void setMatchType(String matchType) {
        this.matchType = matchType;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
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
