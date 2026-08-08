package com.campuslove.api.repository;

import com.campuslove.api.entity.CampusCertification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 校园认证 Repository。
 * 提供基于用户ID、认证状态等条件的查询方法。
 */
public interface CampusCertificationRepository extends JpaRepository<CampusCertification, Long> {

    /**
     * 根据用户 ID 查询认证记录。
     *
     * @param userId 用户 ID
     * @return 认证记录（Optional）
     */
    Optional<CampusCertification> findByUserId(Long userId);

    /**
     * 根据认证状态查询，按提交时间降序排列。
     *
     * @param status 认证状态
     * @return 认证记录列表
     */
    List<CampusCertification> findByStatusOrderBySubmittedAtDesc(String status);

    /**
     * R4-00336：按认证状态 + 用户 ID 集合查询（WHERE userId IN 下推 SQL）。
     *
     * <p>用于推荐列表批量加载认证徽章级别——替代全表加载 APPROVED 认证记录后
     * 再内存过滤（用户量增长后每次推荐全表扫描认证表，DB 压力与内存占用随规模
     * 线性增长）。</p>
     *
     * @param status  认证状态（如 APPROVED）
     * @param userIds 候选用户 ID 集合（空集合返回空列表）
     * @return 匹配的认证记录列表（按提交时间降序）
     */
    List<CampusCertification> findByStatusAndUserIdIn(String status, java.util.Collection<Long> userIds);

    /**
     * 查询所有认证记录，按提交时间降序排列。
     *
     * @return 认证记录列表
     */
    List<CampusCertification> findAllByOrderBySubmittedAtDesc();

    /**
     * 管理后台 - 按状态与校区组合查询认证记录，按提交时间降序排列。
     * <p>数据隔离（商业模式：每个高校一个管理员）：campus_certifications 表无 campus_name 列，
     * campusName 非空时按<b>申请人所属校区</b>过滤（EXISTS 子查询关联
     * {@code UserCampusProfile.campusName}，与 AdminUserController 语义一致）。</p>
     *
     * @param status     认证状态：PENDING/APPROVED/REJECTED；"ALL" 或 null 表示不限制
     * @param campusName 校区筛选（按申请人所属校区过滤），null/空表示不筛选
     * @return 认证记录列表（按提交时间降序）
     */
    @Query("""
            SELECT c FROM CampusCertification c
            WHERE (:status IS NULL OR :status = 'ALL' OR c.status = :status)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = c.userId AND ucp.campusName = :campusName))
            ORDER BY c.submittedAt DESC
            """)
    List<CampusCertification> searchForAdmin(
            @Param("status") String status,
            @Param("campusName") String campusName);

    /**
     * R4-00386：认证列表分页查询（与 {@link #searchForAdmin} 同条件，返回分页结果）。
     *
     * <p>认证申请量大时避免一次性全量返回（后台页面卡顿）；响应仍以列表形式
     * 下发（分页参数可选），后续管理端可扩展完整分页交互。</p>
     *
     * @param status     认证状态：PENDING/APPROVED/REJECTED；"ALL" 或 null 表示不限制
     * @param campusName 校区筛选（按申请人所属校区过滤），null/空表示不筛选
     * @param pageable   分页参数（page 从 0 开始）
     * @return 分页认证记录（按提交时间倒序）
     */
    @Query("""
            SELECT c FROM CampusCertification c
            WHERE (:status IS NULL OR :status = 'ALL' OR c.status = :status)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = c.userId AND ucp.campusName = :campusName))
            ORDER BY c.submittedAt DESC
            """)
    org.springframework.data.domain.Page<CampusCertification> searchForAdminPage(
            @Param("status") String status,
            @Param("campusName") String campusName,
            org.springframework.data.domain.Pageable pageable);
}