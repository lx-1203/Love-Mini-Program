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
 *
 * <p><b>SENT 的语义边界（2026-10-31 P1 修复时必须写清，此前代码把这两件事混为一谈）</b>：
 * {@code status=SENT} 只表示「<b>已交给 broker</b>」（convertAndSend 没抛异常），
 * <b>不表示</b>「消费成功」。至于消费，本表一无所知——消费失败的消息在重试耗尽后
 * 由 RabbitConfig 声明的死信交换机投进对应的 {@code *.dlq} 队列（带 {@code x-death}
 * 头）。因此运维排查「通知为什么没到用户手上」时，SENT 行 + DLQ 堆积才是完整链路，
 * 只看本表 status 会得出错误结论。</p>
 *
 * <p>列与迁移对应：{@code dedup_key} / {@code claimed_at} 由
 * V2026.10.31.0002__add_outbox_dedup_key.sql 引入（{@code status} 是
 * VARCHAR(16)，新增的 {@code IN_PROGRESS} 取值无需改表）。
 * {@code ddl-auto=validate} 要求迁移先于发版执行。</p>
 */
@Entity
@Table(name = "outbox_event")
public class OutboxEvent {

    /** outbox 事件状态 */
    public enum OutboxStatus {
        /** 待补偿重投 */
        PENDING,
        /**
         * 已被某个补偿实例认领、正在投递（2026-10-31 P0）。
         *
         * <p>存在意义：跨 JVM 的「先认领再投递」互斥。滚动重启期间两个实例扫到
         * 同一批 PENDING 行时，只有条件更新命中（影响行数 == 1）的那个实例有权投递。
         * 进程在投递中途被杀会让行卡在本状态，由
         * {@link com.campuslove.api.mq.MessageProducer#compensatePendingEvents()}
         * 按 {@code claimed_at} 超时回收回 PENDING。</p>
         */
        IN_PROGRESS,
        /**
         * 已成功投递给 broker（<b>不代表消费成功</b>，见类注释「SENT 的语义边界」）
         */
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

    /**
     * 业务事件幂等键（V2026.10.31.0002，唯一索引 uk_outbox_dedup_key）。
     *
     * <p>来源是消息体的 {@code eventId}（生产者侧 {@code MessageProducer} 保证非空：
     * 调用方没带就补一个 UUID，并随 payload_json 一起落库，因此 outbox 重投后
     * 消费端仍能认出「这是同一个事件」）。NULL = 无法确定业务身份，不参与跨行去重。</p>
     *
     * <p>以 {@code legacy-} 开头的是迁移回填的存量行，仅用于追溯，不代表业务身份。</p>
     */
    @Column(name = "dedup_key", length = 64)
    private String dedupKey;

    /** 状态：PENDING / IN_PROGRESS / SENT / FAILED */
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

    /**
     * 补偿任务认领该行的时间（V2026.10.31.0002）。
     *
     * <p>两条用途：状态置 IN_PROGRESS 时写入；超过
     * {@code OUTBOX_CLAIM_TIMEOUT_SECONDS} 仍没回写终态的行视为「认领实例已崩溃」，
     * 由下一轮 sweep 回收成 PENDING 重投。</p>
     */
    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

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

    public String getDedupKey() {
        return dedupKey;
    }

    public void setDedupKey(String dedupKey) {
        this.dedupKey = dedupKey;
    }

    public LocalDateTime getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(LocalDateTime claimedAt) {
        this.claimedAt = claimedAt;
    }
}
