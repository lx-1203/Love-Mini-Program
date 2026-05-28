package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 私信消息实体，对应 private_messages 表。
 * 关联 PrivateConversation，支持级联删除。
 * 消息类型: text / image / voice 等。
 */
@Entity
@Table(name = "private_messages")
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
}
