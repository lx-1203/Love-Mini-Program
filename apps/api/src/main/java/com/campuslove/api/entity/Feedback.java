package com.campuslove.api.entity;

import com.campuslove.api.feedback.FeedbackTicketType;
import com.campuslove.api.feedback.SubmissionStatus;
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
 * 反馈工单实体，对应 feedback_tickets 表。
 * 记录用户提交的反馈、建议和活动提案。
 */
@Entity
@Table(name = "feedback_tickets")
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 提交用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 反馈类型：FEEDBACK / SUGGESTION / ACTIVITY_PROPOSAL */
    @Column(name = "type", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    private FeedbackTicketType type;

    /** 反馈标题 */
    @Column(name = "title", nullable = false, length = 256)
    private String title;

    /** 反馈内容 */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 联系微信（可空） */
    @Column(name = "contact_wechat", length = 64)
    private String contactWechat;

    /** 附件列表（JSON 格式，可空） */
    @Column(name = "attachments", columnDefinition = "JSON")
    private String attachments;

    /** 期望城市（可空） */
    @Column(name = "expected_city", length = 64)
    private String expectedCity;

    /** 期望校区（可空） */
    @Column(name = "expected_campus", length = 128)
    private String expectedCampus;

    /** 提交状态：SUBMITTED / PROCESSING / REVIEWED / PLANNED / CONVERTED */
    @Column(name = "status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    /** 最新回复摘要（可空） */
    @Column(name = "latest_reply_summary", length = 512)
    private String latestReplySummary;

    /** 转换后的活动 ID（可空，仅 ACTIVITY_PROPOSAL 类型使用） */
    @Column(name = "converted_activity_id")
    private Long convertedActivityId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Feedback() {
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

    public FeedbackTicketType getType() {
        return type;
    }

    public void setType(FeedbackTicketType type) {
        this.type = type;
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

    public String getContactWechat() {
        return contactWechat;
    }

    public void setContactWechat(String contactWechat) {
        this.contactWechat = contactWechat;
    }

    public String getAttachments() {
        return attachments;
    }

    public void setAttachments(String attachments) {
        this.attachments = attachments;
    }

    public String getExpectedCity() {
        return expectedCity;
    }

    public void setExpectedCity(String expectedCity) {
        this.expectedCity = expectedCity;
    }

    public String getExpectedCampus() {
        return expectedCampus;
    }

    public void setExpectedCampus(String expectedCampus) {
        this.expectedCampus = expectedCampus;
    }

    public SubmissionStatus getStatus() {
        return status;
    }

    public void setStatus(SubmissionStatus status) {
        this.status = status;
    }

    public String getLatestReplySummary() {
        return latestReplySummary;
    }

    public void setLatestReplySummary(String latestReplySummary) {
        this.latestReplySummary = latestReplySummary;
    }

    public Long getConvertedActivityId() {
        return convertedActivityId;
    }

    public void setConvertedActivityId(Long convertedActivityId) {
        this.convertedActivityId = convertedActivityId;
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
