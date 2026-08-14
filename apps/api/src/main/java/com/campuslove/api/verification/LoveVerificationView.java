package com.campuslove.api.verification;

import java.time.LocalDateTime;

/**
 * 恋爱认证视图（GET/POST /api/v1/verification 响应载荷）。
 *
 * <p>未提交过申请时返回 {@code id=null、status=null} 的空视图（前端映射为 unverified）。</p>
 *
 * @param id               申请记录 ID（未提交为 null）
 * @param status           认证状态：pending / approved / rejected（未提交为 null）
 * @param studentName      学生姓名
 * @param studentId        学号
 * @param schoolName       学校名称
 * @param studentIdCardUrl 学生证照片 URL
 * @param rejectReason     驳回原因（仅 rejected 时有值）
 * @param submittedAt      提交时间
 * @param reviewedAt       审核时间（未审核为 null）
 */
public record LoveVerificationView(
        Long id,
        String status,
        String studentName,
        String studentId,
        String schoolName,
        String studentIdCardUrl,
        String rejectReason,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt
) {

    /**
     * 从实体构造视图。
     *
     * @param entity 申请实体
     * @return 视图
     */
    public static LoveVerificationView from(LoveVerificationApplication entity) {
        return new LoveVerificationView(
                entity.getId(),
                entity.getStatus(),
                entity.getStudentName(),
                entity.getStudentId(),
                entity.getSchoolName(),
                entity.getStudentIdCardUrl(),
                entity.getRejectReason(),
                entity.getSubmittedAt(),
                entity.getReviewedAt()
        );
    }

    /**
     * 构造未提交申请的空视图（前端映射为 unverified）。
     *
     * @return 空视图（status 为 null）
     */
    public static LoveVerificationView empty() {
        return new LoveVerificationView(null, null, null, null, null, null, null, null, null);
    }
}
