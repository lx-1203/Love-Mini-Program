package com.campuslove.api.repository;

import com.campuslove.api.entity.UserScheduleProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户日程偏好 Repository。
 * 提供基于用户 ID 的查询方法。
 */
public interface UserScheduleProfileRepository extends JpaRepository<UserScheduleProfile, Long> {

    /**
     * 根据用户 ID 查询日程偏好。
     *
     * @param userId 用户 ID
     * @return 匹配的日程偏好（可能为空）
     */
    Optional<UserScheduleProfile> findByUserId(Long userId);

    /**
     * 批量查询多个用户的日程偏好（infra R2-00017：消除 MatchEngine 评分 N+1）。
     *
     * @param userIds 用户 ID 列表
     * @return 匹配的日程偏好列表
     */
    java.util.List<UserScheduleProfile> findByUserIdIn(java.util.List<Long> userIds);
}
