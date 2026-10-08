package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * VIP 微信支付订单实体，对应 vip_order 表（2026-10-05 微信支付工程补齐）。
 *
 * <p>承载「下单 → 待支付 → 支付成功/关单/退款」的完整订单生命周期，
 * 与 {@link VipBill}（支付成功后的账单记录）分离：账单只在成功/退款事实
 * 发生时写入，订单始终存在。</p>
 *
 * <p>状态机（迁移唯一入口为 {@code VipOrderService#applyTransition}，非法迁移拒绝）：</p>
 * <pre>
 * PENDING → PAYING / CLOSED / FAILED
 * PAYING  → SUCCESS / CLOSED / FAILED
 * SUCCESS → REFUNDING
 * REFUNDING → REFUNDED
 * </pre>
 *
 * <p>金额以「分」存储且为服务端定价快照（不信客户端传入金额）。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "vip_order",
    indexes = {
        // 订单号全局唯一（回调幂等键）
        @Index(name = "uk_vip_order_no", columnList = "order_no", unique = true),
        // 按用户查询订单列表
        @Index(name = "idx_vip_order_user", columnList = "user_id"),
        // 状态 + 过期时间复合索引：定时关单扫描（PENDING/PAYING 且 expire_at < now）
        @Index(name = "idx_vip_order_status_expire", columnList = "status, expire_at")
    }
)
public class VipOrder {

    /** 订单状态：已创建（未获取 prepay_id） */
    public static final String STATUS_PENDING = "PENDING";
    /** 订单状态：已获取 prepay_id，等待用户支付 */
    public static final String STATUS_PAYING = "PAYING";
    /** 订单状态：支付成功 */
    public static final String STATUS_SUCCESS = "SUCCESS";
    /** 订单状态：已关闭（超时/主动关单，终态） */
    public static final String STATUS_CLOSED = "CLOSED";
    /** 订单状态：退款中 */
    public static final String STATUS_REFUNDING = "REFUNDING";
    /** 订单状态：已退款（终态） */
    public static final String STATUS_REFUNDED = "REFUNDED";
    /** 订单状态：失败（终态） */
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 商户订单号（全局唯一，微信 out_trade_no，回调幂等键） */
    @Column(name = "order_no", nullable = false, unique = true, length = 32)
    private String orderNo;

    /** 下单用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 套餐 ID（monthly/quarterly/yearly） */
    @Column(name = "plan_id", nullable = false, length = 32)
    private String planId;

    /** 套餐名称快照 */
    @Column(name = "plan_name", nullable = false, length = 64)
    private String planName;

    /** 套餐时长（天）快照 */
    @Column(name = "plan_days", nullable = false)
    private Integer planDays;

    /** 订单金额（分，服务端定价快照） */
    @Column(name = "amount_cents", nullable = false)
    private Integer amountCents;

    /** 状态 PENDING/PAYING/SUCCESS/CLOSED/REFUNDING/REFUNDED/FAILED */
    @Column(name = "status", nullable = false, length = 16)
    private String status = STATUS_PENDING;

    /** 支付用户 openid 快照（JSAPI payer） */
    @Column(name = "openid", length = 128)
    private String openid;

    /** 微信统一下单 prepay_id */
    @Column(name = "prepay_id", length = 64)
    private String prepayId;

    /** 微信支付交易单号（回调回填） */
    @Column(name = "wx_transaction_id", length = 64)
    private String wxTransactionId;

    /** 微信退款单号 */
    @Column(name = "refund_id", length = 64)
    private String refundId;

    /** 订单过期时间（超时关单依据） */
    @Column(name = "expire_at")
    private LocalDateTime expireAt;

    /** 支付成功时间 */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /** 关单时间 */
    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    /** 退款完成时间 */
    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    /** 支付回调处理时间 */
    @Column(name = "notify_processed_at")
    private LocalDateTime notifyProcessedAt;

    /** 创建时间 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 乐观锁版本号：并发重复回调时后提交方抛
     * {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 上层捕获后按「已被并发请求处理」幂等返回。
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    public VipOrder() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNo() {
        return orderNo;
    }

    public void setOrderNo(String orderNo) {
        this.orderNo = orderNo;
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

    public Integer getPlanDays() {
        return planDays;
    }

    public void setPlanDays(Integer planDays) {
        this.planDays = planDays;
    }

    public Integer getAmountCents() {
        return amountCents;
    }

    public void setAmountCents(Integer amountCents) {
        this.amountCents = amountCents;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getOpenid() {
        return openid;
    }

    public void setOpenid(String openid) {
        this.openid = openid;
    }

    public String getPrepayId() {
        return prepayId;
    }

    public void setPrepayId(String prepayId) {
        this.prepayId = prepayId;
    }

    public String getWxTransactionId() {
        return wxTransactionId;
    }

    public void setWxTransactionId(String wxTransactionId) {
        this.wxTransactionId = wxTransactionId;
    }

    public String getRefundId() {
        return refundId;
    }

    public void setRefundId(String refundId) {
        this.refundId = refundId;
    }

    public LocalDateTime getExpireAt() {
        return expireAt;
    }

    public void setExpireAt(LocalDateTime expireAt) {
        this.expireAt = expireAt;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(LocalDateTime closedAt) {
        this.closedAt = closedAt;
    }

    public LocalDateTime getRefundedAt() {
        return refundedAt;
    }

    public void setRefundedAt(LocalDateTime refundedAt) {
        this.refundedAt = refundedAt;
    }

    public LocalDateTime getNotifyProcessedAt() {
        return notifyProcessedAt;
    }

    public void setNotifyProcessedAt(LocalDateTime notifyProcessedAt) {
        this.notifyProcessedAt = notifyProcessedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
