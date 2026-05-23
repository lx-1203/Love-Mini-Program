package com.campuslove.api.repository;

import com.campuslove.api.entity.Visitor;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 访客记录 Repository。
 * 提供基于被访用户和日期的查询方法。
 */
public interface VisitorRepository extends JpaRepository<Visitor, Long> {

    /**
     * 根据被访用户查询访客列表，按创建时间倒序。
     *
     * @param visitedUserId 被访用户 ID
     * @return 访客记录列表
     */
    List<Visitor> findByVisitedUserIdOrderByCreatedAtDesc(Long visitedUserId);

    /**
     * 检查指定访客在指定日期是否已访问过指定用户。
     *
     * @param visitorId     访客用户 ID
     * @param visitedUserId 被访用户 ID
     * @param checkInDate   签到日期
     * @return 是否存在记录
     */
    boolean existsByVisitorIdAndVisitedUserIdAndCreatedAtBetween(
            Long visitorId,
            Long visitedUserId,
            LocalDate checkInDate,
            LocalDate checkInDateEnd
    );
}
