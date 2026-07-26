package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 私信消息实体，对应 private_messages 表。
 * 关联 PrivateConversation，支持级联删除。
 * 消息类型: text / image / voice 等。
 *
 * <p>索引说明（与数据库 Flyway 脚本保持一致）：</p>
 * <ul>
 *   <li>idx_private_messages_sender_created_at：(sender_id, created_at) 复合索引，按发送者查询消息历史</li>
 *   <li>idx_private_messages_conversation_read：(conversation_id, is_read, created_at) 复合索引，会话未读消息统计</li>
 *   <li>idx_pm_conv_read：(conversation_id, is_read) 复合索引，会话未读计数（轻量版）</li>
 *   <li>idx_private_messages_conversation_created_at：(conversation_id, created_at) 复合索引，会话消息分页（任务规格中 session_id+created_at 的对应）</li>
 *   <li>idx_private_messages_created_at：created_at 单列索引，按时间排序</li>
 *   <li>idx_private_messages_delivery_status：delivery_status 索引，按投递状态过滤（任务规格中 status 的对应）</li>
 * </ul>
 *
 * <p>注：任务规格中提到 session_id / status 字段，实际表中分别为 conversation_id / delivery_status，
 * 故索引按实际字段命名。详见 V2026.07.25.0001 迁移脚本说明。</p>
 */
@Entity
@Table(
    name = "private_messages",
    indexes = {
        // (发送者 ID, 创建时间) 复合索引：按发送者查询消息历史并分页
        @Index(name = "idx_private_messages_sender_created_at", columnList = "sender_id, created_at"),
        // (会话 ID, 是否已读, 创建时间) 复合索引：会话未读消息统计与分页
        @Index(name = "idx_private_messages_conversation_read", columnList = "conversation_id, is_read, created_at"),
        // (会话 ID, 是否已读) 复合索引：会话未读计数（轻量版）
        @Index(name = "idx_pm_conv_read", columnList = "conversation_id, is_read"),
        // (会话 ID, 创建时间) 复合索引：会话消息按时间分页（任务规格 session_id+created_at 的对应）
        @Index(name = "idx_private_messages_conversation_created_at", columnList = "conversation_id, created_at"),
        // 创建时间单列索引：按时间排序、全局消息扫描
        @Index(name = "idx_private_messages_created_at", columnList = "created_at"),
        // 投递状态索引：按投递状态过滤（sent/delivered/read，任务规格 status 的对应）
        @Index(name = "idx_private_messages_delivery_status", columnList = "delivery_status")
    }
)
public class PrivateMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属会话 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_private_messages_conversation"))
    private PrivateConversation conversation;

    /** 发送者 ID */
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    /** 消息内容 */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 消息类型: text / image / voice / quote 等 */
    @Column(name = "message_kind", nullable = false, length = 16)
    private String messageKind = "text";

    /**
     * 引用上下文（JSON 格式）。
     * 当 messageKind 为 "quote" 时，存储引用来源信息。
     * 例如：{"topicTitle":"...","topicId":"...","replyId":"...","replyContent":"...","replyAuthorName":"..."}
     */
    @Column(name = "quote_context", columnDefinition = "TEXT")
    private String quoteContext;

    /** 是否已读 */
    @Column(name = "is_read", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isRead = false;

    /** 是否已撤回（仅发送者本人可在 2 分钟内撤回） */
    @Column(name = "recalled", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean recalled = false;

    /** 投递状态：sent（已发送）/ delivered（已送达）/ read（已读） */
    @Column(name = "delivery_status", nullable = false, length = 16)
    private String deliveryStatus = "sent";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PrivateMessage() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PrivateConversation getConversation() {
        return conversation;
    }

    public void setConversation(PrivateConversation conversation) {
        this.conversation = conversation;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getMessageKind() {
        return messageKind;
    }

    public void setMessageKind(String messageKind) {
        this.messageKind = messageKind;
    }

    public String getQuoteContext() {
        return quoteContext;
    }

    public void setQuoteContext(String quoteContext) {
        this.quoteContext = quoteContext;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Boolean getRecalled() {
        return recalled;
    }

    public void setRecalled(Boolean recalled) {
        this.recalled = recalled;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public void setDeliveryStatus(String deliveryStatus) {
        this.deliveryStatus = deliveryStatus;
    }
}
