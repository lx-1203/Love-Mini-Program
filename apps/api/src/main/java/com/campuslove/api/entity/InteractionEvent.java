package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 互动事件实体，对应 interaction_events 表。
 * 记录用户间的各类互动事件（喜欢、访客、关注、帖子点赞、帖子评论、话题回复），
 * 用于互动提醒增强功能。
 */
@Entity
@Table(name = "interaction_events")
public class InteractionEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 事件接收者用户 ID（被互动的用户） */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 触发事件的用户 ID（发起互动的用户） */
    @Column(name = "trigger_user_id", nullable = false)
    private Long triggerUserId;

    /** 事件类型: NEW_LIKE / NEW_VISITOR / NEW_FOLLOW / POST_LIKED / POST_COMMENTED / TOPIC_REPLIED */
    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    /** 关联实体 ID */
    @Column(name = "reference_id")
    private Long referenceId;

    /** 关联实体类型: POST / COMMENT / TOPIC / USER */
    @Column(name = "reference_type", length = 30)
    private String referenceType;

    /** 事件摘要 */
    @Column(name = "summary", length = 200)
    private String summary;

    /** 是否已读 */
    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public InteractionEvent() {
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

    public Long getTriggerUserId() {
        return triggerUserId;
    }

    public void setTriggerUserId(Long triggerUserId) {
        this.triggerUserId = triggerUserId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Long getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(Long referenceId) {
        this.referenceId = referenceId;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
