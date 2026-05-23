package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Lob;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 活动实体，对应 activities 表。
 * 记录活动信息，包括标题、地点、时间、描述、报名人数等。
 */
@Entity
@Table(name = "activities")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 活动标题 */
    @Column(name = "title", nullable = false, length = 128)
    private String title;

    /** 活动地点 */
    @Column(name = "location", nullable = false, length = 256)
    private String location;

    /** 活动时间描述 */
    @Column(name = "schedule_text", nullable = false, length = 128)
    private String scheduleText;

    /** 活动描述 */
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    /** 城市名称 */
    @Column(name = "city_name", length = 64)
    private String cityName;

    /** 校区名称 */
    @Column(name = "campus_name", length = 128)
    private String campusName;

    /** 报名人数 */
    @Column(name = "enrollment_count", nullable = false)
    private Integer enrollmentCount = 0;

    /** 参与者头像列表（JSON 格式，默认空数组） */
    @Column(name = "participant_avatars", columnDefinition = "JSON DEFAULT '[]'")
    private String participantAvatars = "[]";

    /** 活动状态：upcoming / ongoing / ended */
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private ActivityStatus status = ActivityStatus.upcoming;

    /** 活动日期 */
    @Column(name = "activity_date")
    private LocalDate activityDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Activity() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getScheduleText() {
        return scheduleText;
    }

    public void setScheduleText(String scheduleText) {
        this.scheduleText = scheduleText;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCityName() {
        return cityName;
    }

    public void setCityName(String cityName) {
        this.cityName = cityName;
    }

    public String getCampusName() {
        return campusName;
    }

    public void setCampusName(String campusName) {
        this.campusName = campusName;
    }

    public Integer getEnrollmentCount() {
        return enrollmentCount;
    }

    public void setEnrollmentCount(Integer enrollmentCount) {
        this.enrollmentCount = enrollmentCount;
    }

    public String getParticipantAvatars() {
        return participantAvatars;
    }

    public void setParticipantAvatars(String participantAvatars) {
        this.participantAvatars = participantAvatars;
    }

    public ActivityStatus getStatus() {
        return status;
    }

    public void setStatus(ActivityStatus status) {
        this.status = status;
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public void setActivityDate(LocalDate activityDate) {
        this.activityDate = activityDate;
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

    /**
     * 活动状态枚举。
     */
    public enum ActivityStatus {
        upcoming,
        ongoing,
        ended
    }
}
