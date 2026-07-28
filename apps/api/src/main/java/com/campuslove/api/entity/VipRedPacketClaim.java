package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;

/**
 * VIP 红包领取记录实体，对应 vip_red_packet_claims 表。
 * <p>记录每个用户对每个红包的领取明细，包括领取金额与时间。
 * 通过 (redPacketId, claimerId) 唯一索引防止重复领取。</p>
 */
@Entity
@Table(name = "vip_red_packet_claims")
public class VipRedPacketClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 红包 ID */
    @Column(name = "red_packet_id", nullable = false)
    private Long redPacketId;

    /** 领取人用户 ID */
    @Column(name = "claimer_id", nullable = false)
    private Long claimerId;

    /** 领取金额（单位：分） */
    @Column(name = "amount", nullable = false)
    private Integer amount;

    /** 领取时间 */
    @Column(name = "claimed_at", nullable = false, updatable = false)
    private LocalDateTime claimedAt;
    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     *
     * <p>由 JPA 自动维护，每次实体更新时 version 自增。
     * 并发更新冲突时抛出 {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 409 Conflict。</p>
     *
     * <p>初始值 0L，对应数据库列 {@code version BIGINT DEFAULT 0}（Flyway V2026.07.26.0003）。</p>
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;


    public VipRedPacketClaim() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRedPacketId() {
        return redPacketId;
    }

    public void setRedPacketId(Long redPacketId) {
        this.redPacketId = redPacketId;
    }

    public Long getClaimerId() {
        return claimerId;
    }

    public void setClaimerId(Long claimerId) {
        this.claimerId = claimerId;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public LocalDateTime getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(LocalDateTime claimedAt) {
        this.claimedAt = claimedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
