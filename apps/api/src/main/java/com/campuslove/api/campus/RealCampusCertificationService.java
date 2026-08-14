package com.campuslove.api.campus;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.InvalidOperationException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.campus.event.CertificationApprovedEvent;
import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实校园认证服务实现。
 * 在 real profile 下激活，使用 CampusCertificationRepository 实现数据库持久化。
 * 认证状态流转：PENDING -> APPROVED / REJECTED（仅 PENDING 状态可审核）。
 * 已驳回（REJECTED）的记录允许用户重新提交覆盖。
 *
 * <p>SubTask 5.3.2：审批通过后发布 {@link CertificationApprovedEvent} 事件，
 * 通知订阅者（如 {@link com.campuslove.api.search.UserIndexSyncListener}）
 * 同步更新 Elasticsearch 用户索引。</p>
 */
@Profile("real")
@Service
public class RealCampusCertificationService implements CampusCertificationService {

    private static final Logger log = LoggerFactory.getLogger(RealCampusCertificationService.class);

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    private final CampusCertificationRepository campusCertificationRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final ApplicationEventPublisher eventPublisher;

    public RealCampusCertificationService(
            CampusCertificationRepository campusCertificationRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            ApplicationEventPublisher eventPublisher) {
        this.campusCertificationRepository = campusCertificationRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * 提交校园认证申请。
     * - 前置门槛（B1-2/B1-3）：用户须先完成实名认证（idCardVerified=true），否则拒绝提交。
     * - 如果用户没有认证记录，创建新记录。
     * - 如果用户已有 REJECTED 状态的记录，允许重新提交覆盖原记录。
     * - 如果用户已有 PENDING 或 APPROVED 状态的记录，抛出业务异常。
     *
     * @param userId             用户 ID
     * @param schoolName         学校名称
     * @param major              专业
     * @param studentIdCardUrl   学生证照片 URL
     * @param chsiCode           学信网在线验证码（可空）
     * @param chsiScreenshotUrl  学信网学历截图 URL（可空）
     * @return 认证视图
     */
    @Override
    @Transactional
    public CampusCertificationView submitCertification(Long userId, String schoolName, String major,
                                                       String studentIdCardUrl, String chsiCode,
                                                       String chsiScreenshotUrl) {
        // B1-2 前置门槛：未完成实名认证的用户不得提交学历认证（校园认证）
        userBasicProfileRepository.findByUserId(userId)
                .filter(bp -> Boolean.TRUE.equals(bp.getIdCardVerified()))
                .orElseThrow(() -> new InvalidOperationException(ErrorMessages.REAL_NAME_REQUIRED_FOR_CAMPUS));

        Optional<CampusCertification> existingOpt = campusCertificationRepository.findByUserId(userId);

        if (existingOpt.isPresent()) {
            CampusCertification existing = existingOpt.orElseThrow(() ->
                    new IllegalStateException("认证记录存在但 Optional 为空，数据不一致"));
            String currentStatus = existing.getStatus();

            if (STATUS_PENDING.equals(currentStatus)) {
                // 缺陷修复：重复提交（已有审核中记录）改抛 ResourceConflictException（409），
                // 原 IllegalStateException 落入全局异常兜底返回 500
                throw new ResourceConflictException(ErrorMessages.CAMPUS_CERT_PENDING);
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                throw new ResourceConflictException(ErrorMessages.CAMPUS_CERT_ALREADY_DONE);
            }
            // STATUS_REJECTED: 允许重新提交覆盖
            log.info("用户 {} 重新提交校园认证（覆盖已驳回记录 id={}）", userId, existing.getId());
            existing.setSchoolName(schoolName);
            existing.setMajor(major);
            existing.setStudentIdCardUrl(studentIdCardUrl);
            existing.setChsiCode(chsiCode);
            existing.setChsiScreenshotUrl(chsiScreenshotUrl);
            existing.setStatus(STATUS_PENDING);
            existing.setSubmittedAt(LocalDateTime.now(TimeZones.BUSINESS));
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
        certification.setChsiCode(chsiCode);
        certification.setChsiScreenshotUrl(chsiScreenshotUrl);
        certification.setStatus(STATUS_PENDING);
        certification.setSubmittedAt(LocalDateTime.now(TimeZones.BUSINESS));

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
     * <p>SubTask 5.3.2：审核通过（APPROVED）时发布 {@link CertificationApprovedEvent}
     * 事件，通知订阅者同步更新 Elasticsearch 用户索引。</p>
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
            throw new IllegalArgumentException(ErrorMessages.CAMPUS_AUDIT_RESULT_INVALID);
        }

        certification.setStatus(status);
        certification.setReviewerId(reviewerId);
        certification.setReviewComment(reviewComment);
        certification.setReviewedAt(LocalDateTime.now(TimeZones.BUSINESS));

        CampusCertification saved = campusCertificationRepository.save(certification);
        log.info("审核人 {} 将认证记录 id={} 审核为: {}", reviewerId, certId, status);

        // SubTask 5.3.2：审核通过后发布事件，触发 ES 用户索引同步
        if (STATUS_APPROVED.equals(status)) {
            try {
                eventPublisher.publishEvent(CertificationApprovedEvent.of(this, saved, reviewerId));
                log.info("SubTask 5.3.2 认证审批通过事件已发布: userId={}, certId={}, reviewerId={}",
                        saved.getUserId(), certId, reviewerId);
            } catch (RuntimeException e) {
                // 事件发布失败不影响主流程，仅记录日志
                log.warn("认证审批通过事件发布失败: certId={}, error={}", certId, e.getMessage());
            }
        }

        return toView(saved);
    }

    /**
     * 查询用户的认证徽章级别（Phase B - Task B3.3/B3.4）。
     *
     * <p>判定逻辑（优先级：school > email > idcard > none）：</p>
     * <ol>
     *   <li>查询用户的校园认证记录，若 status=APPROVED，则返回 "school"</li>
     *   <li>否则查询 user_basic_profile.email_verified，若为 true 则返回 "email"</li>
     *   <li>否则查询 user_basic_profile.id_card_verified，若为 true 则返回 "idcard"</li>
     *   <li>否则返回 "none"</li>
     * </ol>
     *
     * @param userId 用户 ID，null 时直接返回 "none"
     * @return 徽章级别字符串（school/email/idcard/none）
     */
    @Override
    public String getVerificationBadgeLevel(Long userId) {
        if (userId == null) {
            return "none";
        }
        // 1. 校园认证 APPROVED 优先级最高
        Optional<CampusCertification> existingOpt = campusCertificationRepository.findByUserId(userId);
        if (existingOpt.isPresent() && STATUS_APPROVED.equals(existingOpt.get().getStatus())) {
            return "school";
        }
        // 2. 邮箱认证次之
        Optional<UserBasicProfile> bpOpt = userBasicProfileRepository.findByUserId(userId);
        if (bpOpt.isPresent()) {
            UserBasicProfile bp = bpOpt.get();
            if (Boolean.TRUE.equals(bp.getEmailVerified())) {
                return "email";
            }
            // 3. 身份证认证再次之
            if (Boolean.TRUE.equals(bp.getIdCardVerified())) {
                return "idcard";
            }
        }
        return "none";
    }

    /**
     * 模拟校园认证直接通过（P3 演示接口）。
     *
     * <p>仅 mock profile 的演示语义；real profile 直接抛出
     * {@link UnsupportedOperationException}（由 Controller 转 501 Not Implemented），
     * 防止绕过真实认证流程。</p>
     */
    @Override
    public CampusCertificationView simulateApprove(Long userId) {
        throw new UnsupportedOperationException("simulateApprove only for mock profile");
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
                entity.getChsiCode(),
                entity.getChsiScreenshotUrl(),
                entity.getStatus(),
                CampusCertificationView.toStatusLabel(entity.getStatus()),
                entity.getReviewerId(),
                entity.getReviewComment(),
                entity.getSubmittedAt(),
                entity.getReviewedAt()
        );
    }
}