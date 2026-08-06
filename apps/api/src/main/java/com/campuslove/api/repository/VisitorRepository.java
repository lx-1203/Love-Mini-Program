package com.campuslove.api.repository;

import com.campuslove.api.entity.Visitor;
import java.time.LocalDateTime;
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
     * 检查指定访客在指定时间范围内是否已访问过指定用户。
     *
     * <p>缺陷修复：created_at 为 {@link LocalDateTime} 类型，派生查询 Between
     * 参数必须与实体属性类型一致（{@link LocalDateTime}），否则运行时抛出
     * {@code InvalidDataAccessApiUsageException}（LocalDate 无法绑定为
     * LocalDateTime 比较参数），导致访客记录链路 500。由调用方将日期转换为
     * 当日起始时刻 {@code today.atStartOfDay()} 与次日起始时刻。</p>
     *
     * @param visitorId        访客用户 ID
     * @param visitedUserId    被访用户 ID
     * @param startInclusive   查询范围起始时刻（含）
     * @param endExclusive     查询范围结束时刻（不含）
     * @return 是否存在记录
     */
    boolean existsByVisitorIdAndVisitedUserIdAndCreatedAtBetween(
            Long visitorId,
            Long visitedUserId,
            LocalDateTime startInclusive,
            LocalDateTime endExclusive
    );
}
