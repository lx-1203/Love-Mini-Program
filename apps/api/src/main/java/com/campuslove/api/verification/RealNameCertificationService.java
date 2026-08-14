package com.campuslove.api.verification;

/**
 * 实名认证服务接口。
 * 提供实名认证申请的提交、状态查询与审核。
 * 根据激活的 Spring Profile，由 RealRealNameCertificationService 或 MockRealNameCertificationService 实现。
 */
public interface RealNameCertificationService {

    /**
     * 提交实名认证申请。
     *
     * <p>状态流转：</p>
     * <ul>
     *   <li>无记录 —— 创建新申请，状态 PENDING</li>
     *   <li>已有 REJECTED 记录 —— 允许重新提交覆盖原记录（重置为 PENDING）</li>
     *   <li>已有 PENDING 记录 —— 抛业务异常（审核中，请耐心等待）</li>
     *   <li>已有 APPROVED 记录 —— 抛业务异常（已认证，无需重复提交）</li>
     * </ul>
     *
     * <p>前置校验：</p>
     * <ul>
     *   <li>未成年人保护（3-N）：用户出生日期未满 18 周岁拒绝提交</li>
     *   <li>身份证号格式：15 位或 18 位（末位可为 X/x）</li>
     *   <li>身份证号经 {@link com.campuslove.api.config.AesEncryptor} 加密后落库</li>
     * </ul>
     *
     * @param userId          当前用户 ID
     * @param userName        真实姓名
     * @param idCardNo        身份证号（明文，服务层加密存储）
     * @param idCardFrontUrl  身份证人像面（正面）照片 URL
     * @param idCardBackUrl   身份证国徽面（背面）照片 URL
     * @return 申请视图（PENDING）
     */
    RealNameCertificationView submit(Long userId, String userName, String idCardNo,
                                     String idCardFrontUrl, String idCardBackUrl);

    /**
     * 查询当前用户的实名认证申请与状态。
     *
     * @param userId 当前用户 ID
     * @return 申请视图；未提交过申请时返回 {@link RealNameCertificationView#empty()}（status 为 null）
     */
    RealNameCertificationView getStatus(Long userId);

    /**
     * 审核实名认证申请。
     * 仅 status=PENDING 时可审核，更新 status、reviewerId、reviewComment、reviewedAt；
     * 审核为 APPROVED 时置位 {@code user_basic_profile.id_card_verified = true}。
     *
     * @param certId        认证记录 ID
     * @param status        审核结果（APPROVED 或 REJECTED）
     * @param reviewerId    审核人 ID
     * @param reviewComment 审核意见
     * @return 认证视图
     */
    RealNameCertificationView review(Long certId, String status, Long reviewerId, String reviewComment);
}
