package com.campuslove.api.wallet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;

/**
 * 用户钱包实体，对应 user_wallet 表。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：用户资金账户主表。</p>
 *
 * <p>每个用户对应一条钱包记录（user_id 唯一索引），存储：</p>
 * <ul>
 *   <li>balanceCents：可用余额（分），VIP 续费、红包发送时扣减，红包领取、退款时充值</li>
 *   <li>frozenCents：冻结金额（分），预留给未来"红包发送时冻结、领取时解冻给领取者"的优化方案</li>
 *   <li>version：乐观锁版本号，配合悲观锁双重防护</li>
 * </ul>
 *
 * <p>并发安全策略：</p>
 * <ul>
 *   <li>写操作通过 {@link com.campuslove.api.wallet.UserWalletRepository#findByUserIdForUpdate}
 *       悲观锁查询，确保同一用户同时只有一个事务能修改余额</li>
 *   <li>乐观锁 @Version 作为兜底，防止悲观锁失效（如不同事务隔离级别）时多事务同时更新</li>
 *   <li>order_id 唯一索引在 wallet_transaction_log 表上保证业务幂等</li>
 * </ul>
 *
 * <p>金额单位：所有金额以"分"为 Long 整数存储，避免浮点精度问题。
 * 余额上限：Long.MAX_VALUE / 100 远超任何现实场景所需，无溢出风险。</p>
 */
@Entity
@Table(
    name = "user_wallet",
    uniqueConstraints = {
        // user_id 唯一约束：一个用户对应一条钱包记录
        @UniqueConstraint(name = "uk_user_wallet_user", columnNames = {"user_id"})
    },
    indexes = {
        // user_id 索引：按用户查询钱包（唯一约束已自动创建索引，此处显式声明便于查询规划）
        @Index(name = "idx_user_wallet_user", columnList = "user_id")
    }
)
public class UserWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID（唯一索引） */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 可用余额（分），默认 0 */
    @Column(name = "balance_cents", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long balanceCents = 0L;

    /** 冻结金额（分），默认 0；预留给未来红包发送冻结方案 */
    @Column(name = "frozen_cents", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long frozenCents = 0L;

    /**
     * 乐观锁版本号。
     *
     * <p>由 JPA 自动维护，每次实体更新时 version 自增。
     * 并发更新冲突时抛出 {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 409 Conflict。</p>
     *
     * <p>初始值 0L。与悲观锁配合，作为兜底防护。</p>
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 更新时间 */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public UserWallet() {
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

    public Long getBalanceCents() {
        return balanceCents;
    }

    public void setBalanceCents(Long balanceCents) {
        this.balanceCents = balanceCents;
    }

    public Long getFrozenCents() {
        return frozenCents;
    }

    public void setFrozenCents(Long frozenCents) {
        this.frozenCents = frozenCents;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
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
