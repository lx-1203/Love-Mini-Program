package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 推送摘要实体，对应 push_summaries 表。
 * 存储为用户生成的推送摘要记录，包括社交动态摘要和推荐刷新通知。
 * 摘要类型: social_digest（社交动态摘要）/ recommend_refresh（推荐刷新通知）。
 */
@Entity
@Table(name = "push_summaries")
public class PushSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 目标用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 摘要类型: social_digest / recommend_refresh */
    @Column(name = "summary_type", nullable = false, length = 50)
    private String summaryType;

    /** 推送标题 */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /** 推送内容正文 */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** 点击跳转的小程序路径 */
    @Column(name = "action_url", length = 500)
    private String actionUrl;

    /** 是否已发送 */
    @Column(name = "is_sent", nullable = false)
    private Boolean isSent = false;

    /** 摘要生成时间 */
    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    /** 实际发送时间 */
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    public PushSummary() {
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

    public String getSummaryType() {
        return summaryType;
    }

    public void setSummaryType(String summaryType) {
        this.summaryType = summaryType;
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

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public Boolean getIsSent() {
        return isSent;
    }

    public void setIsSent(Boolean isSent) {
        this.isSent = isSent;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}