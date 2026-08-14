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
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 村口帖子实体，对应 posts 表。
 * 包含内容、图片/标签（JSON）、分类、计数和状态等字段。
 *
 * <p>索引说明（与数据库 Flyway 脚本保持一致）：</p>
 * <ul>
 *   <li>idx_posts_author：author_id 单列索引，作者主页查询</li>
 *   <li>idx_posts_category：category 索引，按分类筛选帖子</li>
 *   <li>idx_posts_created_at：created_at 索引，按时间排序</li>
 *   <li>idx_posts_status：status 索引，状态过滤（active/deleted/hidden）</li>
 *   <li>idx_posts_author_created_at：(author_id, created_at) 复合索引，作者主页分页</li>
 *   <li>idx_posts_status_created_at：(status, created_at) 复合索引，按状态+时间查询</li>
 * </ul>
 *
 * <p>注：任务规格提到 circle_id 索引，但 posts 表实际无该字段（圈子功能由
 * circle_topics / circle_memberships 表承担），故跳过。详见 V2026.07.25.0001 迁移脚本说明。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "posts",
    indexes = {
        // 作者 ID 单列索引：作者主页帖子列表查询
        @Index(name = "idx_posts_author", columnList = "author_id"),
        // 分类索引：按分类筛选帖子
        @Index(name = "idx_posts_category", columnList = "category"),
        // 创建时间索引：帖子列表按时间排序、分页
        @Index(name = "idx_posts_created_at", columnList = "created_at"),
        // 状态索引：状态过滤（几乎所有列表查询都带 status='active'）
        @Index(name = "idx_posts_status", columnList = "status"),
        // (作者 ID, 创建时间) 复合索引：作者主页帖子分页查询
        @Index(name = "idx_posts_author_created_at", columnList = "author_id, created_at"),
        // (状态, 创建时间) 复合索引：按状态筛选并按时间排序
        @Index(name = "idx_posts_status_created_at", columnList = "status, created_at"),
        // 活动关联索引：按活动查帖子（V2026.08.09.0004 迁移新增）
        @Index(name = "idx_posts_activity", columnList = "activity_id")
    }
)
public class Post {

    /** 帖子分类枚举 */
    public enum PostCategory {
        all, interest, sincere, hometown, anonymous, latest, campus, activity
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

    /** 帖子标题（2026-08-08 走查 P1：发帖必填 5-30 字，落库） */
    @Column(name = "title", length = 200)
    private String title;

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
    @Column(name = "category", nullable = false, columnDefinition = "ENUM('all','interest','sincere','hometown','anonymous','latest','campus','activity') DEFAULT 'all'")
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

    /**
     * 浏览量（2026-08-08 论坛互动真实化：详情读取时原子 +1，匿名也计）。
     * 对应 posts.view_count 列（Flyway V2026.08.09.0001 迁移新增）。
     */
    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    /** 状态 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('active','deleted','hidden') DEFAULT 'active'")
    private PostStatus status = PostStatus.active;

    /**
     * 是否置顶（管理后台论坛分页管理维护，村口列表置顶优先展示）。
     * <p>对应 posts.is_pinned 列（V2026.08.07.0017 迁移新增），默认 false。</p>
     */
    @Column(name = "is_pinned", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isPinned = false;

    /**
     * 热度分（2026-08-11 热度榜：定时任务按互动加权 + 时间衰减重算）。
     * <p>对应 posts.hot_score 列（V2026.08.11.0001 迁移新增），默认 0；
     * 榜单/推荐流按此列排序，重算周期内查询零计算。</p>
     */
    @Column(name = "hot_score", nullable = false)
    private Double hotScore = 0.0;

    /**
     * 运营热度倍率（2026-08-11 后台操纵：>1 上榜加成，0 压榜，支持小数微调）。
     * <p>对应 posts.hot_boost 列（V2026.08.11.0001 迁移新增），默认 1.0。</p>
     */
    @Column(name = "hot_boost", nullable = false)
    private Double hotBoost = 1.0;

    /**
     * 禁止上榜（2026-08-11 后台操纵：1=不进入热度榜/推荐流，不影响前台可见性，
     * 与 status=hidden 语义区分——hidden 前台不可见）。
     * <p>对应 posts.hot_banned 列（V2026.08.11.0001 迁移新增），默认 false。</p>
     */
    @Column(name = "hot_banned", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean hotBanned = false;

    /**
     * 关联活动 ID（2026-08-09 帖子关联活动）。
     * <p>对应 posts.activity_id 列（V2026.08.09.0004 迁移新增），可为 null；
     * 非空时列表/详情下发 {@code ActivitySummaryView} 活动卡片。</p>
     */
    @Column(name = "activity_id")
    private Long activityId;

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

    /** 记录创建时间（帖子发布时间，用于排序与展示） */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（编辑、状态变更等触发更新） */

    @LastModifiedDate

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
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

    public Integer getViewCount() {
        return viewCount;
    }

    public void setViewCount(Integer viewCount) {
        this.viewCount = viewCount;
    }

    public PostStatus getStatus() {
        return status;
    }

    public void setStatus(PostStatus status) {
        this.status = status;
    }

    public Boolean getIsPinned() {
        return isPinned;
    }

    public void setIsPinned(Boolean isPinned) {
        this.isPinned = isPinned;
    }

    public Double getHotScore() {
        return hotScore;
    }

    public void setHotScore(Double hotScore) {
        this.hotScore = hotScore;
    }

    public Double getHotBoost() {
        return hotBoost;
    }

    public void setHotBoost(Double hotBoost) {
        this.hotBoost = hotBoost;
    }

    public Boolean getHotBanned() {
        return hotBanned;
    }

    public void setHotBanned(Boolean hotBanned) {
        this.hotBanned = hotBanned;
    }

    public Long getActivityId() {
        return activityId;
    }

    public void setActivityId(Long activityId) {
        this.activityId = activityId;
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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
