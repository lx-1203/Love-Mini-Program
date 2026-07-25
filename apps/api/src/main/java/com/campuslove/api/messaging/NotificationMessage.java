package com.campuslove.api.messaging;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 通知消息体。
 *
 * <p>通过 RabbitMQ 在生产者（业务服务）与消费者（通知下发服务）之间传递。
 * 字段经过 Jackson 序列化为 JSON 投递到 {@code notification.queue}。</p>
 *
 * <p>注意：必须实现 {@link Serializable} 以兼容 RabbitMQ 默认序列化机制
 * （虽然实际使用 Jackson2JsonMessageConverter，但保留 Serializable 是良好实践）。</p>
 */
public class NotificationMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 消息唯一 ID（UUID 字符串，便于幂等去重） */
    private String id;

    /** 通知类型（like/comment/match/system 等） */
    private String type;

    /** 接收通知的用户 ID */
    private Long userId;

    /** 通知标题 */
    private String title;

    /** 通知正文 */
    private String content;

    /** 消息创建时间（ISO-8601 字符串，序列化时由 Jackson 处理） */
    private LocalDateTime createdAt;

    /** 默认构造函数：Jackson 反序列化需要 */
    public NotificationMessage() {
    }

    public NotificationMessage(String id, String type, Long userId,
                               String title, String content, LocalDateTime createdAt) {
        this.id = id;
        this.type = type;
        this.userId = userId;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "NotificationMessage{id='" + id + "', type='" + type
                + "', userId=" + userId + ", title='" + title + "'}";
    }
}
