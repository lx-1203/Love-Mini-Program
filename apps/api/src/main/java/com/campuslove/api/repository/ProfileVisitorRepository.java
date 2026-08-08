package com.campuslove.api.repository;

import com.campuslove.api.entity.ProfileVisitor;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 个人主页访客记录 Repository（功能3）。
 *
 * <p>提供基于被访用户、时间区间等条件的查询方法。
 * 所有方法均返回 {@link ProfileVisitor} 实体列表，
 * 由 Controller / Service 层映射为视图对象后返回前端。</p>
 */
public interface ProfileVisitorRepository extends JpaRepository<ProfileVisitor, Long> {

    /**
     * 查询指定用户主页的访客列表，按访问时间倒序。
     * 用于"谁看过我"页面展示。
     *
     * @param hostId 被访用户 ID
     * @return 访客记录列表（按时间倒序）
     */
    List<ProfileVisitor> findByHostIdOrderByVisitedAtDesc(Long hostId);

    /**
     * R4-00292：查询指定访客对该主页最近一次访问记录。
     * 唯一约束冲突后回查落库视图用（visitedAt 以 DB 值为准）。
     *
     * @param visitorId 访客用户 ID
     * @param hostId    被访用户 ID
     * @return 最近一次访问记录（不存在时为空）
     */
    java.util.Optional<ProfileVisitor> findTopByVisitorIdAndHostIdOrderByVisitedAtDesc(
            Long visitorId, Long hostId);

    /**
     * 检查指定访客在指定时间区间内是否已访问过指定用户主页。
     * 用于"同一天只记录一次访问"的去重逻辑。
     *
     * @param visitorId 访客用户 ID
     * @param hostId    被访用户 ID
     * @param startTime 区间开始时间（含）
     * @param endTime   区间结束时间（不含）
     * @return 是否存在记录
     */
    boolean existsByVisitorIdAndHostIdAndVisitedAtBetween(
            Long visitorId,
            Long hostId,
            LocalDateTime startTime,
            LocalDateTime endTime
    );

    /**
     * 查询指定用户主页在指定时间区间内的访客列表，按访问时间倒序。
     * 用于按时间段（今日/昨日/更早）筛选访客记录。
     *
     * @param hostId    被访用户 ID
     * @param startTime 区间开始时间（含）
     * @param endTime   区间结束时间（不含）
     * @return 访客记录列表
     */
    List<ProfileVisitor> findByHostIdAndVisitedAtBetweenOrderByVisitedAtDesc(
            Long hostId,
            LocalDateTime startTime,
            LocalDateTime endTime
    );
}
