package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 官方号消息实体，对应 official_messages 表。
 *
 * <p>消息类型：{@code text} 文本消息 / {@code card} 活动卡片消息（含 CTA 跳转）。
 * 消息流按 account_id + published_at 排序，列表预览取每个账号最新一条。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "official_messages",
    indexes = {
        @Index(name = "idx_official_messages_account_published", columnList = "account_id, published_at")
    }
)
public class OfficialMessage {

    /** 消息类型：text 文本 / card 活动卡片 */
    public enum MessageType {
        text, card
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属官方号 ID（FK -> official_accounts.id） */
    @Column(name = "account_id", nullable = false)
    private Long accountId;

    /** 消息类型（text / card） */
    @Column(name = "message_type", nullable = false, length = 16)
    private String messageType = MessageType.text.name();

    /** 消息正文（card 类型为卡片副标题文案） */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 活动卡片标题（card 类型） */
    @Column(name = "card_title", length = 128)
    private String cardTitle;

    /** 活动卡片描述（card 类型） */
    @Column(name = "card_desc", length = 255)
    private String cardDesc;

    /** 活动卡片角标（如「七夕限定」） */
    @Column(name = "card_tag", length = 32)
    private String cardTag;

    /** 活动卡片 CTA 跳转地址 */
    @Column(name = "card_target_url", length = 512)
    private String cardTargetUrl;

    /** 消息顺序（升序展示） */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    /** 发布时间（列表预览取最新一条） */
    @Column(name = "published_at", nullable = false)
    private LocalDateTime publishedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public String getMessageType() {
        return messageType;
    }

    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCardTitle() {
        return cardTitle;
    }

    public void setCardTitle(String cardTitle) {
        this.cardTitle = cardTitle;
    }

    public String getCardDesc() {
        return cardDesc;
    }

    public void setCardDesc(String cardDesc) {
        this.cardDesc = cardDesc;
    }

    public String getCardTag() {
        return cardTag;
    }

    public void setCardTag(String cardTag) {
        this.cardTag = cardTag;
    }

    public String getCardTargetUrl() {
        return cardTargetUrl;
    }

    public void setCardTargetUrl(String cardTargetUrl) {
        this.cardTargetUrl = cardTargetUrl;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public LocalDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(LocalDateTime publishedAt) {
        this.publishedAt = publishedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
