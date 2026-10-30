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
 * VIP 优惠码使用记录实体，对应 promo_code_usages 表。
 * <p>记录每个用户使用优惠码的历史，通过 (promoCodeId, userId) 唯一索引
 * 保证「一个用户对一个码只有一行」。</p>
 *
 * <p>多用途码（{@code promo_codes.max_uses_per_user > 1}）不再新增行：
 * 该唯一索引使本表结构上每个 (码, 用户) 只能存在一行，第二次及以后的兑换
 * 在这一聚合行上累加 {@link #useCount} 与 {@link #discountAmount}。
 * 历史上此处曾按「每次兑换插一行」实现，第二次兑换即撞
 * {@code uk_promo_code_usages} 抛 DataIntegrityViolationException（HTTP 500）。</p>
 */
@Entity
@Table(name = "promo_code_usages")
public class PromoCodeUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 优惠码 ID */
    @Column(name = "promo_code_id", nullable = false)
    private Long promoCodeId;

    /** 优惠码字符串（冗余字段，便于查询展示） */
    @Column(name = "code", nullable = false, length = 64)
    private String code;

    /** 使用者用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * 折扣金额（分）。
     * <p>本表是「每 (码, 用户) 一行」的聚合行，故此处为该用户对该码<b>累计</b>享受的折扣总额，
     * 而非单次折扣；单笔均值需按 {@code discount_amount / use_count} 还原（报表口径）。</p>
     */
    @Column(name = "discount_amount", nullable = false)
    private Integer discountAmount;

    /**
     * 累计使用次数。
     * <p>表级唯一索引 {@code uk_promo_code_usages (promo_code_id, user_id)}
     * （Flyway V2026.07.25.0003 建表 DDL）使本表结构上「每个 (码, 用户) 只有一行」，
     * 因此 {@code promo_codes.max_uses_per_user > 1} 的多用途码不再插入新行，
     * 多次使用的次数累加在这一行上（列定义见 Flyway V2026.10.30.0001，
     * 存量行按 DEFAULT 1 回填——它们结构上不可能用过多次）。</p>
     */
    @Column(name = "use_count", nullable = false)
    private Integer useCount = 1;

    /** 首次使用时间（多用途码的后续使用不回写此列，保持「首次使用」语义） */
    @Column(name = "used_at", nullable = false, updatable = false)
    private LocalDateTime usedAt;
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


    public PromoCodeUsage() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPromoCodeId() {
        return promoCodeId;
    }

    public void setPromoCodeId(Long promoCodeId) {
        this.promoCodeId = promoCodeId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(Integer discountAmount) {
        this.discountAmount = discountAmount;
    }

    public Integer getUseCount() {
        return useCount;
    }

    public void setUseCount(Integer useCount) {
        this.useCount = useCount;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
