package com.campuslove.api.verification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;

/**
 * 实名认证申请实体，对应 real_name_certifications 表。
 *
 * <p>实名认证（区别于恋爱认证 love_verification_application）：用户提交姓名 +
 * 身份证号（AES 加密存储）+ 身份证正反面照片，经运营审核通过后置位
 * {@code user_basic_profile.id_card_verified}，作为校园认证（学历认证）的前置门槛。</p>
 *
 * <p>状态取值（大写，与校园认证 campus_certifications 对齐）：</p>
 * <ul>
 *   <li>{@code PENDING} —— 审核中</li>
 *   <li>{@code APPROVED} —— 已认证（重复提交报业务错误）</li>
 *   <li>{@code REJECTED} —— 未通过（允许重新提交覆盖原记录）</li>
 * </ul>
 */
@Entity
@Table(name = "real_name_certifications")
public class RealNameCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 申请人用户 ID（每用户一条） */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 真实姓名 */
    @Column(name = "user_name", nullable = false, length = 64)
    private String userName;

    /** 身份证号（AES-GCM 加密存储，禁止明文落库） */
    @Column(name = "id_card_no", nullable = false, length = 512)
    private String idCardNo;

    /** 身份证人像面（正面）照片 URL */
    @Column(name = "id_card_front_url", length = 512)
    private String idCardFrontUrl;

    /** 身份证国徽面（背面）照片 URL */
    @Column(name = "id_card_back_url", length = 512)
    private String idCardBackUrl;

    /** 认证状态：PENDING / APPROVED / REJECTED */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    /** 审核人 ID */
    @Column(name = "reviewer_id")
    private Long reviewerId;

    /** 审核意见（驳回原因等） */
    @Column(name = "review_comment", length = 500)
    private String reviewComment;

    /** 提交时间 */
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    /** 审核时间 */
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     * <p>由 JPA 自动维护，每次实体更新时 version 自增。
     * 并发更新冲突时抛出 {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 409 Conflict。</p>
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    public RealNameCertification() {
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

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getIdCardNo() {
        return idCardNo;
    }

    public void setIdCardNo(String idCardNo) {
        this.idCardNo = idCardNo;
    }

    public String getIdCardFrontUrl() {
        return idCardFrontUrl;
    }

    public void setIdCardFrontUrl(String idCardFrontUrl) {
        this.idCardFrontUrl = idCardFrontUrl;
    }

    public String getIdCardBackUrl() {
        return idCardBackUrl;
    }

    public void setIdCardBackUrl(String idCardBackUrl) {
        this.idCardBackUrl = idCardBackUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getReviewerId() {
        return reviewerId;
    }

    public void setReviewerId(Long reviewerId) {
        this.reviewerId = reviewerId;
    }

    public String getReviewComment() {
        return reviewComment;
    }

    public void setReviewComment(String reviewComment) {
        this.reviewComment = reviewComment;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
