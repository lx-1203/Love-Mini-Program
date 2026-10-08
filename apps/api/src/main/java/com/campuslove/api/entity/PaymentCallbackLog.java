package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 支付回调日志实体，对应 payment_callback_log 表。
 *
 * <p>Task 12.1（REAUDIT-REPORT-100+ 编号 38）：BillingService 支付回调幂等性。
 * 微信支付可能因网络抖动多次推送同一回调通知，通过 notification_id 唯一索引
 * 保证同一回调只处理一次，避免重复开通 VIP、重复生成账单。</p>
 *
 * <p>2026-10-05 微信支付工程补齐（幂等键语义变更）：</p>
 * <ul>
 *   <li>幂等不再依赖本表的 (notification_id, order_no) 双键查询（原实现可被
 *       「同 orderNo 换新 notificationId」绕过），改为以 vip_order 状态机为准——
 *       订单已 SUCCESS 的重复通知直接返回成功应答。notification_id 唯一索引保留
 *       作为留痕去重与对账辅助；</li>
 *   <li>本表升级为回调<b>全量留痕</b>：原始报文（TEXT）、关键请求头、微信侧
 *       transaction_id / mchid、处理结果详情，满足支付争议与对账取证需求。</li>
 * </ul>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>notificationId：微信回调通知 ID（唯一索引）</li>
 *   <li>orderNo：业务订单号（关联 vip_order.order_no）</li>
 *   <li>amount：回调通知中的支付金额（元）</li>
 *   <li>status：处理状态 SUCCESS / FAIL</li>
 *   <li>rawBody：回调 HTTP 请求体原文（TEXT，验签取证）</li>
 *   <li>headers：关键请求头快照（Wechatpay-Timestamp/Nonce/Serial 等 JSON）</li>
 *   <li>wxTransactionId：微信支付交易单号（解密后回填）</li>
 *   <li>mchid：微信侧商户号（解密后回填，用于对账）</li>
 *   <li>detail：处理结果详情（金额对账差异/失败原因等）</li>
 *   <li>createdAt：记录创建时间</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "payment_callback_log",
    indexes = {
        // notification_id 唯一索引：留痕去重与对账辅助（幂等主判定已迁移到 vip_order 状态机）
        @Index(name = "uk_payment_callback_notification", columnList = "notification_id", unique = true),
        // 订单号索引：对账场景按订单号查询历史回调
        @Index(name = "idx_payment_callback_order", columnList = "order_no")
    }
)
public class PaymentCallbackLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 微信回调通知 ID（幂等留痕键） */
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

    /** 回调 HTTP 请求体原文（TEXT，验签/取证用） */
    @Lob
    @Column(name = "raw_body", columnDefinition = "TEXT")
    private String rawBody;

    /** 关键请求头快照（Wechatpay-Timestamp / Wechatpay-Nonce / Wechatpay-Serial，JSON） */
    @Column(name = "headers", length = 1024)
    private String headers;

    /** 微信支付交易单号（解密载荷回填） */
    @Column(name = "wx_transaction_id", length = 64)
    private String wxTransactionId;

    /** 微信侧商户号（解密载荷回填，对账用） */
    @Column(name = "mchid", length = 32)
    private String mchid;

    /** 处理结果详情（对账差异、失败原因等） */
    @Column(name = "detail", length = 512)
    private String detail;

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

    public String getRawBody() {
        return rawBody;
    }

    public void setRawBody(String rawBody) {
        this.rawBody = rawBody;
    }

    public String getHeaders() {
        return headers;
    }

    public void setHeaders(String headers) {
        this.headers = headers;
    }

    public String getWxTransactionId() {
        return wxTransactionId;
    }

    public void setWxTransactionId(String wxTransactionId) {
        this.wxTransactionId = wxTransactionId;
    }

    public String getMchid() {
        return mchid;
    }

    public void setMchid(String mchid) {
        this.mchid = mchid;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
