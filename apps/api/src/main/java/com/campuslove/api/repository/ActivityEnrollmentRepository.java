package com.campuslove.api.repository;

import com.campuslove.api.entity.ActivityEnrollment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 活动报名记录 Repository。
 * 提供基于活动和用户的查询方法。
 */
public interface ActivityEnrollmentRepository extends JpaRepository<ActivityEnrollment, Long> {

    /**
     * 根据活动 ID 查询报名记录。
     *
     * @param activityId 活动 ID
     * @return 报名记录列表
     */
    List<ActivityEnrollment> findByActivityId(Long activityId);

    /**
     * 根据用户 ID 查询报名记录。
     *
     * @param userId 用户 ID
     * @return 报名记录列表
     */
    List<ActivityEnrollment> findByUserId(Long userId);

    /**
     * 根据活动 ID 和用户 ID 查询报名记录。
     *
     * @param activityId 活动 ID
     * @param userId     用户 ID
     * @return 报名记录（可能为空）
     */
    Optional<ActivityEnrollment> findByActivityIdAndUserId(Long activityId, Long userId);

    /**
     * 检查指定用户是否已报名指定活动。
     *
     * @param activityId 活动 ID
     * @param userId     用户 ID
     * @return 是否已报名
     */
    boolean existsByActivityIdAndUserId(Long activityId, Long userId);

    /**
     * 根据活动 ID 分页查询报名记录，按报名时间倒序排列（管理后台报名列表）。
     *
     * @param activityId 活动 ID
     * @param pageable   分页参数
     * @return 报名记录分页列表（最新报名在前）
     */
    Page<ActivityEnrollment> findByActivityIdOrderByEnrolledAtDesc(Long activityId, Pageable pageable);

    /**
     * 根据活动 ID 删除全部报名记录（删除活动时清理孤儿数据）。
     *
     * @param activityId 活动 ID
     * @return 删除条数
     */
    long deleteByActivityId(Long activityId);
}
