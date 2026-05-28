package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 校园话题实体，对应 campus_topics 表。
 * 包含课程讨论、社团招募、活动组织、学习互助、校园生活、校友交流等分类话题。
 */
@Entity
@Table(name = "campus_topics")
public class CampusTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 学校 ID */
    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    /** 话题分类：course/club/activity/study/life/alumni */
    @Column(name = "category", nullable = false, length = 50)
    private String category;

    /** 话题标题 */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /** 话题内容 */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** 图片 URL 数组（JSON 格式） */
    @Column(name = "images", columnDefinition = "JSON")
    private String images;

    /** 作者用户 ID */
    @Column(name = "author_id", nullable = false)
    private Long authorId;

    /** 回复数 */
    @Column(name = "reply_count", nullable = false)
    private Integer replyCount = 0;

    /** 浏览数 */
    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    /** 是否匿名发帖 */
    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CampusTopic() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSchoolId() {
        return schoolId;
    }

    public void setSchoolId(Long schoolId) {
        this.schoolId = schoolId;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
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

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public Integer getReplyCount() {
        return replyCount;
    }

    public void setReplyCount(Integer replyCount) {
        this.replyCount = replyCount;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public void setViewCount(Integer viewCount) {
        this.viewCount = viewCount;
    }

    public Boolean getIsAnonymous() {
        return isAnonymous;
    }

    public void setIsAnonymous(Boolean isAnonymous) {
        this.isAnonymous = isAnonymous;
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
}