package com.campuslove.api.verification;

import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 实名认证照片清除服务（2026-10-05 合规接线）。
 *
 * <p>职责：统一承载实名认证身份证照片文件的物理删除与认证记录 photo 引用置空，
 * 供两条链路共用：</p>
 * <ul>
 *   <li>保留策略到期清除：审核通过 N 天后由定时任务
 *       （{@link RealRealNameCertificationService} 内 {@code @Scheduled}）调用；</li>
 *   <li>账号注销清除：注销流程（{@code RealAccountSecurityService#deactivateAccount}）
 *       同步删除该用户实名照片。</li>
 * </ul>
 *
 * <p>合规语义：删除身份证照片文件并置空记录中的 URL 引用，但保留审核结论
 * （status/reviewerId/reviewComment/reviewedAt）与身份证号密文/哈希（id_card_no），
 * 作为「该用户曾通过实名核验」的依据。文件删除统一走
 * {@code MediaStorageService#delete}（媒体存储根路径工具方法，禁止硬编码路径）。</p>
 *
 * <p>失败语义：单张照片删除失败仅记录日志、不抛异常，避免阻断注销主流程或
 * 导致定时任务整体回滚（URL 引用残留时下一轮保留策略任务会重试）。</p>
 */
@Profile("real")
@Service
public class RealNameMediaPurgeService {

    private static final Logger log = LoggerFactory.getLogger(RealNameMediaPurgeService.class);

    private final RealNameCertificationRepository repository;
    /** 媒体存储删除工具（可为 null：兼容旧单测直接 new 构造的场景） */
    @Autowired(required = false)
    private com.campuslove.api.media.MediaStorageService mediaStorageService;

    public RealNameMediaPurgeService(RealNameCertificationRepository repository) {
        this.repository = repository;
    }

    /**
     * 删除指定认证记录的身份证正反面照片文件，并把记录中的照片 URL 置空。
     * 保留审核结论与身份证号密文（合规留存核验依据）。
     *
     * @param certification 认证记录（可为 null，幂等跳过）
     * @return 实际清除了照片引用时返回 true
     */
    @Transactional
    public boolean purgePhotos(RealNameCertification certification) {
        if (certification == null) {
            return false;
        }
        boolean changed = false;
        changed |= deletePhotoQuietly(certification.getIdCardFrontUrl(), certification.getId(), "正面");
        changed |= deletePhotoQuietly(certification.getIdCardBackUrl(), certification.getId(), "背面");
        if (changed) {
            certification.setIdCardFrontUrl(null);
            certification.setIdCardBackUrl(null);
            repository.save(certification);
            log.info("实名认证照片已清除（保留审核结论与身份证号密文）: certId={}, userId={}",
                    certification.getId(), certification.getUserId());
        }
        return changed;
    }

    /**
     * 按用户 ID 清除实名认证照片（注销链路入口）。
     * 用户无认证记录时静默跳过；清除失败仅记日志不抛异常（不阻断注销主流程）。
     *
     * @param userId 注销用户 ID
     */
    public void purgeByUserId(Long userId) {
        if (userId == null) {
            return;
        }
        try {
            repository.findByUserId(userId).ifPresent(this::purgePhotos);
        } catch (RuntimeException e) {
            log.warn("注销时清除实名认证照片失败（不阻断注销）: userId={}, error={}", userId, e.getMessage());
        }
    }

    /**
     * 保留策略到期清除：删除「审核通过且已过保留期」认证记录的照片。
     * 由 {@link RealRealNameCertificationService} 的定时任务调用。
     *
     * @param cutoff 截止时间（reviewedAt 早于该值的已通过记录进入清除范围）
     * @return 本次清除照片引用的记录数
     */
    @Transactional
    public int purgeApprovedPhotosBefore(LocalDateTime cutoff) {
        List<RealNameCertification> expired = repository.findApprovedWithPhotosBefore(cutoff);
        int purged = 0;
        for (RealNameCertification cert : expired) {
            try {
                if (purgePhotos(cert)) {
                    purged++;
                }
            } catch (RuntimeException e) {
                // 单条清除失败不阻断整体任务，URL 引用残留时下一轮任务重试
                log.warn("保留策略清除实名照片失败: certId={}, error={}", cert.getId(), e.getMessage());
            }
        }
        return purged;
    }

    /**
     * 删除单张照片文件（失败仅记日志，不影响引用置空之外的流程）。
     *
     * @return URL 非空即视为待清除（无论文件删除是否成功，引用都会被置空）
     */
    private boolean deletePhotoQuietly(String url, Long certId, String side) {
        if (url == null || url.isBlank()) {
            return false;
        }
        if (mediaStorageService != null) {
            try {
                mediaStorageService.delete(url);
            } catch (RuntimeException e) {
                log.warn("删除实名认证{}照片文件失败: certId={}, url={}, error={}",
                        side, certId, url, e.getMessage());
            }
        }
        return true;
    }
}
