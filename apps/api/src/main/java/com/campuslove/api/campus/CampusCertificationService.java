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

    /**
     * 查询用户的认证徽章级别（Phase B - Task B3）。
     *
     * <p>徽章级别取值：</p>
     * <ul>
     *   <li>{@code "school"} —— 校园认证已通过（status=APPROVED）</li>
     *   <li>{@code "email"} —— 仅邮箱认证通过（暂未实现，预留枚举）</li>
     *   <li>{@code "idcard"} —— 仅身份证认证通过（暂未实现，预留枚举）</li>
     *   <li>{@code "none"} —— 均未认证或认证未通过</li>
     * </ul>
     *
     * <p>当前阶段仅校园认证已落地，email/idcard 认证体系未接入，
     * 故实现中只可能返回 "school" 或 "none"。其余取值为向前兼容预留。</p>
     *
     * @param userId 用户 ID
     * @return 徽章级别字符串（school/email/idcard/none）
     */
    String getVerificationBadgeLevel(Long userId);

    /**
     * 模拟校园认证直接通过（P3 演示接口，仅 mock profile 可用）。
     *
     * <p>直接写入一条 APPROVED 认证记录，并联动 mock 用户校区（南校区/verified），
     * 用于演示环境快速获得校园认证与同校内容可见性。</p>
     *
     * @param userId 用户 ID
     * @return 认证视图（APPROVED）
     * @throws UnsupportedOperationException real profile 下不支持（仅 mock 演示）
     */
    CampusCertificationView simulateApprove(Long userId);
}