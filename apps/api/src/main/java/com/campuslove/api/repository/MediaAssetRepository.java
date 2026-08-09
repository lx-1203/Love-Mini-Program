package com.campuslove.api.repository;

import com.campuslove.api.entity.MediaAsset;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 媒体资产 Repository。
 *
 * <p>提供按用户 ID、类型查询的方法，用于：
 * <ul>
 *   <li>查询用户全部照片墙资产（type=image）</li>
 *   <li>查询用户全部视频资产（type=video）</li>
 *   <li>查询用户全部背景图资产（type=background）</li>
 *   <li>查询用户最近上传的资产（按 createdAt 倒序）</li>
 *   <li>管理后台审核分页查询（pending 优先 + 校区隔离，2026-08-09）</li>
 *   <li>读取侧按 URL 批量查审核状态（防 N+1，2026-08-09）</li>
 * </ul>
 * </p>
 */
@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {

    /**
     * 根据用户 ID 和媒体类型查询资产列表。
     *
     * @param userId 用户 ID
     * @param type   媒体类型（image/video/background）
     * @return 资产列表（可能为空，不会返回 null）
     */
    List<MediaAsset> findByUserIdAndType(Long userId, String type);

    /**
     * 根据用户 ID 查询全部资产，按创建时间倒序排列。
     * 用于个人主页媒体管理场景。
     *
     * @param userId 用户 ID
     * @return 资产列表（最新优先）
     */
    List<MediaAsset> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 按 URL 集合批量查询（读取侧过滤审核状态用，避免 N+1）。
     *
     * @param urls 媒体 URL 集合
     * @return 匹配的资产列表（URL 在给定集合内）
     */
    List<MediaAsset> findByUrlIn(Collection<String> urls);

    /**
     * 管理后台审核分页查询（2026-08-09）。
     *
     * 筛选条件：审核状态 / 上传者用户 ID / 校区名（校区隔离子查询）。
     * 排序：pending 优先，同状态按创建时间倒序。
     *
     * @param auditStatus 审核状态（pending/approved/rejected，null 为全部）
     * @param userId      上传者用户 ID（null 为全部）
     * @param campusName  校区名（null 为全部；校区管理员传入强制隔离）
     * @param pageable    分页参数
     * @return 分页结果
     */
    @Query("""
            SELECT m FROM MediaAsset m
            WHERE (:auditStatus IS NULL OR m.auditStatus = :auditStatus)
              AND (:userId IS NULL OR m.userId = :userId)
              AND (:campusName IS NULL OR EXISTS (
                    SELECT 1 FROM UserCampusProfile ucp
                    WHERE ucp.userId = m.userId AND ucp.campusName = :campusName))
            ORDER BY CASE m.auditStatus WHEN 'pending' THEN 0 ELSE 1 END, m.createdAt DESC
            """)
    Page<MediaAsset> searchForAdmin(@Param("auditStatus") String auditStatus,
                                    @Param("userId") Long userId,
                                    @Param("campusName") String campusName,
                                    Pageable pageable);
}
