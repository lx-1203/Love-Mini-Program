package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 消息 outbox 事件实体（R4-00373），对应 outbox_event 表。
 *
 * <p>MQ（RabbitMQ）不可用或发送失败时，{@link com.campuslove.api.mq.MessageProducer}
 * 将事件落库本表，由定时补偿任务扫描 PENDING 事件重投，避免通知/匹配事件在
 * MQ 抖动期丢失（FIN-00046「日志+丢弃」的补偿闭环）。</p>
 */
@Entity
@Table(name = "outbox_event")
public class OutboxEvent {

    /** outbox 事件状态 */
    public enum OutboxStatus {
        /** 待补偿重投 */
        PENDING,
        /** 已成功投递 */
        SENT,
        /** 重试超过上限，需人工介入 */
        FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 队列类型：notification / match / checkin */
    @Column(name = "queue_type", nullable = false, length = 32)
    private String queueType;

    /** 目标交换机（补偿重投时原样使用） */
    @Column(name = "exchange_name", nullable = false, length = 128)
    private String exchangeName;

    /** 路由键 */
    @Column(name = "routing_key", nullable = false, length = 128)
    private String routingKey;

    /** 消息体 JSON（MessageProducer 序列化） */
    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    /** 状态：PENDING / SENT / FAILED */
    @Column(name = "status", nullable = false, length = 16)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private OutboxStatus status = OutboxStatus.PENDING;

    /** 已重试次数 */
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    /** 最近一次发送错误信息 */
    @Column(name = "last_error", length = 512)
    private String lastError;

    /** 创建时间（落库时间） */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** 补偿投递成功时间 */
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQueueType() {
        return queueType;
    }

    public void setQueueType(String queueType) {
        this.queueType = queueType;
    }

    public String getExchangeName() {
        return exchangeName;
    }

    public void setExchangeName(String exchangeName) {
        this.exchangeName = exchangeName;
    }

    public String getRoutingKey() {
        return routingKey;
    }

    public void setRoutingKey(String routingKey) {
        this.routingKey = routingKey;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public OutboxStatus getStatus() {
        return status;
    }

    public void setStatus(OutboxStatus status) {
        this.status = status;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
