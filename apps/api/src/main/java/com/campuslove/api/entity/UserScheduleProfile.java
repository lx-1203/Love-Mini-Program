package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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

    /** 偏好时间窗口 JSON（默认空数组） */
    @Column(name = "preferred_time_window_json", nullable = false, columnDefinition = "JSON DEFAULT '[]'")
    private String preferredTimeWindowJson = "[]";

    /** 课程安排 JSON（默认空数组） */
    @Column(name = "course_block_json", nullable = false, columnDefinition = "JSON DEFAULT '[]'")
    private String courseBlockJson = "[]";

    /** 记录创建时间（日程资料入库时间） */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（日程资料编辑时刷新） */
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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
