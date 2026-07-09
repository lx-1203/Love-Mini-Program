package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 举报实体，对应 reports 表。
 * <p>记录用户对帖子/评论/用户/话题的举报信息，以及管理员的处理结果。</p>
 * <p>状态流转：PENDING（待处理）→ HANDLED（已处理）/ REJECTED（已驳回）</p>
 */
@Entity
@Table(name = "reports")
public class Report {

    /** 主键 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 举报目标类型：POST/COMMENT/USER/TOPIC */
    @Column(name = "target_type", nullable = false, length = 32)
    private String targetType;

    /** 目标对象 ID */
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** 举报人用户 ID */
    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    /** 举报原因（简短分类，如垃圾广告/辱骂攻击等） */
    @Column(name = "reason", nullable = false, length = 64)
    private String reason;

    /** 举报详细描述（可选） */
    @Column(name = "description", length = 500)
    private String description;

    /** 处理状态：PENDING/HANDLED/REJECTED */
    @Column(name = "status", nullable = false, length = 16)
    private String status;

    /** 处理人管理员 ID（未处理时为 null） */
    @Column(name = "handler_id")
    private Long handlerId;

    /** 处理备注 */
    @Column(name = "handle_remark", length = 500)
    private String handleRemark;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 处理时间（未处理时为 null） */
    @Column(name = "handled_at")
    private LocalDateTime handledAt;

    /** 默认构造方法，JPA 要求 */
    public Report() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public Long getReporterId() {
        return reporterId;
    }

    public void setReporterId(Long reporterId) {
        this.reporterId = reporterId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getHandlerId() {
        return handlerId;
    }

    public void setHandlerId(Long handlerId) {
        this.handlerId = handlerId;
    }

    public String getHandleRemark() {
        return handleRemark;
    }

    public void setHandleRemark(String handleRemark) {
        this.handleRemark = handleRemark;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getHandledAt() {
        return handledAt;
    }

    public void setHandledAt(LocalDateTime handledAt) {
        this.handledAt = handledAt;
    }
}
