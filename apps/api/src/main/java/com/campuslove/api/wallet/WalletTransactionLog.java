package com.campuslove.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 钱包交易流水实体，对应 wallet_transaction_log 表。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：资金类操作的真实扣减/充值流水记录。</p>
 *
 * <p>每一次钱包扣减（DEBIT）或充值（CREDIT）都会写入一条流水，用于：</p>
 * <ul>
 *   <li>对账：核对钱包余额变动与业务订单（VIP 续费、红包发送/领取）是否一致</li>
 *   <li>审计：追溯单用户历史资金变动</li>
 *   <li>幂等：通过 order_id 唯一索引保证同一业务请求不会被重复处理</li>
 *   <li>故障排查：通过 related_type + related_id 快速定位业务上下文</li>
 * </ul>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>userId：用户 ID</li>
 *   <li>type：交易类型 DEBIT(扣减) / CREDIT(充值)</li>
 *   <li>amount：交易金额（分，Long 避免溢出）</li>
 *   <li>balanceAfter：交易后余额（分，便于审计追溯）</li>
 *   <li>relatedType：关联业务类型 VIP_RENEW / RED_PACKET_SEND / RED_PACKET_CLAIM / RED_PACKET_REFUND</li>
 *   <li>relatedId：关联业务实体 ID（如 renewalId / redPacketId）</li>
 *   <li>orderId：业务订单号（幂等键，唯一索引）</li>
 *   <li>remark：备注</li>
 *   <li>createdAt / updatedAt：审计时间</li>
 * </ul>
 *
 * <p>幂等保证：order_id 唯一索引 + 服务层先查后写双重防护。
 * 同一 orderId 重复调用 deduct/recharge 会直接返回已处理结果，
 * 不会重复扣减/充值余额。</p>
 */
@Entity
@Table(
    name = "wallet_transaction_log",
    uniqueConstraints = {
        // order_id 唯一约束：保证同一业务订单号不会被重复处理
        @UniqueConstraint(name = "uk_wallet_transaction_log_order", columnNames = {"order_id"})
    },
    indexes = {
        // 用户 ID + 创建时间索引：按用户查询流水分页（高频查询）
        @Index(name = "idx_wallet_log_user_created", columnList = "user_id, created_at"),
        // 关联业务类型索引：按业务类型筛选（对账场景）
        @Index(name = "idx_wallet_log_related", columnList = "related_type"),
        // 关联业务 ID 索引：按业务实体反查流水
        @Index(name = "idx_wallet_log_related_id", columnList = "related_id")
    }
)
@EntityListeners(AuditingEntityListener.class)
public class WalletTransactionLog {

    /** 交易类型枚举 */
    public enum TransactionType {
        /** 扣减（出账） */
        DEBIT,
        /** 充值（入账） */
        CREDIT
    }

    /** 关联业务类型：VIP 自动续费扣减 */
    public static final String RELATED_TYPE_VIP_RENEW = "VIP_RENEW";
    /** 关联业务类型：红包发送扣减 */
    public static final String RELATED_TYPE_RED_PACKET_SEND = "RED_PACKET_SEND";
    /** 关联业务类型：红包领取充值 */
    public static final String RELATED_TYPE_RED_PACKET_CLAIM = "RED_PACKET_CLAIM";
    /** 关联业务类型：红包过期退款 */
    public static final String RELATED_TYPE_RED_PACKET_REFUND = "RED_PACKET_REFUND";
    /** 关联业务类型：钱包充值（演示/模拟充值入口，走查补齐） */
    public static final String RELATED_TYPE_WALLET_RECHARGE = "WALLET_RECHARGE";
    /** 关联业务类型：签到奖励入账（P0-23 签到钱包联动） */
    public static final String RELATED_TYPE_CHECKIN = "CHECKIN";
    /** 关联业务类型：商业化解锁-喜欢我列表（P0-17，targetId=对方用户 ID） */
    public static final String RELATED_TYPE_UNLOCK_LIKED_ME = "UNLOCK_LIKED_ME";
    /** 关联业务类型：商业化解锁-访客列表（P0-17，targetId=对方用户 ID） */
    public static final String RELATED_TYPE_UNLOCK_VISITOR = "UNLOCK_VISITOR";
    /** 关联业务类型：AI 情话解锁（预留，P0-17 白名单成员） */
    public static final String RELATED_TYPE_SWEET_TALK = "SWEET_TALK";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 交易类型 DEBIT / CREDIT */
    @Column(name = "type", nullable = false, length = 16)
    private String type;

    /** 交易金额（分） */
    @Column(name = "amount", nullable = false)
    private Long amount;

    /** 交易后余额（分，便于审计追溯） */
    @Column(name = "balance_after")
    private Long balanceAfter;

    /** 关联业务类型 VIP_RENEW / RED_PACKET_SEND / RED_PACKET_CLAIM / RED_PACKET_REFUND */
    @Column(name = "related_type", nullable = false, length = 32)
    private String relatedType;

    /** 关联业务实体 ID（如 renewalId / redPacketId，字符串便于跨业务通用） */
    @Column(name = "related_id", length = 64)
    private String relatedId;

    /** 业务订单号（幂等键，唯一索引） */
    @Column(name = "order_id", nullable = false, length = 128)
    private String orderId;

    /** 备注 */
    @Column(name = "remark", length = 200)
    private String remark;

    /** 创建时间 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 更新时间 */
    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public WalletTransactionLog() {
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public Long getBalanceAfter() {
        return balanceAfter;
    }

    public void setBalanceAfter(Long balanceAfter) {
        this.balanceAfter = balanceAfter;
    }

    public String getRelatedType() {
        return relatedType;
    }

    public void setRelatedType(String relatedType) {
        this.relatedType = relatedType;
    }

    public String getRelatedId() {
        return relatedId;
    }

    public void setRelatedId(String relatedId) {
        this.relatedId = relatedId;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
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

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
