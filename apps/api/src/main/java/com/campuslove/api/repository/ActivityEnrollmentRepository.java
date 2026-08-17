package com.campuslove.api.repository;

import com.campuslove.api.entity.ActivityEnrollment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 活动报名记录 Repository。
 * 提供基于活动和用户的查询方法。
 */
public interface ActivityEnrollmentRepository extends JpaRepository<ActivityEnrollment, Long> {

    List<ActivityEnrollment> findByActivityId(Long activityId);

    List<ActivityEnrollment> findByUserId(Long userId);

    Optional<ActivityEnrollment> findByActivityIdAndUserId(Long activityId, Long userId);

    boolean existsByActivityIdAndUserId(Long activityId, Long userId);

    Page<ActivityEnrollment> findByActivityIdOrderByEnrolledAtDesc(Long activityId, Pageable pageable);

    long deleteByActivityId(Long activityId);

    /**
     * 查询两个用户共同报名过的活动 ID 列表。
     */
    @Query("SELECT e1.activityId FROM ActivityEnrollment e1 WHERE e1.userId = :userIdA "
            + "AND EXISTS (SELECT 1 FROM ActivityEnrollment e2 "
            + "WHERE e2.activityId = e1.activityId AND e2.userId = :userIdB)")
    List<Long> findCommonActivityIdsByUserIds(@Param("userIdA") Long userIdA,
                                              @Param("userIdB") Long userIdB);
}
