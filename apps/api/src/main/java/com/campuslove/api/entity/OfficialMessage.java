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

    /**
     * 受众类型（P1-2「按人群群发」，2026-11-03）。
     * <ul>
     *   <li>{@code ALL}：全站可见（默认，与历史行为一致）</li>
     *   <li>{@code CAMPUS}：仅 {@code audience_value} 指定校区的用户可见
     *       （校区名与 {@code user_campus_profile.campus_name} 同口径）</li>
     *   <li>{@code CIRCLE}：仅 {@code audience_value} 圈层子树内的用户可见
     *       （前缀按路径段匹配 users.circle_path：等于节点或位于节点子树）</li>
     * </ul>
     */
    public enum AudienceType {
        ALL, CAMPUS, CIRCLE
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

    /** 活动卡关联的 activities.id（可空） */
    @Column(name = "card_activity_id")
    private Long cardActivityId;

    /** 活动卡推荐理由（面向用户展示） */
    @Column(name = "recommend_reason", columnDefinition = "TEXT")
    private String recommendReason;

    /**
     * 受众类型（P1-2 按人群群发，2026-11-03；列由 V2026.11.03.0002 迁移新增）。
     * <p>存量行为兼容：默认 {@code ALL}，即迁移前的「全站广播」。</p>
     */
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "audience_type", nullable = false, length = 16,
            columnDefinition = "VARCHAR(16) NOT NULL DEFAULT 'ALL'")
    private AudienceType audienceType = AudienceType.ALL;

    /**
     * 受众值（P1-2）：CAMPUS=校区名；CIRCLE=圈层路径前缀（如 {@code C1/R1}）；
     * ALL 时为 null。
     */
    @Column(name = "audience_value", length = 256)
    private String audienceValue;

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

    public Long getCardActivityId() {
        return cardActivityId;
    }

    public void setCardActivityId(Long cardActivityId) {
        this.cardActivityId = cardActivityId;
    }

    public String getRecommendReason() {
        return recommendReason;
    }

    public void setRecommendReason(String recommendReason) {
        this.recommendReason = recommendReason;
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

    /** P1-2 受众类型（默认 ALL=全站）。 */
    public AudienceType getAudienceType() {
        return audienceType;
    }

    public void setAudienceType(AudienceType audienceType) {
        this.audienceType = audienceType;
    }

    /** P1-2 受众值（CAMPUS=校区名 / CIRCLE=圈层路径前缀 / ALL 时 null）。 */
    public String getAudienceValue() {
        return audienceValue;
    }

    public void setAudienceValue(String audienceValue) {
        this.audienceValue = audienceValue;
    }
}

