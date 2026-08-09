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

    /** 按校区 + 分类筛选 upcoming 活动（R4 2026-08-09） */
    Page<Activity> findByCampusNameAndStatusAndCategoryOrderByActivityDateAsc(
            String campusName, ActivityStatus status, String category, Pageable pageable);

    /** 按分类筛选 upcoming 活动（R4 2026-08-09） */
    Page<Activity> findByStatusAndCategoryOrderByActivityDateAsc(
            ActivityStatus status, String category, Pageable pageable);

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

    /**
     * 管理后台 - 多条件分页查询活动。
     * <p>所有筛选条件均可为 null（不参与筛选），按创建时间倒序排列。
     * 标题为模糊匹配（LIKE '%keyword%'），campusName 精确匹配
     * （数据隔离由调用方注入管辖校区名）。</p>
     *
     * @param keyword    标题模糊关键字，null 表示不筛选
     * @param status     活动状态筛选（upcoming/ongoing/ended），null 表示不筛选
     * @param published  上架状态筛选（true/false），null 表示不筛选
     * @param campusName 校区名称筛选（精确匹配），null 表示不筛选
     * @param category   活动分类筛选（精确匹配），null 表示不筛选（R4 2026-08-09）
     * @param pageable   分页参数
     * @return 分页活动列表
     */
    @Query("""
            SELECT a FROM Activity a
            WHERE (:keyword IS NULL OR a.title LIKE CONCAT('%', :keyword, '%'))
              AND (:status IS NULL OR a.status = :status)
              AND (:published IS NULL OR a.published = :published)
              AND (:campusName IS NULL OR a.campusName = :campusName)
              AND (:category IS NULL OR a.category = :category)
            ORDER BY a.createdAt DESC
            """)
    Page<Activity> searchForAdmin(
            @Param("keyword") String keyword,
            @Param("status") ActivityStatus status,
            @Param("published") Boolean published,
            @Param("campusName") String campusName,
            @Param("category") String category,
            Pageable pageable);
}
