package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 社交升温进度实体，对应 social_progress 表。
 * 用于追踪用户在校园恋爱社交路径中的进阶进度，
 * 包含六层漏斗模型的各项计数和当前所处层级。
 */
@Entity
@Table(name = "social_progress")
public class SocialProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID，与 users 表关联 */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 当前社交层级 */
    @Column(name = "current_tier", length = 20, nullable = false)
    private String currentTier = "L1_EXPOSURE";

    /** 曝光次数 */
    @Column(name = "exposure_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer exposureCount = 0;

    /** 喜欢/点赞次数 */
    @Column(name = "like_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer likeCount = 0;

    /** 匹配次数 */
    @Column(name = "match_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer matchCount = 0;

    /** 聊天次数 */
    @Column(name = "chat_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer chatCount = 0;

    /** 社区互动次数 */
    @Column(name = "circle_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer circleCount = 0;

    /** 活动参与次数 */
    @Column(name = "activity_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer activityCount = 0;

    /** 更新时间 */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SocialProgress() {
    }

    // ---- getters & setters ----

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

    public String getCurrentTier() {
        return currentTier;
    }

    public void setCurrentTier(String currentTier) {
        this.currentTier = currentTier;
    }

    public Integer getExposureCount() {
        return exposureCount;
    }

    public void setExposureCount(Integer exposureCount) {
        this.exposureCount = exposureCount;
    }

    public Integer getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(Integer likeCount) {
        this.likeCount = likeCount;
    }

    public Integer getMatchCount() {
        return matchCount;
    }

    public void setMatchCount(Integer matchCount) {
        this.matchCount = matchCount;
    }

    public Integer getChatCount() {
        return chatCount;
    }

    public void setChatCount(Integer chatCount) {
        this.chatCount = chatCount;
    }

    public Integer getCircleCount() {
        return circleCount;
    }

    public void setCircleCount(Integer circleCount) {
        this.circleCount = circleCount;
    }

    public Integer getActivityCount() {
        return activityCount;
    }

    public void setActivityCount(Integer activityCount) {
        this.activityCount = activityCount;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}