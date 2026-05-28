package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 推送偏好设置实体，对应 push_preferences 表。
 * 存储用户的小程序推送偏好，包括是否开启推送、每日最大推送次数、活跃时段等。
 */
@Entity
@Table(name = "push_preferences")
public class PushPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID（唯一） */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 是否启用推送 */
    @Column(name = "push_enabled", nullable = false)
    private Boolean pushEnabled = true;

    /** 每日最大推送次数，默认为 1 */
    @Column(name = "push_frequency", nullable = false)
    private Integer pushFrequency = 1;

    /** 活跃时段，如 "10-12,14-16,20-22" */
    @Column(name = "active_hours", length = 50)
    private String activeHours;

    /** 更新时间 */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PushPreference() {
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

    public Boolean getPushEnabled() {
        return pushEnabled;
    }

    public void setPushEnabled(Boolean pushEnabled) {
        this.pushEnabled = pushEnabled;
    }

    public Integer getPushFrequency() {
        return pushFrequency;
    }

    public void setPushFrequency(Integer pushFrequency) {
        this.pushFrequency = pushFrequency;
    }

    public String getActiveHours() {
        return activeHours;
    }

    public void setActiveHours(String activeHours) {
        this.activeHours = activeHours;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}