package com.campuslove.api.repository;

import com.campuslove.api.entity.AuditLog;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 审计日志 Repository。
 * 支持按操作者、操作类型、时间范围分页查询。
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * 多条件分页查询审计日志。
     * 任意参数为 null 时不参与过滤。
     *
     * @param operatorId 操作者ID（可空）
     * @param operation  操作类型（可空）
     * @param startTime  起始时间（可空，包含）
     * @param endTime    结束时间（可空，包含）
     * @param pageable   分页
     * @return 分页结果
     */
    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:operatorId IS NULL OR a.operatorId = :operatorId)
              AND (:operation  IS NULL OR a.operation = :operation)
              AND (:startTime  IS NULL OR a.createdAt >= :startTime)
              AND (:endTime    IS NULL OR a.createdAt <= :endTime)
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLog> search(
            @Param("operatorId") Long operatorId,
            @Param("operation") String operation,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            Pageable pageable);
}
