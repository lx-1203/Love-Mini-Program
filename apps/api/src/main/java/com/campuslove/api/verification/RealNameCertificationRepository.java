package com.campuslove.api.verification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 实名认证 Repository。
 * 提供基于用户 ID、认证状态等条件的查询方法。
 */
public interface RealNameCertificationRepository extends JpaRepository<RealNameCertification, Long> {

    /**
     * 根据用户 ID 查询认证记录。
     *
     * @param userId 用户 ID
     * @return 认证记录（Optional）
     */
    Optional<RealNameCertification> findByUserId(Long userId);

    /**
     * 查询「已审核通过且超过照片保留期、仍有照片引用」的认证记录
     * （2026-10-05 合规接线：保留策略定时任务用，清除身份证照片）。
     *
     * @param cutoff 截止时间（reviewedAt 早于该值）
     * @return 待清除照片的认证记录列表
     */
    @Query("""
            SELECT c FROM RealNameCertification c
            WHERE c.status = 'APPROVED'
              AND c.reviewedAt < :cutoff
              AND (c.idCardFrontUrl IS NOT NULL OR c.idCardBackUrl IS NOT NULL)
            """)
    List<RealNameCertification> findApprovedWithPhotosBefore(@Param("cutoff") LocalDateTime cutoff);

    /**
     * 根据认证状态查询，按提交时间降序排列。
     *
     * @param status 认证状态
     * @return 认证记录列表
     */
    List<RealNameCertification> findByStatusOrderBySubmittedAtDesc(String status);

    /**
     * 查询所有认证记录，按提交时间降序排列。
     *
     * @return 认证记录列表
     */
    List<RealNameCertification> findAllByOrderBySubmittedAtDesc();

    /**
     * 管理后台 - 按状态查询实名认证记录（分页，按提交时间降序）。
     * 与校园认证 {@code searchForAdminPage} 同口径：status 为 "ALL" 或 null 时不限制。
     *
     * @param status   认证状态：PENDING/APPROVED/REJECTED；"ALL" 或 null 表示不限制
     * @param pageable 分页参数（page 从 0 开始）
     * @return 分页认证记录（按提交时间倒序）
     */
    @Query("""
            SELECT c FROM RealNameCertification c
            WHERE (:status IS NULL OR :status = 'ALL' OR c.status = :status)
            ORDER BY c.submittedAt DESC
            """)
    Page<RealNameCertification> searchForAdminPage(
            @Param("status") String status,
            Pageable pageable);
}
