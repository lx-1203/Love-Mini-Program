package com.campuslove.api.mq;

import java.io.Serializable;
import java.time.Instant;

/**
 * 匹配事件消息载体。
 *
 * <p>当用户对另一用户执行 like / super_like / match / unmatch 操作时，
 * 通过 RabbitMQ 投递到 {@code match.queue}，由消费者异步处理
 * （如发送心动信号、推送微信通知等）。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>{@code userId}：事件发起者用户 ID</li>
 *   <li>{@code targetUserId}：事件目标用户 ID</li>
 *   <li>{@code eventType}：事件类型（like 喜欢 / super_like 超级喜欢 / match 互相喜欢 / unmatch 取消匹配）</li>
 *   <li>{@code createdAt}：事件创建时间（ISO-8601 Instant）</li>
 * </ul>
 */
public class MatchEventMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 事件发起者用户 ID */
    private Long userId;

    /** 事件目标用户 ID */
    private Long targetUserId;

    /** 事件类型：like / super_like / match / unmatch */
    private String eventType;

    /** 事件创建时间（UTC Instant） */
    private Instant createdAt;

    /** 默认构造函数：Jackson 反序列化需要 */
    public MatchEventMessage() {
    }

    /**
     * 全参构造函数。
     *
     * @param userId        事件发起者用户 ID
     * @param targetUserId  事件目标用户 ID
     * @param eventType     事件类型（like/super_like/match/unmatch）
     * @param createdAt     事件创建时间
     */
    public MatchEventMessage(Long userId, Long targetUserId, String eventType, Instant createdAt) {
        this.userId = userId;
        this.targetUserId = targetUserId;
        this.eventType = eventType;
        this.createdAt = createdAt;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getTargetUserId() {
        return targetUserId;
    }

    public void setTargetUserId(Long targetUserId) {
        this.targetUserId = targetUserId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "MatchEventMessage{userId=" + userId
                + ", targetUserId=" + targetUserId
                + ", eventType='" + eventType + "'}";
    }
}
