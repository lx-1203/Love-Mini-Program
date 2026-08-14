package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 邀请奖励记录实体，对应 invite_reward 表（3-K 邀请奖励，Flyway V2026.08.10.0025）。
 *
 * <p>语义：</p>
 * <ul>
 *   <li>一个用户只能被绑定一次（uk_invite_reward_invitee 唯一约束 + 服务层校验）</li>
 *   <li>奖励发放：accept 时即发放给邀请人（最简单可靠；可改为「被邀请人完成注册后发」，
 *       届时 status 预留 PENDING/GRANTED/FAILED 用于状态流转）</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "invite_reward", uniqueConstraints = {
        @UniqueConstraint(name = "uk_invite_reward_invitee", columnNames = {"invitee_user_id"})
})
public class InviteReward {

    /** 状态：已发放 */
    public static final String STATUS_GRANTED = "GRANTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 邀请人用户 ID */
    @Column(name = "inviter_user_id", nullable = false)
    private Long inviterUserId;

    /** 被邀请人用户 ID */
    @Column(name = "invitee_user_id", nullable = false)
    private Long inviteeUserId;

    /** 奖励积分（发放入邀请人钱包） */
    @Column(name = "reward_points", nullable = false)
    private Integer rewardPoints = 0;

    /** 状态：GRANTED 已发放（预留 PENDING/FAILED） */
    @Column(name = "status", nullable = false, length = 16)
    private String status = STATUS_GRANTED;

    /** 发放时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public InviteReward() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getInviterUserId() {
        return inviterUserId;
    }

    public void setInviterUserId(Long inviterUserId) {
        this.inviterUserId = inviterUserId;
    }

    public Long getInviteeUserId() {
        return inviteeUserId;
    }

    public void setInviteeUserId(Long inviteeUserId) {
        this.inviteeUserId = inviteeUserId;
    }

    public Integer getRewardPoints() {
        return rewardPoints;
    }

    public void setRewardPoints(Integer rewardPoints) {
        this.rewardPoints = rewardPoints;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
