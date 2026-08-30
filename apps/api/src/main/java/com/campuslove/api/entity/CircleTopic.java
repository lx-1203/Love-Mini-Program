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
import jakarta.persistence.Version;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 圈子话题实体，对应 circle_topics 表。
 * 关联 InterestCircle，支持置顶和图片（JSON）。
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "circle_topics")
public class CircleTopic {

    /**
     * 话题审核状态枚举。
     * <p>由管理后台审核接口维护（CircleTopic 无 status 字段，审核状态独立记录）。
     * pending：待审核（前台不可见）；approved：通过（前台可见）；rejected：拒绝（前台不可见）。</p>
     */
    public enum AuditStatus {
        pending, approved, rejected
    }

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

    /** 审核状态（管理后台审核接口维护，默认 approved 视为已通过；新建话题默认 pending） */
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

    /** 记录创建时间（话题发布时间，用于排序展示） */

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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
