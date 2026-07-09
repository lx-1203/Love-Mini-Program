package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 媒体资产实体，对应 media_asset 表。
 *
 * <p>用于记录用户上传的所有媒体文件（图片/视频/背景图）的元信息：
 * URL、原始文件名、MIME 类型、文件大小、宽高、视频时长、状态等。</p>
 *
 * <p>典型场景：
 * <ul>
 *   <li>用户上传个人照片墙、半身照、个人视频、背景图时记录元信息</li>
 *   <li>运营审核：通过 status 字段标记 pending/ready/failed</li>
 *   <li>未来清理：通过 createdAt 字段识别长期未引用的资产</li>
 * </ul>
 * </p>
 */
@Entity
@Table(name = "media_asset")
public class MediaAsset {

    /** 主键 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 上传者用户 ID（建立索引，便于按用户查询历史资产） */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * 媒体类型。
     * 取值：image（图片）/ video（视频）/ background（背景图）。
     */
    @Column(name = "type", nullable = false, length = 16)
    private String type;

    /** 访问 URL（相对路径或绝对路径，最大 512 字符） */
    @Column(name = "url", nullable = false, length = 512)
    private String url;

    /** 原始文件名（用于追溯） */
    @Column(name = "original_name", length = 255)
    private String originalName;

    /** MIME 类型，如 image/jpeg、video/mp4 */
    @Column(name = "mime", length = 64)
    private String mime;

    /** 文件大小（字节） */
    @Column(name = "size")
    private Long size;

    /** 图片/视频宽度（像素） */
    @Column(name = "width")
    private Integer width;

    /** 图片/视频高度（像素） */
    @Column(name = "height")
    private Integer height;

    /** 视频时长（毫秒），图片为 null */
    @Column(name = "duration_ms")
    private Integer durationMs;

    /**
     * 资产状态。
     * 取值：pending（处理中）/ ready（可用）/ failed（处理失败）。
     * 默认 ready，本地存储无异步处理流程。
     */
    @Column(name = "status", nullable = false, length = 16,
            columnDefinition = "VARCHAR(16) DEFAULT 'ready'")
    private String status = "ready";

    /** 创建时间（不可更新） */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 默认构造函数，JPA 要求 */
    public MediaAsset() {
    }

    /**
     * 在持久化前自动设置 createdAt。
     * 使用 @PrePersist 而非 DB 默认值，避免依赖数据库方言差异。
     */
    @PrePersist
    protected void onCreate() {
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getMime() {
        return mime;
    }

    public void setMime(String mime) {
        this.mime = mime;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public Integer getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(Integer durationMs) {
        this.durationMs = durationMs;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
