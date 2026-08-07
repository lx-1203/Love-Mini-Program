package com.campuslove.api.repository;

import com.campuslove.api.entity.CheckIn;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 签到记录 Repository。
 * 提供基于用户和日期的查询方法。
 */
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    /**
     * 根据用户 ID 和签到日期查询签到记录。
     *
     * @param userId      用户 ID
     * @param checkInDate 签到日期
     * @return 匹配的签到记录（可能为空）
     */
    Optional<CheckIn> findByUserIdAndCheckInDate(Long userId, LocalDate checkInDate);

    /**
     * 查询指定用户最近一次签到记录，按签到日期倒序。
     *
     * @param userId 用户 ID
     * @return 最近的签到记录（可能为空）
     */
    Optional<CheckIn> findTopByUserIdOrderByCheckInDateDesc(Long userId);

    /**
     * 管理后台分页查询签到积分流水（多条件筛选 + 校区数据隔离）。
     *
     * <p>签到记录作为积分流水来源（金币/积分体系未建独立流水表，以签到记录代替）：
     * campusName 非空时通过 EXISTS 子查询联 {@code UserCampusProfile.campusName} 过滤，
     * 校区管理员仅可见本校区用户的签到记录。</p>
     *
     * @param userId    用户 ID（可空）
     * @param source    签到来源 NORMAL/MAKE_UP（可空）
     * @param dateFrom  签到起始日期（可空）
     * @param dateTo    签到结束日期（可空）
     * @param campusName 管辖校区名（可空，null/空表示不过滤）
     * @param pageable  分页参数
     * @return 分页签到记录（按签到时间倒序）
     */
    @Query("""
            SELECT c FROM CheckIn c
            WHERE (:userId IS NULL OR c.userId = :userId)
              AND (:source IS NULL OR :source = '' OR c.source = :source)
              AND (:dateFrom IS NULL OR c.checkInDate >= :dateFrom)
              AND (:dateTo IS NULL OR c.checkInDate <= :dateTo)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.userId = c.userId AND p.campusName = :campusName))
            ORDER BY c.createdAt DESC
            """)
    Page<CheckIn> searchForAdmin(
            @Param("userId") Long userId,
            @Param("source") String source,
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo,
            @Param("campusName") String campusName,
            Pageable pageable);
}
