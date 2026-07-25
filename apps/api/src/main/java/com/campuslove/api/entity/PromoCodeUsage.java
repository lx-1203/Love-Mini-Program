package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
}
