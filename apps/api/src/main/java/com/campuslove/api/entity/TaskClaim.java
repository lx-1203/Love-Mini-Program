package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 任务领取记录实体，对应 task_claim 表（3-J 任务与积分，Flyway V2026.08.10.0024）。
 *
 * <p>领取语义：</p>
 * <ul>
 *   <li>每日任务（daily-checkin）：claimDate = 当日，(user_id, task_code, claim_date)
 *       唯一约束防同日重复领取；次日可再领</li>
 *   <li>一次性任务（complete-profile / first-post / campus-verify）：
 *       claimDate = null，应用层校验「同一任务只可领取一次」
 *       （MySQL 唯一索引允许多个 NULL，故由服务层先查后写兜底）</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "task_claim", uniqueConstraints = {
        @UniqueConstraint(name = "uk_task_claim_user_code_date",
                columnNames = {"user_id", "task_code", "claim_date"})
})
public class TaskClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 任务编码：daily-checkin/complete-profile/first-post/campus-verify */
    @Column(name = "task_code", nullable = false, length = 32)
    private String taskCode;

    /** 领取日期：每日任务=当日；一次性任务=NULL */
    @Column(name = "claim_date")
    private LocalDate claimDate;

    /** 领取时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public TaskClaim() {
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

    public String getTaskCode() {
        return taskCode;
    }

    public void setTaskCode(String taskCode) {
        this.taskCode = taskCode;
    }

    public LocalDate getClaimDate() {
        return claimDate;
    }

    public void setClaimDate(LocalDate claimDate) {
        this.claimDate = claimDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
