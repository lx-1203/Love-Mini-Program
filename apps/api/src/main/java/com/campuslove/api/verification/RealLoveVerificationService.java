package com.campuslove.api.verification;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.common.TimeZones;
import java.time.LocalDateTime;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实恋爱认证服务实现。
 * 在 real profile 下激活，使用 LoveVerificationApplicationRepository 实现数据库持久化。
 * 认证状态流转：pending -> approved / rejected（仅 pending 可审核）；
 * 已驳回（rejected）的记录允许用户重新提交覆盖。
 */
@Profile("real")
@Service
public class RealLoveVerificationService implements LoveVerificationService {

    private static final Logger log = LoggerFactory.getLogger(RealLoveVerificationService.class);

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";

    private final LoveVerificationApplicationRepository repository;

    public RealLoveVerificationService(LoveVerificationApplicationRepository repository) {
        this.repository = repository;
    }

    /**
     * 提交恋爱认证申请。
     * <ul>
     *   <li>无记录 —— 创建新申请（pending）</li>
     *   <li>已有 rejected 记录 —— 覆盖原记录（重置为 pending，清空驳回信息）</li>
     *   <li>已有 pending 记录 —— {@link ResourceConflictException}（409）</li>
     *   <li>已有 approved 记录 —— {@link ResourceConflictException}（409）</li>
     * </ul>
     */
    @Override
    @Transactional
    public LoveVerificationView submit(Long userId, String studentName, String studentId,
                                       String schoolName, String studentIdCardUrl) {
        Optional<LoveVerificationApplication> existingOpt = repository.findByUserId(userId);

        if (existingOpt.isPresent()) {
            LoveVerificationApplication existing = existingOpt.get();
            String currentStatus = existing.getStatus();

            if (STATUS_PENDING.equals(currentStatus)) {
                // 重复提交（审核中）：409 业务冲突，与校园认证 CAMPUS_CERT_PENDING 语义对齐
                throw new ResourceConflictException(ErrorMessages.LOVE_CERT_PENDING);
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                // 已认证：拒绝重复提交
                throw new ResourceConflictException(ErrorMessages.LOVE_CERT_ALREADY_DONE);
            }
            // STATUS_REJECTED：允许重新提交覆盖
            log.info("用户 {} 重新提交恋爱认证（覆盖已驳回记录 id={}）", userId, existing.getId());
            existing.setStudentName(studentName);
            existing.setStudentId(studentId);
            existing.setSchoolName(schoolName);
            existing.setStudentIdCardUrl(studentIdCardUrl);
            existing.setStatus(STATUS_PENDING);
            existing.setRejectReason(null);
            existing.setReviewedAt(null);
            existing.setSubmittedAt(LocalDateTime.now(TimeZones.BUSINESS));
            LoveVerificationApplication saved = repository.save(existing);
            return LoveVerificationView.from(saved);
        }

        // 首次提交
        LoveVerificationApplication application = new LoveVerificationApplication();
        application.setUserId(userId);
        application.setStudentName(studentName);
        application.setStudentId(studentId);
        application.setSchoolName(schoolName);
        application.setStudentIdCardUrl(studentIdCardUrl);
        application.setStatus(STATUS_PENDING);
        application.setSubmittedAt(LocalDateTime.now(TimeZones.BUSINESS));

        LoveVerificationApplication saved = repository.save(application);
        log.info("用户 {} 提交恋爱认证申请，记录 id={}", userId, saved.getId());
        return LoveVerificationView.from(saved);
    }

    /**
     * 查询当前用户的恋爱认证申请与状态。
     * 未提交过申请时返回 status=null 的空视图（前端映射为 unverified）。
     */
    @Override
    public LoveVerificationView getStatus(Long userId) {
        Optional<LoveVerificationApplication> existingOpt = repository.findByUserId(userId);
        return existingOpt.map(LoveVerificationView::from).orElseGet(LoveVerificationView::empty);
    }
}
