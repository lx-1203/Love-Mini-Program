package com.campuslove.api.village;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 评论点赞记录实体，对应 comment_likes 表（M-14 评论点赞）。
 *
 * <p>通过联合唯一约束 (user_id, comment_id) 实现同一用户对同一评论的点赞去重（幂等）。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "comment_likes",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_comment_likes_user_comment", columnNames = {"user_id", "comment_id"})
    }
)
public class CommentLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 被点赞评论 ID */
    @Column(name = "comment_id", nullable = false)
    private Long commentId;

    /** 点赞用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 点赞时间 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CommentLike() {
    }

    public CommentLike(Long userId, Long commentId) {
        this.userId = userId;
        this.commentId = commentId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCommentId() {
        return commentId;
    }

    public void setCommentId(Long commentId) {
        this.commentId = commentId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
