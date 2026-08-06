package com.campuslove.api.repository;

import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 活动 Repository。
 * 提供基于状态和校区的查询方法。
 */
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    /**
     * 根据活动状态查询活动列表，按活动日期升序排列。
     *
     * @param status   活动状态
     * @param pageable 分页参数
     * @return 活动分页列表
     */
    Page<Activity> findByStatusOrderByActivityDateAsc(ActivityStatus status, Pageable pageable);

    /**
     * 根据校区名称和活动状态查询活动列表，按活动日期升序排列。
     *
     * @param campusName 校区名称
     * @param status     活动状态
     * @param pageable   分页参数
     * @return 活动分页列表
     */
    Page<Activity> findByCampusNameAndStatusOrderByActivityDateAsc(String campusName, ActivityStatus status, Pageable pageable);

    /**
     * 数据库侧原子递增报名人数（消除并发报名计数丢失）。
     *
     * @param id 活动 ID
     * @return 更新条数
     */
    @Modifying
    @Query("UPDATE Activity a SET a.enrollmentCount = a.enrollmentCount + 1 WHERE a.id = :id")
    int incrementEnrollmentCount(@Param("id") Long id);

    /**
     * 数据库侧原子递减报名人数（下限 0，消除并发取消计数漂移）。
     *
     * @param id 活动 ID
     * @return 更新条数
     */
    @Modifying
    @Query("UPDATE Activity a SET a.enrollmentCount = CASE "
            + "WHEN a.enrollmentCount > 0 THEN a.enrollmentCount - 1 ELSE 0 END WHERE a.id = :id")
    int decrementEnrollmentCount(@Param("id") Long id);
}
