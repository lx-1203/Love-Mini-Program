package com.campuslove.api.repository;

import com.campuslove.api.entity.Report;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 举报 Repository。
 * <p>提供举报记录的持久化与查询能力。</p>
 * <p>管理后台通过状态 + 目标类型组合筛选，客户端通过举报人查询自己的举报历史。</p>
 */
public interface ReportRepository extends JpaRepository<Report, Long> {

    /**
     * 管理后台 - 按状态与目标类型组合分页查询举报列表，按创建时间倒序。
     * <p>status / targetType 任一为 null 时表示不限制该条件。</p>
     * <p>数据隔离（商业模式：每个高校一个管理员）：reports 表无 campus_name 列，
     * campusName 非空时按<b>被举报对象所属校区</b>过滤（EXISTS 子查询：
     * USER 目标取 targetId 用户校区；POST/COMMENT/TOPIC 目标先关联到作者再取作者校区，
     * 校区名均取自 {@code UserCampusProfile.campusName}）。</p>
     *
     * @param status     举报状态：PENDING/HANDLED/REJECTED，可空
     * @param targetType 目标类型：POST/COMMENT/USER/TOPIC，可空
     * @param campusName 校区筛选（按被举报对象所属校区过滤），null/空表示不筛选
     * @param pageable   分页参数
     * @return 分页举报结果
     */
    @Query("""
            SELECT r FROM Report r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:targetType IS NULL OR r.targetType = :targetType)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.campusName = :campusName
                      AND ((r.targetType = 'USER' AND p.userId = r.targetId)
                        OR (r.targetType = 'POST' AND p.userId = (
                            SELECT po.authorId FROM Post po WHERE po.id = r.targetId))
                        OR (r.targetType = 'COMMENT' AND p.userId = (
                            SELECT c.authorId FROM Comment c WHERE c.id = r.targetId))
                        OR (r.targetType = 'TOPIC' AND p.userId = (
                            SELECT t.authorId FROM CircleTopic t WHERE t.id = r.targetId)))))
            ORDER BY r.createdAt DESC
            """)
    Page<Report> findByStatusAndTargetType(
            @Param("status") String status,
            @Param("targetType") String targetType,
            @Param("campusName") String campusName,
            Pageable pageable);

    /**
     * 统计指定举报人自指定时间起的举报数（用于每日限额校验）。
     *
     * @param reporterId 举报人用户 ID
     * @param since      起始时间（含）
     * @return 举报数
     */
    long countByReporterIdAndCreatedAtAfter(Long reporterId, LocalDateTime since);
}
