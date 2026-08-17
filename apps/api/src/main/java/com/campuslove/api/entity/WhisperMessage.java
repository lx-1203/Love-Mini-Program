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
 * 悄悄话（付费留言）实体，对应 whisper_message 表。
 *
 * <p>v3.1 契约：同一对用户 A↔B 最多 1 条有效；每个发送者每日 ≤5 条；
 * 幂等 clientRequestId；钱包扣费与创建同事务，创建失败自动退款（REFUNDED）。</p>
 *
 * <p>状态机：DRAFT → PAYING → SENT → DELIVERED → READ；
 * 异常：PAY_FAILED / SEND_FAILED / REFUNDED / BLOCKED / EXPIRED。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "whisper_message",
    indexes = {
        @Index(name = "idx_whisper_sender", columnList = "sender_id"),
        @Index(name = "idx_whisper_receiver_status", columnList = "receiver_id, status"),
        @Index(name = "uk_whisper_client_request", columnList = "client_request_id", unique = true)
    }
)
public class WhisperMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 发送者用户 ID */
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    /** 接收者用户 ID */
    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    /** 留言内容（≤60 字） */
    @Column(name = "content", nullable = false, length = 60)
    private String content;

    /** 状态（SENT / DELIVERED / READ / PAY_FAILED / REFUNDED ...） */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    /** 幂等键（同一 clientRequestId 只扣一次费、只生成一条记录） */
    @Column(name = "client_request_id", nullable = false, length = 64)
    private String clientRequestId;

    /** 扣费金额（分） */
    @Column(name = "price_cents", nullable = false)
    private Long priceCents;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }
    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getClientRequestId() { return clientRequestId; }
    public void setClientRequestId(String clientRequestId) { this.clientRequestId = clientRequestId; }
    public Long getPriceCents() { return priceCents; }
    public void setPriceCents(Long priceCents) { this.priceCents = priceCents; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
    public LocalDateTime getRefundedAt() { return refundedAt; }
    public void setRefundedAt(LocalDateTime refundedAt) { this.refundedAt = refundedAt; }
}
