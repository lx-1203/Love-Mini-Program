package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * VIP 优惠码实体，对应 promo_codes 表。
 * <p>记录优惠码的基本信息、有效期、使用次数限制与已使用次数等。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>code：优惠码字符串（唯一索引）</li>
 *   <li>discountType：折扣类型 AMOUNT(满减金额) / PERCENT(百分比折扣)</li>
 *   <li>discountValue：折扣值（AMOUNT 时为分，PERCENT 时为百分比 0-100）</li>
 *   <li>maxUses：最大使用次数（0 表示不限）</li>
 *   <li>usedCount：已使用次数</li>
 *   <li>validFrom / validTo：有效期范围</li>
 *   <li>status：状态 ACTIVE(可用) / DISABLED(已禁用)</li>
 *   <li>createdBy：创建者用户 ID（管理员）</li>
 * </ul>
 */
@Entity
@Table(name = "promo_codes")
public class PromoCode {

    /** 折扣类型枚举 */
    public enum DiscountType {
        /** 满减金额（单位：分） */
        AMOUNT,
        /** 百分比折扣（0-100） */
        PERCENT
    }

    /** 状态枚举 */
    public enum PromoStatus {
        /** 可用 */
        ACTIVE,
        /** 已禁用 */
        DISABLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 优惠码（唯一） */
    @Column(name = "code", nullable = false, unique = true, length = 64)
    private String code;

    /** 折扣类型 AMOUNT/PERCENT */
    @Column(name = "discount_type", nullable = false, length = 16)
    private String discountType = "AMOUNT";

    /** 折扣值 */
    @Column(name = "discount_value", nullable = false)
    private Integer discountValue;

    /** 最大使用次数（0 表示不限） */
    @Column(name = "max_uses", nullable = false)
    private Integer maxUses = 0;

    /** 已使用次数 */
    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    /** 有效期开始时间 */
    @Column(name = "valid_from", nullable = false)
    private LocalDateTime validFrom;

    /** 有效期结束时间 */
    @Column(name = "valid_to", nullable = false)
    private LocalDateTime validTo;

    /** 状态 */
    @Column(name = "status", nullable = false, length = 16)
    private String status = "ACTIVE";

    /** 创建者用户 ID（管理员） */
    @Column(name = "created_by")
    private Long createdBy;

    /** 备注 */
    @Column(name = "remark", length = 200)
    private String remark;

    /** 记录创建时间（优惠码入库时间） */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（优惠码配置变更时刷新） */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PromoCode() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDiscountType() {
        return discountType;
    }

    public void setDiscountType(String discountType) {
        this.discountType = discountType;
    }

    public Integer getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(Integer discountValue) {
        this.discountValue = discountValue;
    }

    public Integer getMaxUses() {
        return maxUses;
    }

    public void setMaxUses(Integer maxUses) {
        this.maxUses = maxUses;
    }

    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
    }

    public LocalDateTime getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(LocalDateTime validFrom) {
        this.validFrom = validFrom;
    }

    public LocalDateTime getValidTo() {
        return validTo;
    }

    public void setValidTo(LocalDateTime validTo) {
        this.validTo = validTo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
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
