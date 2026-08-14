package com.campuslove.api.repository;

import com.campuslove.api.entity.ConsultingSignup;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 咨询课程报名 Repository（3-I 咨询报名）。
 */
public interface ConsultingSignupRepository extends JpaRepository<ConsultingSignup, Long> {

    /**
     * 查询用户对某课程的报名记录（幂等判定）。
     *
     * @param userId   用户 ID
     * @param courseId 课程 ID
     * @return 报名记录（可能为空）
     */
    Optional<ConsultingSignup> findByUserIdAndCourseId(Long userId, Long courseId);

    /**
     * 查询用户的全部报名记录（按报名时间倒序，预加载课程信息避免 N+1）。
     *
     * @param userId 用户 ID
     * @return 报名记录列表（含课程关联）
     */
    @Query("SELECT s FROM ConsultingSignup s JOIN FETCH s.course c WHERE s.userId = :userId ORDER BY s.createdAt DESC")
    List<ConsultingSignup> findByUserIdWithCourseOrderByCreatedAtDesc(@Param("userId") Long userId);
}
