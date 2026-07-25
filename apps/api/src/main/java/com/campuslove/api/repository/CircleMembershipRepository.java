package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleMembership;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 圈子成员 Repository。
 * 提供基于用户和圈子的查询方法。
 */
public interface CircleMembershipRepository extends JpaRepository<CircleMembership, Long> {

    /**
     * 根据用户 ID 查询已加入的圈子列表。
     *
     * @param userId 用户 ID
     * @return 成员关系列表
     */
    List<CircleMembership> findByUserId(Long userId);

    /**
     * 修复 N+1 查询：根据多个用户 ID 批量查询成员关系。
     * 用于推荐算法一次性预加载所有候选用户的圈子关系，避免循环调用 findByUserId。
     *
     * @param userIds 用户 ID 列表
     * @return 成员关系列表（包含 userId 字段，调用方按 userId 分组）
     */
    List<CircleMembership> findByUserIdIn(List<Long> userIds);

    /**
     * 修复 N+1 查询：根据多个用户 ID 批量查询成员关系，并通过 @EntityGraph 一次性预加载 circle 关联。
     * <p>推荐算法在评分阶段会调用 {@code m.getCircle().getId()}，
     * 若使用 {@link #findByUserIdIn} 会因 {@code circle} 是 LAZY 加载而触发 N+1 查询。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 circle，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param userIds 用户 ID 列表
     * @return 成员关系列表（circle 已被预加载）
     */
    @EntityGraph(attributePaths = "circle")
    @Query("SELECT m FROM CircleMembership m WHERE m.userId IN :userIds")
    List<CircleMembership> findWithCircleByUserIdIn(@Param("userIds") List<Long> userIds);

    /**
     * 统计指定圈子的成员数量。
     *
     * @param circleId 圈子 ID
     * @return 成员数量
     */
    long countByCircleId(Long circleId);

    /**
     * 根据用户 ID 和圈子 ID 查询成员关系。
     *
     * @param userId   用户 ID
     * @param circleId 圈子 ID
     * @return 成员关系列表
     */
    List<CircleMembership> findByUserIdAndCircleId(Long userId, Long circleId);
}
