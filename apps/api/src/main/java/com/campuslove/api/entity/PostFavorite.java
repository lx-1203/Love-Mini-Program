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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 帖子收藏记录实体，对应 post_favorites 表。
 * 通过联合唯一约束 (user_id, post_id) 实现同一用户对同一帖子的收藏去重（幂等 toggle）。
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "post_favorites", uniqueConstraints = {
        @UniqueConstraint(name = "uk_post_favorites_user_post", columnNames = {"user_id", "post_id"})
})
public class PostFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 收藏用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 被收藏帖子 ID */
    @Column(name = "post_id", nullable = false)
    private Long postId;

    /** 收藏时间 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     * 初始值 0L，对应数据库列 {@code version BIGINT DEFAULT 0}（Flyway V2026.07.26.0003）。
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    public PostFavorite() {
    }

    /**
     * 便捷构造方法，自动设置收藏时间为当前时间。
     *
     * @param userId 收藏用户 ID
     * @param postId 被收藏帖子 ID
     */
    public PostFavorite(Long userId, Long postId) {
        this.userId = userId;
        this.postId = postId;
        this.createdAt = LocalDateTime.now();
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
