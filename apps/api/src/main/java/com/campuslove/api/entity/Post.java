package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 村口帖子实体，对应 posts 表。
 * 包含内容、图片/标签（JSON）、分类、计数和状态等字段。
 */
@Entity
@Table(name = "posts")
public class Post {

    /** 帖子分类枚举 */
    public enum PostCategory {
        all, interest, sincere, hometown, anonymous, latest, campus
    }

    /** 帖子状态枚举 */
    public enum PostStatus {
        active, deleted, hidden
    }

    /**
     * 帖子审核状态枚举。
     * <p>由管理后台审核接口维护，与 PostStatus 正交：</p>
     * <ul>
     *   <li>pending：待审核（新建帖子默认不进入此状态，由举报或风控触发）</li>
     *   <li>approved：已通过（默认值，存量帖子视为已通过）</li>
     *   <li>rejected：已拒绝（管理员拒绝后，帖子在村口列表不可见）</li>
     * </ul>
     */
    public enum AuditStatus {
        pending, approved, rejected
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 作者用户 ID */
    @Column(name = "author_id", nullable = false)
    private Long authorId;

    /** 帖子内容 */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 图片 URL 数组（JSON，默认空数组） */
    @Column(name = "images", columnDefinition = "JSON DEFAULT '[]'")
    private String images = "[]";

    /** 话题标签数组（JSON，默认空数组） */
    @Column(name = "tags", columnDefinition = "JSON DEFAULT '[]'")
    private String tags = "[]";

    /** 分类 */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, columnDefinition = "ENUM('all','interest','sincere','hometown','anonymous','latest','campus') DEFAULT 'all'")
    private PostCategory category = PostCategory.all;

    /** 点赞数 */
    @Column(name = "likes_count", nullable = false)
    private Integer likesCount = 0;

    /** 评论数 */
    @Column(name = "comments_count", nullable = false)
    private Integer commentsCount = 0;

    /** 转发数 */
    @Column(name = "share_count", nullable = false)
    private Integer shareCount = 0;

    /** 状态 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('active','deleted','hidden') DEFAULT 'active'")
    private PostStatus status = PostStatus.active;

    /**
     * 审核状态。
     * <p>由管理后台审核接口维护，与 status 正交：
     * status 控制"是否软删/隐藏"，audit_status 控制"管理员审核结果"。</p>
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "audit_status", nullable = false, columnDefinition = "VARCHAR(16) DEFAULT 'approved'")
    private AuditStatus auditStatus = AuditStatus.approved;

    /** 审核备注（管理员审核时填写，拒绝原因等） */
    @Column(name = "audit_remark", length = 500)
    private String auditRemark;

    /** 审核人用户 ID */
    @Column(name = "auditor_id")
    private Long auditorId;

    /** 审核时间 */
    @Column(name = "audited_at")
    private LocalDateTime auditedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Post() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
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

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public PostCategory getCategory() {
        return category;
    }

    public void setCategory(PostCategory category) {
        this.category = category;
    }

    public Integer getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(Integer likesCount) {
        this.likesCount = likesCount;
    }

    public Integer getCommentsCount() {
        return commentsCount;
    }

    public void setCommentsCount(Integer commentsCount) {
        this.commentsCount = commentsCount;
    }

    public Integer getShareCount() {
        return shareCount;
    }

    public void setShareCount(Integer shareCount) {
        this.shareCount = shareCount;
    }

    public PostStatus getStatus() {
        return status;
    }

    public void setStatus(PostStatus status) {
        this.status = status;
    }

    public AuditStatus getAuditStatus() {
        return auditStatus;
    }

    public void setAuditStatus(AuditStatus auditStatus) {
        this.auditStatus = auditStatus;
    }

    public String getAuditRemark() {
        return auditRemark;
    }

    public void setAuditRemark(String auditRemark) {
        this.auditRemark = auditRemark;
    }

    public Long getAuditorId() {
        return auditorId;
    }

    public void setAuditorId(Long auditorId) {
        this.auditorId = auditorId;
    }

    public LocalDateTime getAuditedAt() {
        return auditedAt;
    }

    public void setAuditedAt(LocalDateTime auditedAt) {
        this.auditedAt = auditedAt;
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
