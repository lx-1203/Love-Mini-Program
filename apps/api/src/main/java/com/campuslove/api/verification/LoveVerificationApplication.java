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
 * 恋爱认证申请实体，对应 love_verification_application 表。
 *
 * <p>恋爱认证（区别于校园认证 campus_certifications）：用户提交学生证照片 +
 * 姓名/学号/学校，经运营审核后获得「已认证」身份徽章。</p>
 *
 * <p>状态取值（小写，与前端 VerifyStatus 对齐）：</p>
 * <ul>
 *   <li>{@code pending} —— 审核中</li>
 *   <li>{@code approved} —— 已认证（重复提交报业务错误）</li>
 *   <li>{@code rejected} —— 未通过（允许重新提交覆盖原记录）</li>
 * </ul>
 */
@Entity
@Table(name = "love_verification_application")
public class LoveVerificationApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 申请人用户 ID（每用户一条） */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 学生姓名 */
    @Column(name = "student_name", nullable = false, length = 64)
    private String studentName;

    /** 学号 */
    @Column(name = "student_id", nullable = false, length = 64)
    private String studentId;

    /** 学校名称 */
    @Column(name = "school_name", nullable = false, length = 128)
    private String schoolName;

    /** 学生证照片 URL */
    @Column(name = "student_id_card_url", length = 512)
    private String studentIdCardUrl;

    /** 认证状态：pending / approved / rejected */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "pending";

    /** 驳回原因（审核不通过时填写） */
    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

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

    public LoveVerificationApplication() {
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

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getSchoolName() {
        return schoolName;
    }

    public void setSchoolName(String schoolName) {
        this.schoolName = schoolName;
    }

    public String getStudentIdCardUrl() {
        return studentIdCardUrl;
    }

    public void setStudentIdCardUrl(String studentIdCardUrl) {
        this.studentIdCardUrl = studentIdCardUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRejectReason() {
        return rejectReason;
    }

    public void setRejectReason(String rejectReason) {
        this.rejectReason = rejectReason;
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
