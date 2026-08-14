package com.campuslove.api.campus;

import java.time.LocalDateTime;

/**
 * 校园认证视图类。
 * 包含认证记录的展示信息，statusLabel 提供中文状态描述。
 */
public class CampusCertificationView {

    private Long id;
    private Long userId;
    private String schoolName;
    private String major;
    private String studentIdCardUrl;
    /** 学信网在线验证码（B1-3 学历认证，可空） */
    private String chsiCode;
    /** 学信网学历截图 URL（B1-3 学历认证，可空） */
    private String chsiScreenshotUrl;
    private String status;
    private String statusLabel;
    private Long reviewerId;
    private String reviewComment;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;

    public CampusCertificationView() {
    }

    /**
     * 全参构造（含 B1-3 学历认证字段）。
     */
    public CampusCertificationView(Long id, Long userId, String schoolName, String major,
                                   String studentIdCardUrl, String chsiCode, String chsiScreenshotUrl,
                                   String status, String statusLabel,
                                   Long reviewerId, String reviewComment,
                                   LocalDateTime submittedAt, LocalDateTime reviewedAt) {
        this.id = id;
        this.userId = userId;
        this.schoolName = schoolName;
        this.major = major;
        this.studentIdCardUrl = studentIdCardUrl;
        this.chsiCode = chsiCode;
        this.chsiScreenshotUrl = chsiScreenshotUrl;
        this.status = status;
        this.statusLabel = statusLabel;
        this.reviewerId = reviewerId;
        this.reviewComment = reviewComment;
        this.submittedAt = submittedAt;
        this.reviewedAt = reviewedAt;
    }

    /**
     * 兼容构造（无 B1-3 学历认证字段，chsi 置空）。
     * 供 mock 服务与既有测试使用；新代码请使用全参构造。
     */
    public CampusCertificationView(Long id, Long userId, String schoolName, String major,
                                   String studentIdCardUrl, String status, String statusLabel,
                                   Long reviewerId, String reviewComment,
                                   LocalDateTime submittedAt, LocalDateTime reviewedAt) {
        this(id, userId, schoolName, major, studentIdCardUrl, null, null,
                status, statusLabel, reviewerId, reviewComment, submittedAt, reviewedAt);
    }

    /**
     * 根据 status 字段计算中文状态标签。
     * PENDING -> "审核中", APPROVED -> "已认证", REJECTED -> "未通过"
     */
    public static String toStatusLabel(String status) {
        if (status == null) {
            return null;
        }
        switch (status) {
            case "PENDING":
                return "审核中";
            case "APPROVED":
                return "已认证";
            case "REJECTED":
                return "未通过";
            default:
                return status;
        }
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

    public String getStatusLabel() {
        return statusLabel;
    }

    public void setStatusLabel(String statusLabel) {
        this.statusLabel = statusLabel;
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
}