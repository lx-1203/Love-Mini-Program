package com.campuslove.api.mq;

import java.io.Serializable;
import java.time.Instant;

/**
 * 通知消息载体。
 *
 * <p>通过 RabbitMQ 在生产者（业务服务）与消费者（通知下发服务）之间传递。
 * 字段经 Jackson 序列化为 JSON 投递到 {@code notification.queue}。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>{@code userId}：通知接收者用户 ID</li>
 *   <li>{@code type}：通知类型（like 喜欢 / match 匹配 / comment 评论 / system 系统）</li>
 *   <li>{@code title}：通知标题</li>
 *   <li>{@code content}：通知正文</li>
 *   <li>{@code createdAt}：消息创建时间（ISO-8601 Instant）</li>
 *   <li>{@code sourceUserId}：来源用户 ID（R4-00371，点赞/评论/关注等业务侧填充，
 *       供站内通知「谁互动了我」跳转来源用户主页；null/缺省时消费者回退系统虚拟用户）</li>
 *   <li>{@code referenceId}：关联业务实体 ID（R4-00371，如被点赞的帖子/动态 ID）</li>
 *   <li>{@code referenceType}：关联业务类型（R4-00371，user/post/comment 等，
 *       对应 Notification.ReferenceType）</li>
 * </ul>
 *
 * <p>实现 {@link Serializable} 以兼容 RabbitMQ 默认 Java 序列化机制
 * （实际使用 Jackson2JsonMessageConverter，保留 Serializable 是良好实践）。</p>
 */
public class NotificationMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 通知接收者用户 ID */
    private Long userId;

    /** 通知类型：like / match / comment / system */
    private String type;

    /** 通知标题 */
    private String title;

    /** 通知正文 */
    private String content;

    /** 消息创建时间（UTC Instant） */
    private Instant createdAt;

    /** 来源用户 ID（R4-00371：互动发起者；null/缺省时消费者回退系统虚拟用户） */
    private Long sourceUserId;

    /** 关联业务实体 ID（R4-00371：如被点赞/评论的帖子 ID、被关注的用户 ID） */
    private Long referenceId;

    /** 关联业务类型（R4-00371：user/post/comment 等，对应 Notification.ReferenceType） */
    private String referenceType;

    /** 默认构造函数：Jackson 反序列化需要 */
    public NotificationMessage() {
    }

    /**
     * 全参构造函数。
     *
     * @param userId    通知接收者用户 ID
     * @param type      通知类型（like/match/comment/system）
     * @param title     通知标题
     * @param content   通知正文
     * @param createdAt 消息创建时间
     */
    public NotificationMessage(Long userId, String type, String title,
                               String content, Instant createdAt) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
    }

    /**
     * 带来源上下文的构造函数（R4-00371）。
     *
     * @param userId        通知接收者用户 ID
     * @param type          通知类型（like/match/comment/system）
     * @param title         通知标题
     * @param content       通知正文
     * @param createdAt     消息创建时间
     * @param sourceUserId  来源用户 ID（互动发起者；可空）
     * @param referenceId   关联业务实体 ID（可空）
     * @param referenceType 关联业务类型（user/post/comment；可空）
     */
    public NotificationMessage(Long userId, String type, String title,
                               String content, Instant createdAt,
                               Long sourceUserId, Long referenceId, String referenceType) {
        this(userId, type, title, content, createdAt);
        this.sourceUserId = sourceUserId;
        this.referenceId = referenceId;
        this.referenceType = referenceType;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Long getSourceUserId() {
        return sourceUserId;
    }

    public void setSourceUserId(Long sourceUserId) {
        this.sourceUserId = sourceUserId;
    }

    public Long getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(Long referenceId) {
        this.referenceId = referenceId;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    @Override
    public String toString() {
        return "NotificationMessage{userId=" + userId
                + ", type='" + type + "', title='" + title + "'}";
    }
}
