package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 用户日程偏好实体，对应 user_schedule_profile 表。
 * 存储偏好校区区域、时间窗口和课程安排（JSON 格式）。
 */
@Entity
@Table(name = "user_schedule_profile")
public class UserScheduleProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 关联用户 ID（唯一） */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 偏好校区区域 */
    @Column(name = "preferred_campus_area", nullable = false, length = 128)
    private String preferredCampusArea;

    /** 偏好时间窗口 JSON */
    @Column(name = "preferred_time_window_json", nullable = false, columnDefinition = "JSON")
    private String preferredTimeWindowJson;

    /** 课程安排 JSON */
    @Column(name = "course_block_json", nullable = false, columnDefinition = "JSON")
    private String courseBlockJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public UserScheduleProfile() {
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

    public String getPreferredCampusArea() {
        return preferredCampusArea;
    }

    public void setPreferredCampusArea(String preferredCampusArea) {
        this.preferredCampusArea = preferredCampusArea;
    }

    public String getPreferredTimeWindowJson() {
        return preferredTimeWindowJson;
    }

    public void setPreferredTimeWindowJson(String preferredTimeWindowJson) {
        this.preferredTimeWindowJson = preferredTimeWindowJson;
    }

    public String getCourseBlockJson() {
        return courseBlockJson;
    }

    public void setCourseBlockJson(String courseBlockJson) {
        this.courseBlockJson = courseBlockJson;
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
