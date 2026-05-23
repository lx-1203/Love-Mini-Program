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
 * 临时聊天会话实体，对应 temp_chat_session 表。
 * 存储两个用户之间的临时聊天会话信息，包含 24h 过期机制。
 * 会话阶段: matching(匹配中) / active(活跃) / closed(已关闭) / expired(已过期)。
 */
@Entity
@Table(name = "temp_chat_session")
public class TempChatSession {

    /** 会话阶段枚举 */
    public enum SessionPhase {
        matching, active, closed, expired
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 会话唯一标识（用于前端路由，如 session-123） */
    @Column(name = "session_uid", nullable = false, length = 64, unique = true)
    private String sessionUid;

    /** 用户 A ID（发起方） */
    @Column(name = "user_a_id", nullable = false)
    private Long userAId;

    /** 用户 B ID（被推荐方） */
    @Column(name = "user_b_id", nullable = false)
    private Long userBId;

    /** 推荐人 ID（关联推荐服务中的推荐人标识） */
    @Column(name = "recommended_person_id", length = 64)
    private String recommendedPersonId;

    /** 关联的匹配 ID（来自 HeartSignal） */
    @Column(name = "match_id", length = 64)
    private String matchId;

    /** 会话阶段: matching / active / closed / expired */
    @Enumerated(EnumType.STRING)
    @Column(name = "phase", nullable = false, columnDefinition = "ENUM('matching','active','closed','expired') DEFAULT 'matching'")
    private SessionPhase phase = SessionPhase.matching;

    /** 会话关闭时间（24h 后自动过期） */
    @Column(name = "closes_at", nullable = false)
    private LocalDateTime closesAt;

    /** 关闭原因: ended(手动结束) / expired(自动过期) */
    @Column(name = "closed_reason", length = 32)
    private String closedReason;

    /** 是否置顶 */
    @Column(name = "is_pinned", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isPinned = false;

    /** 用户 A 未读消息数 */
    @Column(name = "user_a_unread_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer userAUnreadCount = 0;

    /** 用户 B 未读消息数 */
    @Column(name = "user_b_unread_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer userBUnreadCount = 0;

    /** 最后一条消息预览 */
    @Column(name = "last_message_preview", length = 255)
    private String lastMessagePreview;

    /** 最后消息时间 */
    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public TempChatSession() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionUid() {
        return sessionUid;
    }

    public void setSessionUid(String sessionUid) {
        this.sessionUid = sessionUid;
    }

    public Long getUserAId() {
        return userAId;
    }

    public void setUserAId(Long userAId) {
        this.userAId = userAId;
    }

    public Long getUserBId() {
        return userBId;
    }

    public void setUserBId(Long userBId) {
        this.userBId = userBId;
    }

    public String getRecommendedPersonId() {
        return recommendedPersonId;
    }

    public void setRecommendedPersonId(String recommendedPersonId) {
        this.recommendedPersonId = recommendedPersonId;
    }

    public String getMatchId() {
        return matchId;
    }

    public void setMatchId(String matchId) {
        this.matchId = matchId;
    }

    public SessionPhase getPhase() {
        return phase;
    }

    public void setPhase(SessionPhase phase) {
        this.phase = phase;
    }

    public LocalDateTime getClosesAt() {
        return closesAt;
    }

    public void setClosesAt(LocalDateTime closesAt) {
        this.closesAt = closesAt;
    }

    public String getClosedReason() {
        return closedReason;
    }

    public void setClosedReason(String closedReason) {
        this.closedReason = closedReason;
    }

    public Boolean getIsPinned() {
        return isPinned;
    }

    public void setIsPinned(Boolean isPinned) {
        this.isPinned = isPinned;
    }

    public Integer getUserAUnreadCount() {
        return userAUnreadCount;
    }

    public void setUserAUnreadCount(Integer userAUnreadCount) {
        this.userAUnreadCount = userAUnreadCount;
    }

    public Integer getUserBUnreadCount() {
        return userBUnreadCount;
    }

    public void setUserBUnreadCount(Integer userBUnreadCount) {
        this.userBUnreadCount = userBUnreadCount;
    }

    public String getLastMessagePreview() {
        return lastMessagePreview;
    }

    public void setLastMessagePreview(String lastMessagePreview) {
        this.lastMessagePreview = lastMessagePreview;
    }

    public LocalDateTime getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(LocalDateTime lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
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
