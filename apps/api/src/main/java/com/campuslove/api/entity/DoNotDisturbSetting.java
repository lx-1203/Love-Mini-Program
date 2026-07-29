package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 通知免打扰设置实体，对应 dnd_settings 表（功能6）。
 *
 * <p>记录用户的通知免打扰偏好：在指定时间段内、按指定重复方式
 * 不接收消息推送；可选允许紧急消息穿透免打扰。</p>
 *
 * <p>设计说明：
 * <ul>
 *   <li>user_id 唯一：一个用户仅有一条偏好记录，upsert 时按 user_id 查找</li>
 *   <li>start_time / end_time：HH:mm 格式字符串，前端 picker 直接绑定</li>
 *   <li>repeat_mode：枚举字符串（EVERYDAY/WEEKDAYS/WEEKENDS/CUSTOM），避免 JPA 枚举映射兼容性问题</li>
 *   <li>custom_weekdays：CSV 字符串（如 "1,3,5"），仅 CUSTOM 模式使用</li>
 * </ul>
 * </p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "dnd_settings")
public class DoNotDisturbSetting {

    /** 主键，自增 */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID（唯一） */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 是否开启免打扰 */
    @Column(name = "enabled", nullable = false)
    private Boolean enabled = false;

    /** 免打扰开始时间（HH:mm） */
    @Column(name = "start_time", nullable = false, length = 8)
    private String startTime = "22:00";

    /** 免打扰结束时间（HH:mm） */
    @Column(name = "end_time", nullable = false, length = 8)
    private String endTime = "08:00";

    /** 重复方式：EVERYDAY / WEEKDAYS / WEEKENDS / CUSTOM */
    @Column(name = "repeat_mode", nullable = false, length = 16)
    private String repeatMode = "EVERYDAY";

    /** 自定义星期（CSV，1-7），仅 CUSTOM 模式使用 */
    @Column(name = "custom_weekdays", length = 16)
    private String customWeekdays;

    /** 是否允许紧急消息穿透免打扰 */
    @Column(name = "allow_urgent", nullable = false)
    private Boolean allowUrgent = true;

    /** 记录创建时间（Task 37 P2.14 审计字段补齐） */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 更新时间 */

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


    public DoNotDisturbSetting() {
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

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getRepeatMode() {
        return repeatMode;
    }

    public void setRepeatMode(String repeatMode) {
        this.repeatMode = repeatMode;
    }

    public String getCustomWeekdays() {
        return customWeekdays;
    }

    public void setCustomWeekdays(String customWeekdays) {
        this.customWeekdays = customWeekdays;
    }

    public Boolean getAllowUrgent() {
        return allowUrgent;
    }

    public void setAllowUrgent(Boolean allowUrgent) {
        this.allowUrgent = allowUrgent;
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
