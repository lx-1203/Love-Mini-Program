package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 帖子话题标签实体，对应 post_tags 表。
 * 记录帖子与预置话题标签的关联关系。
 */
@Entity
@Table(name = "post_tags")
public class PostTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 关联的帖子 ID */
    @Column(name = "post_id", nullable = false)
    private Long postId;

    /** 标签名称，如"校园日常"、"兴趣分享"等 */
    @Column(name = "tag_name", nullable = false, length = 50)
    private String tagName;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PostTag() {
    }

    /**
     * 便捷构造方法，自动设置创建时间。
     *
     * @param postId  帖子 ID
     * @param tagName 标签名称
     */
    public PostTag(Long postId, String tagName) {
        this.postId = postId;
        this.tagName = tagName;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPostId() {
        return postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId;
    }

    public String getTagName() {
        return tagName;
    }

    public void setTagName(String tagName) {
        this.tagName = tagName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}