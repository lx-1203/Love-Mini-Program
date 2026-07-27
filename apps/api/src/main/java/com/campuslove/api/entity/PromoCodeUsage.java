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
 * 防止同一用户重复使用同一优惠码（除非 maxUses 允许多次使用，但同一用户仍只能用一次）。</p>
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

    /** 折扣金额（分） */
    @Column(name = "discount_amount", nullable = false)
    private Integer discountAmount;

    /** 使用时间 */
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
