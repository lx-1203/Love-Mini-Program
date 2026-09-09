package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 官方客服双向会话消息实体，对应 official_chat_messages 表（R16 2026-09-07）。
 *
 * <p>与广播型 official_messages 不同，本表按 (user_id, account_id) 存储用户与
 * 寻觅助手的一对一对话：direction=user 为用户发送，direction=assistant 为助手回复。</p>
 */
@Entity
@Table(
    name = "official_chat_messages",
    indexes = {
        @Index(name = "idx_ocm_user_account_time", columnList = "user_id, account_id, created_at")
    }
)
public class OfficialChatMessage {

    /** 消息方向 */
    public enum Direction {
        user, assistant
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 发送/归属用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 所属官方号 ID（FK -> official_accounts.id） */
    @Column(name = "account_id", nullable = false)
    private Long accountId;

    /** 方向：user / assistant */
    @Column(name = "direction", nullable = false, length = 16)
    private String direction = Direction.user.name();

    /** 消息正文 */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
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
}
