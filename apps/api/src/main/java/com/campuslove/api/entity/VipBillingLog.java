package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * VIP 续费交易流水实体，对应 vip_billing_log 表。
 *
 * <p>Task 12.2（REAUDIT-REPORT-100+ 编号 39）：AutoRenewService 自动续费分布式锁与对账。
 * 每次自动续费（无论成功/失败）均写入流水，用于：</p>
 * <ul>
 *   <li>对账：核对支付渠道侧扣款与系统侧续费次数是否一致</li>
 *   <li>审计：追溯单用户历史续费记录</li>
 *   <li>故障排查：续费失败时通过 status=FAILED 快速定位</li>
 * </ul>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>userId：用户 ID</li>
 *   <li>orderNo：本次续费订单号（与 vip_bills.transaction_id 关联）</li>
 *   <li>amount：续费金额（分）</li>
 *   <li>status：续费状态 SUCCESS / FAILED</li>
 *   <li>createdAt：续费时间</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "vip_billing_log",
    indexes = {
        // 用户 ID 索引：按用户查询续费流水
        @Index(name = "idx_vip_billing_log_user", columnList = "user_id"),
        // 订单号索引：对账场景按订单号查询
        @Index(name = "idx_vip_billing_log_order", columnList = "order_no"),
        // 状态索引：按状态筛选（如对账时仅查 SUCCESS）
        @Index(name = "idx_vip_billing_log_status", columnList = "status")
    }
)
public class VipBillingLog {

    /** 续费状态枚举 */
    public enum BillingLogStatus {
        /** 续费成功 */
        SUCCESS,
        /** 续费失败 */
        FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 本次续费订单号 */
    @Column(name = "order_no", nullable = false, length = 64)
    private String orderNo;

    /** 续费金额（分） */
    @Column(name = "amount", nullable = false)
    private Integer amount;

    /** 续费状态 SUCCESS / FAILED */
    @Column(name = "status", nullable = false, length = 16)
    private String status;

    /** 续费时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public VipBillingLog() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getOrderNo() {
        return orderNo;
    }

    public void setOrderNo(String orderNo) {
        this.orderNo = orderNo;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
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
