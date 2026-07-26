package com.campuslove.api.mq;

import java.io.Serializable;
import java.time.Instant;

/**
 * 签到事件消息载体。
 *
 * <p>用户签到成功后，通过 RabbitMQ 投递到 {@code checkin.queue}，
 * 由消费者异步处理（如推送签到成功通知、连续签到达成奖励通知等）。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>{@code userId}：签到用户 ID</li>
 *   <li>{@code consecutiveDays}：连续签到天数</li>
 *   <li>{@code rewardPoints}：本次签到奖励积分</li>
 *   <li>{@code createdAt}：事件创建时间（ISO-8601 Instant）</li>
 * </ul>
 */
public class CheckInEventMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 签到用户 ID */
    private Long userId;

    /** 连续签到天数 */
    private int consecutiveDays;

    /** 本次签到奖励积分 */
    private int rewardPoints;

    /** 事件创建时间（UTC Instant） */
    private Instant createdAt;

    /** 默认构造函数：Jackson 反序列化需要 */
    public CheckInEventMessage() {
    }

    /**
     * 全参构造函数。
     *
     * @param userId           签到用户 ID
     * @param consecutiveDays  连续签到天数
     * @param rewardPoints     本次签到奖励积分
     * @param createdAt        事件创建时间
     */
    public CheckInEventMessage(Long userId, int consecutiveDays, int rewardPoints, Instant createdAt) {
        this.userId = userId;
        this.consecutiveDays = consecutiveDays;
        this.rewardPoints = rewardPoints;
        this.createdAt = createdAt;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public int getConsecutiveDays() {
        return consecutiveDays;
    }

    public void setConsecutiveDays(int consecutiveDays) {
        this.consecutiveDays = consecutiveDays;
    }

    public int getRewardPoints() {
        return rewardPoints;
    }

    public void setRewardPoints(int rewardPoints) {
        this.rewardPoints = rewardPoints;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "CheckInEventMessage{userId=" + userId
                + ", consecutiveDays=" + consecutiveDays
                + ", rewardPoints=" + rewardPoints + "}";
    }
}
