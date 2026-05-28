package com.campuslove.api.campus;

/**
 * 校园认证服务接口。
 * 提供校园身份认证的提交、查询和审核功能。
 */
public interface CampusCertificationService {

    /**
     * 提交校园认证申请。
     * 如果用户已有 REJECTED 状态的记录，允许重新提交覆盖；
     * 如果用户已有 PENDING 或 APPROVED 状态的记录，则抛出业务异常。
     *
     * @param userId            用户 ID
     * @param schoolName        学校名称
     * @param major             专业
     * @param studentIdCardUrl  学生证照片 URL
     * @return 认证视图
     */
    CampusCertificationView submitCertification(Long userId, String schoolName, String major, String studentIdCardUrl);

    /**
     * 查询用户的校园认证状态。
     * 如果用户没有认证记录，返回 status 为 null 的视图。
     *
     * @param userId 用户 ID
     * @return 认证视图
     */
    CampusCertificationView getCertificationStatus(Long userId);

    /**
     * 审核校园认证申请。
     * 仅 status=PENDING 时可审核，更新 status、reviewerId、reviewComment、reviewedAt。
     *
     * @param certId       认证记录 ID
     * @param status       审核结果（APPROVED 或 REJECTED）
     * @param reviewerId   审核人 ID
     * @param reviewComment 审核意见
     * @return 认证视图
     */
    CampusCertificationView reviewCertification(Long certId, String status, Long reviewerId, String reviewComment);
}