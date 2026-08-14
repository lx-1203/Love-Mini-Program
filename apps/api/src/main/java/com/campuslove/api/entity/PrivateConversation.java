package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 私信会话实体，对应 private_conversations 表。
 * 存储两个用户之间的会话信息，包括最后一条消息预览。
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "private_conversations")
public class PrivateConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 会话唯一标识 */
    @Column(name = "conversation_uid", nullable = false, length = 64, unique = true)
    private String conversationUid;

    /** 用户 A ID */
    @Column(name = "user_a_id", nullable = false)
    private Long userAId;

    /** 用户 B ID */
    @Column(name = "user_b_id", nullable = false)
    private Long userBId;

    /** 最后一条消息预览 */
    @Column(name = "last_message_preview", length = 255)
    private String lastMessagePreview;

    /** 最后消息时间 */
    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    /** 是否置顶 */
    @Column(name = "pinned", nullable = false)
    private Boolean pinned = false;

    /** 用户 A 是否静音本会话（会话级免打扰，按用户侧独立，2026-08-10 B1③） */
    @Column(name = "user_a_muted", nullable = false)
    private Boolean userAMuted = false;

    /** 用户 B 是否静音本会话（会话级免打扰，按用户侧独立，2026-08-10 B1③） */
    @Column(name = "user_b_muted", nullable = false)
    private Boolean userBMuted = false;

    /** 记录创建时间（会话创建时间，用于排序展示） */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（会话状态变更时刷新） */

    @LastModifiedDate

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     *
     * <p>由 JPA 自动维护，每次实体更新时 version 自增。
     * 并发更新冲突时抛出 {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 409 Conflict。</p>
     *
     * <p>初始值 0L，对应数据库列 {@code version BIGINT DEFAULT 0}（Flyway V2026.07.26.0003）。</p>
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;


    public PrivateConversation() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getConversationUid() {
        return conversationUid;
    }

    public void setConversationUid(String conversationUid) {
        this.conversationUid = conversationUid;
    }

    public Long getUserAId() {
        return userAId;
    }

    public void setUserAId(Long userAId) {
        this.userAId = userAId;
    }

    public Long getUserBId() {
        return userBId;
    }

    public void setUserBId(Long userBId) {
        this.userBId = userBId;
    }

    public String getLastMessagePreview() {
        return lastMessagePreview;
    }

    public void setLastMessagePreview(String lastMessagePreview) {
        this.lastMessagePreview = lastMessagePreview;
    }

    public LocalDateTime getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(LocalDateTime lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }

    public Boolean getPinned() {
        return pinned;
    }

    public void setPinned(Boolean pinned) {
        this.pinned = pinned;
    }

    public Boolean getUserAMuted() {
        return userAMuted;
    }

    public void setUserAMuted(Boolean userAMuted) {
        this.userAMuted = userAMuted;
    }

    public Boolean getUserBMuted() {
        return userBMuted;
    }

    public void setUserBMuted(Boolean userBMuted) {
        this.userBMuted = userBMuted;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
