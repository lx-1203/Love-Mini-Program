package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 支付回调日志实体，对应 payment_callback_log 表。
 *
 * <p>Task 12.1（REAUDIT-REPORT-100+ 编号 38）：BillingService 支付回调幂等性。
 * 微信支付可能因网络抖动多次推送同一回调通知，通过 notification_id 唯一索引
 * 保证同一回调只处理一次，避免重复开通 VIP、重复生成账单。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>notificationId：微信回调通知 ID（幂等键，唯一索引）</li>
 *   <li>orderNo：业务订单号（与 vip_bills.transaction_id 关联）</li>
 *   <li>amount：回调通知中的支付金额（元）</li>
 *   <li>status：处理状态 SUCCESS / FAIL</li>
 *   <li>createdAt：记录创建时间</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "payment_callback_log",
    indexes = {
        // notification_id 唯一索引：幂等性兜底，重复回调直接返回 SUCCESS
        @Index(name = "uk_payment_callback_notification", columnList = "notification_id", unique = true),
        // 订单号索引：对账场景按订单号查询历史回调
        @Index(name = "idx_payment_callback_order", columnList = "order_no")
    }
)
public class PaymentCallbackLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 微信回调通知 ID（幂等键） */
    @Column(name = "notification_id", nullable = false, unique = true, length = 128)
    private String notificationId;

    /** 业务订单号 */
    @Column(name = "order_no", nullable = false, length = 64)
    private String orderNo;

    /** 回调通知金额（元） */
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    /** 处理状态 SUCCESS / FAIL */
    @Column(name = "status", nullable = false, length = 16)
    private String status;

    /** 记录创建时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PaymentCallbackLog() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(String notificationId) {
        this.notificationId = notificationId;
    }

    public String getOrderNo() {
        return orderNo;
    }

    public void setOrderNo(String orderNo) {
        this.orderNo = orderNo;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
