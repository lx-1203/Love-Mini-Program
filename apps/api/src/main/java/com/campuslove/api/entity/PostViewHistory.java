package com.campuslove.api.entity;

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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 帖子浏览历史实体，对应 post_view_history 表。
 * 通过联合唯一约束 (user_id, post_id) 实现同一用户对同一帖子仅保留一条浏览记录，
 * 重复浏览仅刷新 viewed_at（upsert 语义）。
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "post_view_history", uniqueConstraints = {
        @UniqueConstraint(name = "uk_post_view_history_user_post", columnNames = {"user_id", "post_id"})
})
public class PostViewHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 浏览用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 被浏览帖子 ID */
    @Column(name = "post_id", nullable = false)
    private Long postId;

    /** 最近浏览时间（重复浏览 upsert 刷新） */
    @Column(name = "viewed_at", nullable = false)
    private LocalDateTime viewedAt;

    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     * 初始值 0L，对应数据库列 {@code version BIGINT DEFAULT 0}（Flyway V2026.07.26.0003）。
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    public PostViewHistory() {
    }

    /**
     * 便捷构造方法。
     *
     * @param userId   浏览用户 ID
     * @param postId   被浏览帖子 ID
     * @param viewedAt 浏览时间
     */
    public PostViewHistory(Long userId, Long postId, LocalDateTime viewedAt) {
        this.userId = userId;
        this.postId = postId;
        this.viewedAt = viewedAt;
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

    public Long getPostId() {
        return postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId;
    }

    public LocalDateTime getViewedAt() {
        return viewedAt;
    }

    public void setViewedAt(LocalDateTime viewedAt) {
        this.viewedAt = viewedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
