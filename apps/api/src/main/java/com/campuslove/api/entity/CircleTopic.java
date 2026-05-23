package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 圈子话题实体，对应 circle_topics 表。
 * 关联 InterestCircle，支持置顶和图片（JSON）。
 */
@Entity
@Table(name = "circle_topics")
public class CircleTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属圈子 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circle_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_circle_topics_circle"))
    private InterestCircle circle;

    /** 作者用户 ID */
    @Column(name = "author_id", nullable = false)
    private Long authorId;

    /** 话题标题 */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /** 话题内容 */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 图片 URL 数组（JSON，默认空数组） */
    @Column(name = "images", columnDefinition = "JSON DEFAULT '[]'")
    private String images = "[]";

    /** 回复数 */
    @Column(name = "reply_count", nullable = false)
    private Integer replyCount = 0;

    /** 是否置顶 */
    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CircleTopic() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public InterestCircle getCircle() {
        return circle;
    }

    public void setCircle(InterestCircle circle) {
        this.circle = circle;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getImages() {
        return images;
    }

    public void setImages(String images) {
        this.images = images;
    }

    public Integer getReplyCount() {
        return replyCount;
    }

    public void setReplyCount(Integer replyCount) {
        this.replyCount = replyCount;
    }

    public Boolean getIsPinned() {
        return isPinned;
    }

    public void setIsPinned(Boolean isPinned) {
        this.isPinned = isPinned;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
