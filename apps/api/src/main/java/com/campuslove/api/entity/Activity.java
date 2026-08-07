package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 活动实体，对应 activities 表。
 * 记录活动信息，包括标题、地点、时间、描述、报名人数等。
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
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

    /**
     * 是否上架（上下架管理，V2026.08.07.0014 新增）。
     *
     * <p>默认 true 保证向后兼容（现有活动全部保持可见）。
     * 下架（false）后小程序端活动列表不再展示，已报名用户仍可查看详情；
     * 与 status（活动进行阶段）正交：已下架的活动仍可有
     * upcoming/ongoing/ended 阶段状态。</p>
     */
    @Column(name = "published", nullable = false)
    private Boolean published = true;

    /** 活动日期 */
    @Column(name = "activity_date")
    private LocalDate activityDate;

    /** 记录创建时间（活动发布时间，用于排序展示） */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（活动信息编辑时刷新） */

    @LastModifiedDate

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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public Boolean getPublished() {
        return published;
    }

    public void setPublished(Boolean published) {
        this.published = published;
    }
}
