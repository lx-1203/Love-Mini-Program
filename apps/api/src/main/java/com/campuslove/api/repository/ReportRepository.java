package com.campuslove.api.repository;

import com.campuslove.api.entity.Report;
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
     *
     * @param status     举报状态：PENDING/HANDLED/REJECTED，可空
     * @param targetType 目标类型：POST/COMMENT/USER/TOPIC，可空
     * @param pageable   分页参数
     * @return 分页举报结果
     */
    @Query("SELECT r FROM Report r WHERE (:status IS NULL OR r.status = :status) AND (:targetType IS NULL OR r.targetType = :targetType) ORDER BY r.createdAt DESC")
    Page<Report> findByStatusAndTargetType(
            @Param("status") String status,
            @Param("targetType") String targetType,
            Pageable pageable);
}
