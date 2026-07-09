package com.campuslove.api.repository;

import com.campuslove.api.entity.UserOnlineStatus;
import com.campuslove.api.entity.UserOnlineStatus.OnlineStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 用户在线状态 Repository。
 * 提供基于用户 ID 的查询和批量状态更新方法。
 */
public interface UserOnlineStatusRepository extends JpaRepository<UserOnlineStatus, Long> {

    /**
     * 根据用户 ID 查询在线状态。
     *
     * @param userId 用户 ID
     * @return 在线状态记录（可能为空）
     */
    Optional<UserOnlineStatus> findByUserId(Long userId);

    /**
     * 根据用户 ID 列表批量查询在线状态。
     *
     * @param userIds 用户 ID 列表
     * @return 在线状态记录列表
     */
    List<UserOnlineStatus> findByUserIdIn(List<Long> userIds);

    /**
     * 将指定时间之前无心跳的用户标记为离线。
     * 用于定时任务检查超时未心跳的用户。
     *
     * @param threshold 超时阈值时间
     * @return 更新的记录数
     */
    @Modifying
    @Query("UPDATE UserOnlineStatus u SET u.status = 'offline', u.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE u.lastHeartbeat < :threshold AND u.status <> 'offline'")
    int updateStatusByLastHeartbeatBefore(@Param("threshold") LocalDateTime threshold);

    /**
     * 统计指定用户 ID 列表中在线的用户数。
     *
     * @param userIds 用户 ID 列表
     * @param status  在线状态
     * @return 在线用户数
     */
    long countByUserIdInAndStatus(List<Long> userIds, OnlineStatus status);

    /**
     * 统计最后心跳时间在指定时间之后的用户数（用于 DAU/MAU 近似统计）。
     *
     * @param threshold 心跳阈值时间
     * @return 心跳时间晚于阈值的用户数
     */
    long countByLastHeartbeatAfter(LocalDateTime threshold);
}
