package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 左滑(pass)记录实体，对应 pass_records 表。
 * 记录用户执行左滑（跳过）操作的历史，用于推荐算法排除已跳过的用户。
 */
@Entity
@Table(name = "pass_records")
public class PassRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 执行 pass 的用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 被 pass 的用户 ID */
    @Column(name = "passed_user_id", nullable = false)
    private Long passedUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PassRecord() {
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

    public Long getPassedUserId() {
        return passedUserId;
    }

    public void setPassedUserId(Long passedUserId) {
        this.passedUserId = passedUserId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
