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
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 用户喜欢记录实体，对应 likes 表。
 * 状态枚举: active / cancelled。
 *
 * <p>本实体承担"匹配关系"职责：通过 user_id 与 target_user_id 记录用户之间的喜欢关系，
 * 互相喜欢即视为匹配成功。</p>
 *
 * <p>索引说明（与数据库 Flyway 脚本保持一致）：</p>
 * <ul>
 *   <li>uk_likes_user_target：(user_id, target_user_id) 联合唯一约束，防止重复喜欢</li>
 *   <li>idx_likes_target_user：target_user_id 索引，查询"谁喜欢了我"</li>
 *   <li>idx_likes_created_at：created_at 索引，按时间排序</li>
 *   <li>idx_likes_status：status 索引，按状态过滤（active/cancelled）</li>
 *   <li>idx_likes_user_created_at：(user_id, created_at) 复合索引，"我喜欢的人"分页</li>
 *   <li>idx_likes_target_user_created_at：(target_user_id, created_at) 复合索引，"喜欢我的人"分页</li>
 *   <li>idx_likes_status_created_at：(status, created_at) 复合索引，按状态+时间查询</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "likes",
    uniqueConstraints = {
        // (发起方, 被喜欢方) 联合唯一约束：同一用户对同一目标只能有一条有效喜欢记录
        @UniqueConstraint(name = "uk_likes_user_target", columnNames = {"user_id", "target_user_id"})
    },
    indexes = {
        // 被喜欢方 ID 索引：查询"谁喜欢了我"
        @Index(name = "idx_likes_target_user", columnList = "target_user_id"),
        // 创建时间索引：按时间排序
        @Index(name = "idx_likes_created_at", columnList = "created_at"),
        // 状态索引：按状态过滤（active/cancelled）
        @Index(name = "idx_likes_status", columnList = "status"),
        // (发起方, 创建时间) 复合索引："我喜欢的人"列表分页
        @Index(name = "idx_likes_user_created_at", columnList = "user_id, created_at"),
        // (被喜欢方, 创建时间) 复合索引："喜欢我的人"列表分页
        @Index(name = "idx_likes_target_user_created_at", columnList = "target_user_id, created_at"),
        // (状态, 创建时间) 复合索引：按状态筛选并按时间排序
        @Index(name = "idx_likes_status_created_at", columnList = "status, created_at")
    }
)
public class Like {

    /** 喜欢状态枚举 */
    public enum LikeStatus {
        active, cancelled
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 发起喜欢的用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 被喜欢的用户 ID */
    @Column(name = "target_user_id", nullable = false)
    private Long targetUserId;

    /** 状态: active / cancelled */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('active','cancelled') DEFAULT 'active'")
    private LikeStatus status = LikeStatus.active;

    /** 记录创建时间（喜欢动作发生时间） */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（状态变更时刷新，如取消喜欢） */

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


    public Like() {
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

    public Long getTargetUserId() {
        return targetUserId;
    }

    public void setTargetUserId(Long targetUserId) {
        this.targetUserId = targetUserId;
    }

    public LikeStatus getStatus() {
        return status;
    }

    public void setStatus(LikeStatus status) {
        this.status = status;
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
