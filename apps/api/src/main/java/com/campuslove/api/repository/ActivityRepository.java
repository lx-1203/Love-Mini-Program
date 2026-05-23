package com.campuslove.api.repository;

import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
