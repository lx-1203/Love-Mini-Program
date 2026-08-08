package com.campuslove.api.entity;

import com.campuslove.api.common.TimeZones;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 帖子点赞记录实体，对应 post_likes 表。
 * 通过联合唯一约束 (user_id, post_id) 实现同一用户对同一帖子的点赞去重。
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "post_likes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_post_likes_user_post", columnNames = {"user_id", "post_id"})
})
public class PostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 点赞用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 被点赞帖子 ID */
    @Column(name = "post_id", nullable = false)
    private Long postId;

    /** 点赞时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
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


    public PostLike() {
    }

    /**
     * 便捷构造方法，自动设置创建时间为当前时间。
     *
     * @param userId 点赞用户 ID
     * @param postId 被点赞帖子 ID
     */
    public PostLike(Long userId, Long postId) {
        this.userId = userId;
        this.postId = postId;
        this.createdAt = LocalDateTime.now(TimeZones.BUSINESS);
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
