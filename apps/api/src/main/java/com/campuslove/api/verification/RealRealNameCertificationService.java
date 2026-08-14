package com.campuslove.api.verification;

import com.campuslove.api.common.AgePolicy;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.MinorNotAllowedException;
import com.campuslove.api.common.ResourceConflictException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实实名认证服务实现（B1-2）。
 * 在 real profile 下激活，使用 RealNameCertificationRepository 实现数据库持久化。
 *
 * <p>认证状态流转：PENDING -&gt; APPROVED / REJECTED（仅 PENDING 状态可审核）；
 * 已驳回（REJECTED）的记录允许用户重新提交覆盖。</p>
 *
 * <p>安全设计：</p>
 * <ul>
 *   <li>身份证号明文仅存在于请求链路，落库前经 {@link AesEncryptor} AES-GCM 加密</li>
 *   <li>对外视图仅返回脱敏身份证号（保留前 6 位与后 4 位，中间掩码）</li>
 *   <li>审核通过时置位 {@code user_basic_profile.id_card_verified}，
 *       作为校园认证（学历认证 B1-3）的前置门槛</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealRealNameCertificationService implements RealNameCertificationService {

    private static final Logger log = LoggerFactory.getLogger(RealRealNameCertificationService.class);

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    /**
     * 身份证号格式（宽松校验）：15 位纯数字，或 18 位（末位可为 X/x）。
     * 严谨的校验位（ISO 7064）算法不在本服务内实现，由运营审核把关。
     */
    private static final Pattern ID_CARD_PATTERN = Pattern.compile("^\\d{15}$|^\\d{17}[\\dXx]$");

    private final RealNameCertificationRepository repository;
    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final AesEncryptor aesEncryptor;

    public RealRealNameCertificationService(
            RealNameCertificationRepository repository,
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            AesEncryptor aesEncryptor) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.aesEncryptor = aesEncryptor;
    }

    /**
     * 提交实名认证申请。
     * <ul>
     *   <li>前置校验：用户存在且已满 18 周岁、身份证号格式合法</li>
     *   <li>无记录 —— 创建新申请（PENDING）</li>
     *   <li>已有 REJECTED 记录 —— 覆盖原记录（重置为 PENDING，清空驳回信息）</li>
     *   <li>已有 PENDING 记录 —— {@link ResourceConflictException}（409）</li>
     *   <li>已有 APPROVED 记录 —— {@link ResourceConflictException}（409）</li>
     * </ul>
     */
    @Override
    @Transactional
    public RealNameCertificationView submit(Long userId, String userName, String idCardNo,
                                            String idCardFrontUrl, String idCardBackUrl) {
        // 3-N 未成年人保护：出生日期缺失或未满 18 周岁一律拒绝
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException(ErrorMessages.USER_NOT_FOUND));
        if (!AgePolicy.isAdult(user.getBirthDate())) {
            log.warn("未成年人实名认证被拒绝：userId={}", userId);
            throw new MinorNotAllowedException(ErrorMessages.MINOR_NOT_ALLOWED_REAL_NAME);
        }
        if (!ID_CARD_PATTERN.matcher(idCardNo).matches()) {
            throw new IllegalArgumentException(ErrorMessages.ID_CARD_FORMAT_INVALID);
        }

        // 身份证号加密落库（AES-GCM），数据库泄露不暴露明文
        String idCardCipher = aesEncryptor.encrypt(idCardNo);

        Optional<RealNameCertification> existingOpt = repository.findByUserId(userId);
        if (existingOpt.isPresent()) {
            RealNameCertification existing = existingOpt.get();
            String currentStatus = existing.getStatus();

            if (STATUS_PENDING.equals(currentStatus)) {
                // 重复提交（审核中）：409 业务冲突，与校园认证 CAMPUS_CERT_PENDING 语义对齐
                throw new ResourceConflictException(ErrorMessages.REAL_NAME_CERT_PENDING);
            }
            if (STATUS_APPROVED.equals(currentStatus)) {
                // 已认证：拒绝重复提交
                throw new ResourceConflictException(ErrorMessages.REAL_NAME_CERT_ALREADY_DONE);
            }
            // STATUS_REJECTED：允许重新提交覆盖
            log.info("用户 {} 重新提交实名认证（覆盖已驳回记录 id={}）", userId, existing.getId());
            existing.setUserName(userName);
            existing.setIdCardNo(idCardCipher);
            existing.setIdCardFrontUrl(idCardFrontUrl);
            existing.setIdCardBackUrl(idCardBackUrl);
            existing.setStatus(STATUS_PENDING);
            existing.setReviewerId(null);
            existing.setReviewComment(null);
            existing.setReviewedAt(null);
            existing.setSubmittedAt(LocalDateTime.now(TimeZones.BUSINESS));
            RealNameCertification saved = repository.save(existing);
            return RealNameCertificationView.from(saved, RealNameCertificationView.maskIdCardNo(idCardNo));
        }

        // 首次提交
        RealNameCertification certification = new RealNameCertification();
        certification.setUserId(userId);
        certification.setUserName(userName);
        certification.setIdCardNo(idCardCipher);
        certification.setIdCardFrontUrl(idCardFrontUrl);
        certification.setIdCardBackUrl(idCardBackUrl);
        certification.setStatus(STATUS_PENDING);
        certification.setSubmittedAt(LocalDateTime.now(TimeZones.BUSINESS));

        RealNameCertification saved = repository.save(certification);
        log.info("用户 {} 提交实名认证申请，记录 id={}", userId, saved.getId());
        return RealNameCertificationView.from(saved, RealNameCertificationView.maskIdCardNo(idCardNo));
    }

    /**
     * 查询当前用户的实名认证申请与状态。
     * 未提交过申请时返回 status=null 的空视图（前端映射为 unverified）。
     */
    @Override
    public RealNameCertificationView getStatus(Long userId) {
        Optional<RealNameCertification> existingOpt = repository.findByUserId(userId);
        if (existingOpt.isPresent()) {
            RealNameCertification entity = existingOpt.get();
            return RealNameCertificationView.from(entity,
                    RealNameCertificationView.maskIdCardNo(decryptIdCardNo(entity)));
        }
        return RealNameCertificationView.empty();
    }

    /**
     * 审核实名认证申请。
     * 仅 status=PENDING 时可审核；审核为 APPROVED 时置位
     * {@code user_basic_profile.id_card_verified = true}（校园认证前置门槛）。
     *
     * <p>注意：身份证号视图同样走脱敏出口，审核人核验真实性以正反面照片为准。</p>
     */
    @Override
    @Transactional
    public RealNameCertificationView review(Long certId, String status, Long reviewerId, String reviewComment) {
        RealNameCertification certification = repository.findById(certId)
                .orElseThrow(() -> new NoSuchElementException(ErrorMessages.REAL_NAME_CERT_NOT_FOUND_PREFIX + certId));

        if (!STATUS_PENDING.equals(certification.getStatus())) {
            throw new IllegalStateException(
                    "仅审核中状态的记录可审核，当前状态: " + certification.getStatus());
        }
        if (!STATUS_APPROVED.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new IllegalArgumentException(ErrorMessages.CAMPUS_AUDIT_RESULT_INVALID);
        }

        certification.setStatus(status);
        certification.setReviewerId(reviewerId);
        certification.setReviewComment(reviewComment);
        certification.setReviewedAt(LocalDateTime.now(TimeZones.BUSINESS));

        RealNameCertification saved = repository.save(certification);
        log.info("审核人 {} 将实名认证记录 id={} 审核为: {}", reviewerId, certId, status);

        // B1-2：审核通过 → 置位身份证认证标志（校园认证/徽章体系的 idcard 前置门槛）
        if (STATUS_APPROVED.equals(status)) {
            userBasicProfileRepository.findByUserId(saved.getUserId()).ifPresentOrElse(bp -> {
                if (!Boolean.TRUE.equals(bp.getIdCardVerified())) {
                    bp.setIdCardVerified(Boolean.TRUE);
                    userBasicProfileRepository.save(bp);
                    log.info("实名认证通过，置位用户 {} 的 idCardVerified", saved.getUserId());
                }
            }, () -> log.warn("实名认证通过但用户 {} 无基础资料记录，跳过 idCardVerified 置位", saved.getUserId()));
        }

        return RealNameCertificationView.from(saved,
                RealNameCertificationView.maskIdCardNo(decryptIdCardNo(saved)));
    }

    /**
     * 解密实体中的身份证号密文。
     * 解密失败（密钥轮换/数据篡改等）时返回空串（视图层掩码兜底），不阻塞主流程。
     *
     * @param entity 认证实体
     * @return 明文身份证号；解密失败返回空串
     */
    private String decryptIdCardNo(RealNameCertification entity) {
        if (entity.getIdCardNo() == null || entity.getIdCardNo().isEmpty()) {
            return "";
        }
        try {
            return aesEncryptor.decrypt(entity.getIdCardNo());
        } catch (RuntimeException e) {
            log.warn("实名认证身份证号解密失败（id={}），视图返回掩码占位", entity.getId());
            return "";
        }
    }
}
