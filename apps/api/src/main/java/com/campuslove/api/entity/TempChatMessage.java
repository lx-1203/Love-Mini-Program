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
 * 临时聊天消息实体，对应 temp_chat_message 表。
 * 关联 TempChatSession，支持文本、语音、表情等消息类型。
 */
@Entity
@Table(name = "temp_chat_message")
public class TempChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属会话 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_temp_chat_message_session"))
    private TempChatSession session;

    /** 发送者标识: self(自己) / peer(对方) / system(系统) */
    @Column(name = "sender", nullable = false, length = 16)
    private String sender;

    /** 消息类型: text / voice / emoji / system 等 */
    @Column(name = "kind", nullable = false, length = 16)
    private String kind = "text";

    /** 消息内容 */
    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    /** 语音消息时长（秒），仅 voice 类型消息使用 */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public TempChatMessage() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TempChatSession getSession() {
        return session;
    }

    public void setSession(TempChatSession session) {
        this.session = session;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
