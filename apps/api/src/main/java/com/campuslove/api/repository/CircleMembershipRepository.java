package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleMembership;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

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
