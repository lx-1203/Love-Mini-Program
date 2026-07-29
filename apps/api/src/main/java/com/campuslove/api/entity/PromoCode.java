package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import jakarta.persistence.EntityListeners;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

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
@EntityListeners(AuditingEntityListener.class)
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

    /**
     * 单用户最大使用次数。
     *
     * <p>Task 12.4（REAUDIT-REPORT-100+ 编号 41）：限制同一用户对同一优惠码的使用次数。
     * 默认 1（即同一用户只能用一次），管理员可在创建/编辑优惠码时调整。
     * 兑换时通过 {@code SELECT COUNT(*) FROM promo_code_usages WHERE promo_code_id = ? AND user_id = ?}
     * 校验当前用户已使用次数 &lt; maxUsesPerUser 才允许继续。</p>
     */
    @Column(name = "max_uses_per_user", nullable = false)
    private Integer maxUsesPerUser = 1;

    /** 已使用次数 */
    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    /**
     * 剩余可用次数（原子扣减用）。
     *
     * <p>Task 12.4：并发安全基础设施。创建时初始化为 max_uses（max_uses=0 时设为 2147483647 表示无限），
     * 每次兑换通过 {@code UPDATE ... SET remaining_uses = remaining_uses - 1
     * WHERE code = :code AND remaining_uses > 0} 原子扣减，
     * 影响行数 0 则兑换失败（优惠码已用完）。</p>
     *
     * <p>与 used_count 并存：remaining_uses 用于原子扣减保证不超发，
     * used_count 用于统计展示（每次成功兑换后 +1）。</p>
     */
    @Column(name = "remaining_uses", nullable = false)
    private Integer remainingUses = 0;

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

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 记录最近更新时间（优惠码配置变更时刷新） */

    @LastModifiedDate

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
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

    public Integer getMaxUsesPerUser() {
        return maxUsesPerUser;
    }

    public void setMaxUsesPerUser(Integer maxUsesPerUser) {
        this.maxUsesPerUser = maxUsesPerUser;
    }

    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
    }

    public Integer getRemainingUses() {
        return remainingUses;
    }

    public void setRemainingUses(Integer remainingUses) {
        this.remainingUses = remainingUses;
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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
