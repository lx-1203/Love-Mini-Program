package com.campuslove.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 商业化解锁记录实体，对应 wallet_unlocks 表（P0-17 商业化解锁链路）。
 *
 * <p>记录用户已付费解锁的内容（喜欢我列表 / 访客列表）：
 * 解锁一次后永久生效，再次请求直接放行不再扣费。</p>
 *
 * <p>幂等保证：{@code uk_user_target (user_id, target_type, target_id)} 唯一约束，
 * 同一用户对同一目标类型+目标 ID 仅一条解锁记录；配合钱包扣减的 order_id 唯一索引，
 * 防止重复扣费/重复解锁。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "wallet_unlocks",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_target", columnNames = {"user_id", "target_type", "target_id"})
    }
)
public class WalletUnlock {

    /** 解锁目标类型：喜欢我列表 */
    public static final String TARGET_TYPE_LIKED_ME = "LIKED_ME";

    /** 解锁目标类型：访客列表 */
    public static final String TARGET_TYPE_VISITOR = "VISITOR";

    /**
     * 解锁单价默认值（分）（R4-01804~01807）：300 分 = 3 元。
     * Real/Mock 两套实现共用同一默认值，避免改价时只改一处导致双实现漂移；
     * 实际价格以配置 app.unlock-price.liked-me / app.unlock-price.visitor 为准。
     */
    public static final int DEFAULT_UNLOCK_PRICE_CENTS = 300;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 解锁用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 解锁目标类型：LIKED_ME-喜欢我列表 / VISITOR-访客列表 */
    @Column(name = "target_type", nullable = false, length = 32)
    private String targetType;

    /** 解锁目标 ID（对方用户 ID；列表级解锁时为 0） */
    @Column(name = "target_id", nullable = false)
    private Long targetId = 0L;

    /** 解锁扣费金额（分） */
    @Column(name = "amount_cents", nullable = false)
    private Long amountCents;

    /** 解锁时间 */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public WalletUnlock() {
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

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public Long getAmountCents() {
        return amountCents;
    }

    public void setAmountCents(Long amountCents) {
        this.amountCents = amountCents;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
