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
 * 校园认证实体，对应 campus_certifications 表。
 * 记录用户的校园身份认证信息，包括学校、专业、学生证照片等。
 * 认证状态包括：PENDING（审核中）、APPROVED（已认证）、REJECTED（未通过）。
 */
@Entity
@Table(name = "campus_certifications")
public class CampusCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 学校名称 */
    @Column(name = "school_name", nullable = false, length = 100)
    private String schoolName;

    /** 专业 */
    @Column(name = "major", length = 100)
    private String major;

    /** 学生证照片 URL */
    @Column(name = "student_id_card_url", length = 512)
    private String studentIdCardUrl;

    /** 学信网在线验证码（B1-3 学历认证，可空——未提供时仅凭学生证审核） */
    @Column(name = "chsi_code", length = 64)
    private String chsiCode;

    /** 学信网学历截图 URL（B1-3 学历认证，可空） */
    @Column(name = "chsi_screenshot_url", length = 512)
    private String chsiScreenshotUrl;

    /** 认证状态：PENDING / APPROVED / REJECTED */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    /** 审核人 ID */
    @Column(name = "reviewer_id")
    private Long reviewerId;

    /** 审核意见 */
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


    public CampusCertification() {
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

    public String getSchoolName() {
        return schoolName;
    }

    public void setSchoolName(String schoolName) {
        this.schoolName = schoolName;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public String getStudentIdCardUrl() {
        return studentIdCardUrl;
    }

    public void setStudentIdCardUrl(String studentIdCardUrl) {
        this.studentIdCardUrl = studentIdCardUrl;
    }

    public String getChsiCode() {
        return chsiCode;
    }

    public void setChsiCode(String chsiCode) {
        this.chsiCode = chsiCode;
    }

    public String getChsiScreenshotUrl() {
        return chsiScreenshotUrl;
    }

    public void setChsiScreenshotUrl(String chsiScreenshotUrl) {
        this.chsiScreenshotUrl = chsiScreenshotUrl;
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