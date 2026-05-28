package com.campuslove.api.campus;

import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.repository.CampusCertificationRepository;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实校园认证服务实现。
 * 在 real profile 下激活，使用 CampusCertificationRepository 实现数据库持久化。
 * 认证状态流转：PENDING -> APPROVED / REJECTED（仅 PENDING 状态可审核）。
 * 已驳回（REJECTED）的记录允许用户重新提交覆盖。
 */
@Profile("real")
@Service
public class RealCampusCertificationService implements CampusCertificationService {

    private static final Logger log = LoggerFactory.getLogger(RealCampusCertificationService.class);

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    private final CampusCertificationRepository campusCertificationRepository;

    public RealCampusCertificationService(CampusCertificationRepository campusCertificationRepository) {
        this.campusCertificationRepository = campusCertificationRepository;
    }

    /**
     * 提交校园认证申请。
     * - 如果用户没有认证记录，创建新记录。
     * - 如果用户已有 REJECTED 状态的记录，允许重新提交覆盖原记录。
     * - 如果用户已有 PENDING 或 APPROVED 状态的记录，抛出业务异常。
     *
     * @param userId            用户 ID
     * @param schoolName        学校名称
     * @param major             专业
     * @param studentIdCardUrl  学生证照片 URL
     * @return 认证视图
     */
    @Override
    @Transactional
    public CampusCertificationView submitCertification(Long userId, String schoolName, String major, String studentIdCardUrl) {
        Optional<CampusCertification> existingOpt = campusCertificationRepository.findByUserId(userId);

        if (existingOpt.isPresent()) {
            CampusCertification existing = existingOpt.get();
            String currentStatus = existing.getStatus();

            if (STATUS_PENDING.equals(currentStatus)) {
                throw new IllegalStateException("您的校园认证正在审核中，请耐心等待");
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                throw new IllegalStateException("您已完成校园认证，无需重复提交");
            }
            // STATUS_REJECTED: 允许重新提交覆盖
            log.info("用户 {} 重新提交校园认证（覆盖已驳回记录 id={}）", userId, existing.getId());
            existing.setSchoolName(schoolName);
            existing.setMajor(major);
            existing.setStudentIdCardUrl(studentIdCardUrl);
            existing.setStatus(STATUS_PENDING);
            existing.setSubmittedAt(LocalDateTime.now());
            existing.setReviewerId(null);
            existing.setReviewComment(null);
            existing.setReviewedAt(null);
            CampusCertification saved = campusCertificationRepository.save(existing);
            return toView(saved);
        }

        // 首次提交
        CampusCertification certification = new CampusCertification();
        certification.setUserId(userId);
        certification.setSchoolName(schoolName);
        certification.setMajor(major);
        certification.setStudentIdCardUrl(studentIdCardUrl);
        certification.setStatus(STATUS_PENDING);
        certification.setSubmittedAt(LocalDateTime.now());

        CampusCertification saved = campusCertificationRepository.save(certification);
        log.info("用户 {} 提交校园认证申请，记录 id={}", userId, saved.getId());
        return toView(saved);
    }

    /**
     * 查询用户的校园认证状态。
     * 如果用户没有认证记录，返回 status 为 null 的视图（表示未提交）。
     *
     * @param userId 用户 ID
     * @return 认证视图
     */
    @Override
    public CampusCertificationView getCertificationStatus(Long userId) {
        Optional<CampusCertification> existingOpt = campusCertificationRepository.findByUserId(userId);
        if (existingOpt.isPresent()) {
            return toView(existingOpt.get());
        }
        // 未提交认证，返回 status=null 的空视图
        CampusCertificationView emptyView = new CampusCertificationView();
        emptyView.setUserId(userId);
        return emptyView;
    }

    /**
     * 审核校园认证申请。
     * 仅 status=PENDING 时可审核，更新 status、reviewerId、reviewComment、reviewedAt。
     * 审核结果只能是 APPROVED 或 REJECTED。
     *
     * @param certId        认证记录 ID
     * @param status        审核结果（APPROVED 或 REJECTED）
     * @param reviewerId    审核人 ID
     * @param reviewComment 审核意见
     * @return 认证视图
     */
    @Override
    @Transactional
    public CampusCertificationView reviewCertification(Long certId, String status, Long reviewerId, String reviewComment) {
        CampusCertification certification = campusCertificationRepository.findById(certId)
                .orElseThrow(() -> new NoSuchElementException("认证记录不存在: id=" + certId));

        if (!STATUS_PENDING.equals(certification.getStatus())) {
            throw new IllegalStateException(
                    "仅审核中状态的记录可审核，当前状态: " + CampusCertificationView.toStatusLabel(certification.getStatus()));
        }

        if (!STATUS_APPROVED.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new IllegalArgumentException("审核结果无效，仅支持 APPROVED 或 REJECTED");
        }

        certification.setStatus(status);
        certification.setReviewerId(reviewerId);
        certification.setReviewComment(reviewComment);
        certification.setReviewedAt(LocalDateTime.now());

        CampusCertification saved = campusCertificationRepository.save(certification);
        log.info("审核人 {} 将认证记录 id={} 审核为: {}", reviewerId, certId, status);
        return toView(saved);
    }

    /**
     * 将 Entity 转换为 View。
     */
    private CampusCertificationView toView(CampusCertification entity) {
        return new CampusCertificationView(
                entity.getId(),
                entity.getUserId(),
                entity.getSchoolName(),
                entity.getMajor(),
                entity.getStudentIdCardUrl(),
                entity.getStatus(),
                CampusCertificationView.toStatusLabel(entity.getStatus()),
                entity.getReviewerId(),
                entity.getReviewComment(),
                entity.getSubmittedAt(),
                entity.getReviewedAt()
        );
    }
}