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
 * VIP 账单实体，对应 vip_bills 表。
 * <p>记录用户的 VIP 订阅、续费、退款等账单明细。
 * 每次支付成功后生成一条账单记录。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>userId：用户 ID</li>
 *   <li>planId：套餐 ID（monthly/quarterly/yearly）</li>
 *   <li>planName：套餐名称（冗余字段，便于历史展示）</li>
 *   <li>amount：支付金额（分）</li>
 *   <li>originalAmount：原价（分，用于显示折扣）</li>
 *   <li>type：账单类型 SUBSCRIBE(订阅) / RENEW(续费) / REFUND(退款)</li>
 *   <li>status：状态 SUCCESS(成功) / FAILED(失败) / REFUNDED(已退款)</li>
 *   <li>paymentMethod：支付方式 WECHAT(微信) / ALIPAY(支付宝)</li>
 *   <li>transactionId：第三方交易号</li>
 *   <li>periodStart / periodEnd：VIP 有效期起止时间</li>
 * </ul>
 *
 * <p>索引说明（与数据库 Flyway 脚本保持一致）：</p>
 * <ul>
 *   <li>idx_vip_bills_user：user_id 索引，按用户查询账单列表</li>
 *   <li>idx_vip_bills_status：status 索引，按状态筛选账单</li>
 *   <li>idx_vip_bills_transaction：transaction_id 索引，按第三方交易号查询（对账场景，任务规格 order_no 的对应）</li>
 *   <li>idx_vip_bills_created_at：created_at 索引，按创建时间排序、分页</li>
 * </ul>
 *
 * <p>注：任务规格中提到 order_no 字段，实际表中为 transaction_id（第三方交易号），
 * 故索引按实际字段命名。</p>
 */
@Entity
@Table(
    name = "vip_bills",
    indexes = {
        // 用户 ID 索引：按用户查询账单列表
        @Index(name = "idx_vip_bills_user", columnList = "user_id"),
        // 状态索引：按状态筛选账单（SUCCESS/FAILED/REFUNDED）
        @Index(name = "idx_vip_bills_status", columnList = "status"),
        // 第三方交易号索引：按交易号查询（对账场景，任务规格 order_no 的对应）
        @Index(name = "idx_vip_bills_transaction", columnList = "transaction_id"),
        // 创建时间索引：按创建时间排序、分页
        @Index(name = "idx_vip_bills_created_at", columnList = "created_at")
    }
)
public class VipBill {

    /** 账单类型枚举 */
    public enum BillType {
        /** 订阅（首次开通） */
        SUBSCRIBE,
        /** 续费 */
        RENEW,
        /** 退款 */
        REFUND
    }

    /** 账单状态枚举 */
    public enum BillStatus {
        /** 成功 */
        SUCCESS,
        /** 失败 */
        FAILED,
        /** 已退款 */
        REFUNDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 套餐 ID */
    @Column(name = "plan_id", nullable = false, length = 32)
    private String planId;

    /** 套餐名称（冗余） */
    @Column(name = "plan_name", nullable = false, length = 64)
    private String planName;

    /** 支付金额（分） */
    @Column(name = "amount", nullable = false)
    private Integer amount;

    /** 原价（分） */
    @Column(name = "original_amount")
    private Integer originalAmount;

    /** 账单类型 SUBSCRIBE/RENEW/REFUND */
    @Column(name = "type", nullable = false, length = 16)
    private String type = "SUBSCRIBE";

    /** 状态 SUCCESS/FAILED/REFUNDED */
    @Column(name = "status", nullable = false, length = 16)
    private String status = "SUCCESS";

    /** 支付方式 WECHAT/ALIPAY */
    @Column(name = "payment_method", nullable = false, length = 16)
    private String paymentMethod = "WECHAT";

    /** 第三方交易号 */
    @Column(name = "transaction_id", length = 128)
    private String transactionId;

    /** VIP 有效期开始时间 */
    @Column(name = "period_start")
    private LocalDateTime periodStart;

    /** VIP 有效期结束时间 */
    @Column(name = "period_end")
    private LocalDateTime periodEnd;

    /** 备注 */
    @Column(name = "remark", length = 200)
    private String remark;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public VipBill() {
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

    public String getPlanId() {
        return planId;
    }

    public void setPlanId(String planId) {
        this.planId = planId;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public Integer getOriginalAmount() {
        return originalAmount;
    }

    public void setOriginalAmount(Integer originalAmount) {
        this.originalAmount = originalAmount;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public LocalDateTime getPeriodStart() {
        return periodStart;
    }

    public void setPeriodStart(LocalDateTime periodStart) {
        this.periodStart = periodStart;
    }

    public LocalDateTime getPeriodEnd() {
        return periodEnd;
    }

    public void setPeriodEnd(LocalDateTime periodEnd) {
        this.periodEnd = periodEnd;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
