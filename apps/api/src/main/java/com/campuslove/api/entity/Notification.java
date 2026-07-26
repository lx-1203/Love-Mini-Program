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
import java.time.LocalDateTime;

/**
 * 互动通知实体，对应 notifications 表。
 * 通知类型: follow / like / comment / visitor / match。
 * 关联实体类型: post / comment / user。
 *
 * <p>索引说明（与数据库 Flyway 脚本保持一致）：</p>
 * <ul>
 *   <li>idx_notifications_user：user_id 单列索引，按接收者查询通知</li>
 *   <li>idx_notifications_user_read：(user_id, is_read) 复合索引，查询未读通知</li>
 *   <li>idx_notifications_created：created_at 索引，按时间排序</li>
 *   <li>idx_notifications_type：type 索引，按通知类型筛选</li>
 *   <li>idx_notifications_user_created_at：(user_id, created_at) 复合索引，用户通知按时间分页</li>
 * </ul>
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        // 接收者用户 ID 索引：按用户查询通知列表
        @Index(name = "idx_notifications_user", columnList = "user_id"),
        // (接收者, 是否已读) 复合索引：查询未读通知（高频查询）
        @Index(name = "idx_notifications_user_read", columnList = "user_id, is_read"),
        // 创建时间索引：通知按时间排序
        @Index(name = "idx_notifications_created", columnList = "created_at"),
        // 通知类型索引：按类型筛选（follow/like/comment/visitor/match）
        @Index(name = "idx_notifications_type", columnList = "type"),
        // (接收者, 创建时间) 复合索引：用户通知按时间分页
        @Index(name = "idx_notifications_user_created_at", columnList = "user_id, created_at")
    }
)
public class Notification {

    /** 通知类型枚举 */
    public enum NotificationType {
        follow, like, comment, visitor, match
    }

    /** 关联实体类型枚举 */
    public enum ReferenceType {
        post, comment, user
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 通知接收者用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 通知类型 */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, columnDefinition = "ENUM('follow','like','comment','visitor','match')")
    private NotificationType type;

    /** 触发通知的源用户 ID */
    @Column(name = "source_user_id", nullable = false)
    private Long sourceUserId;

    /** 关联实体 ID */
    @Column(name = "reference_id")
    private Long referenceId;

    /** 关联实体类型 */
    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", columnDefinition = "ENUM('post','comment','user')")
    private ReferenceType referenceType;

    /** 是否已读 */
    @Column(name = "is_read", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isRead = false;

    /** 记录创建时间（通知产生时间，用于排序展示） */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Notification() {
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

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public Long getSourceUserId() {
        return sourceUserId;
    }

    public void setSourceUserId(Long sourceUserId) {
        this.sourceUserId = sourceUserId;
    }

    public Long getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(Long referenceId) {
        this.referenceId = referenceId;
    }

    public ReferenceType getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(ReferenceType referenceType) {
        this.referenceType = referenceType;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
