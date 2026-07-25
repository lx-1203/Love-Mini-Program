package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 用户签到记录实体，对应 check_ins 表。
 * 记录每日签到及连续签到天数。
 *
 * 功能7：新增 source 字段，标记签到来源（NORMAL/MAKE_UP）。
 */
@Entity
@Table(name = "check_ins")
public class CheckIn {

    /** 正常签到来源 */
    public static final String SOURCE_NORMAL = "NORMAL";

    /** 补签来源 */
    public static final String SOURCE_MAKE_UP = "MAKE_UP";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 签到用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 签到日期 */
    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    /** 连续签到天数 */
    @Column(name = "consecutive_days", nullable = false)
    private Integer consecutiveDays = 1;

    /**
     * 签到来源：NORMAL=正常签到，MAKE_UP=补签。
     * 默认 NORMAL，兼容历史数据。
     */
    @Column(name = "source", nullable = false, length = 16)
    private String source = SOURCE_NORMAL;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CheckIn() {
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

    public LocalDate getCheckInDate() {
        return checkInDate;
    }

    public void setCheckInDate(LocalDate checkInDate) {
        this.checkInDate = checkInDate;
    }

    public Integer getConsecutiveDays() {
        return consecutiveDays;
    }

    public void setConsecutiveDays(Integer consecutiveDays) {
        this.consecutiveDays = consecutiveDays;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
