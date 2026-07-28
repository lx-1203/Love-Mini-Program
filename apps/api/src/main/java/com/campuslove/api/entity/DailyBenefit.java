package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 每日签到权益实体，对应 daily_benefits 表。
 * 记录用户每日签到后解锁的权益信息，包括：
 * <ul>
 *   <li>额外推荐配额（每次签到 +5）</li>
 *   <li>热门话题解锁状态</li>
 *   <li>新入圈用户解锁状态</li>
 * </ul>
 * 每天每个用户仅有一条记录（user_id + benefit_date 唯一约束）。
 */
@Entity
@Table(name = "daily_benefits")
public class DailyBenefit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 权益日期（签到日期） */
    @Column(name = "benefit_date", nullable = false)
    private LocalDate benefitDate;

    /** 额外推荐配额，默认 5（每次签到 +5） */
    @Column(name = "extra_recommend_quota", nullable = false)
    private Integer extraRecommendQuota = 5;

    /** 热门话题是否已解锁 */
    @Column(name = "hot_topics_unlocked", nullable = false)
    private Boolean hotTopicsUnlocked = true;

    /** 新入圈用户是否已解锁 */
    @Column(name = "new_users_unlocked", nullable = false)
    private Boolean newUsersUnlocked = true;

    /** 记录创建时间（福利配置入库时间） */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
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


    public DailyBenefit() {
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

    public LocalDate getBenefitDate() {
        return benefitDate;
    }

    public void setBenefitDate(LocalDate benefitDate) {
        this.benefitDate = benefitDate;
    }

    public Integer getExtraRecommendQuota() {
        return extraRecommendQuota;
    }

    public void setExtraRecommendQuota(Integer extraRecommendQuota) {
        this.extraRecommendQuota = extraRecommendQuota;
    }

    public Boolean getHotTopicsUnlocked() {
        return hotTopicsUnlocked;
    }

    public void setHotTopicsUnlocked(Boolean hotTopicsUnlocked) {
        this.hotTopicsUnlocked = hotTopicsUnlocked;
    }

    public Boolean getNewUsersUnlocked() {
        return newUsersUnlocked;
    }

    public void setNewUsersUnlocked(Boolean newUsersUnlocked) {
        this.newUsersUnlocked = newUsersUnlocked;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
