package com.campuslove.api.verification;

/**
 * 恋爱认证服务接口。
 * 提供恋爱认证申请的提交与状态查询。
 * 根据激活的 Spring Profile，由 RealLoveVerificationService 或 MockLoveVerificationService 实现。
 */
public interface LoveVerificationService {

    /**
     * 提交恋爱认证申请。
     *
     * <p>状态流转：</p>
     * <ul>
     *   <li>无记录 —— 创建新申请，状态 pending</li>
     *   <li>已有 rejected 记录 —— 允许重新提交覆盖原记录（重置为 pending）</li>
     *   <li>已有 pending 记录 —— 抛业务异常（审核中，请耐心等待）</li>
     *   <li>已有 approved 记录 —— 抛业务异常（已认证，无需重复提交）</li>
     * </ul>
     *
     * @param userId           当前用户 ID
     * @param studentName      学生姓名
     * @param studentId        学号
     * @param schoolName       学校名称
     * @param studentIdCardUrl 学生证照片 URL
     * @return 申请视图（pending）
     */
    LoveVerificationView submit(Long userId, String studentName, String studentId,
                                String schoolName, String studentIdCardUrl);

    /**
     * 查询当前用户的恋爱认证申请与状态。
     *
     * @param userId 当前用户 ID
     * @return 申请视图；未提交过申请时返回 {@link LoveVerificationView#empty()}（status 为 null）
     */
    LoveVerificationView getStatus(Long userId);
}
