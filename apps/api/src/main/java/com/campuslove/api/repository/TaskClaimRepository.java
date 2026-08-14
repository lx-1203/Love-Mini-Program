package com.campuslove.api.repository;

import com.campuslove.api.entity.TaskClaim;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 任务领取记录 Repository（3-J 任务与积分）。
 */
public interface TaskClaimRepository extends JpaRepository<TaskClaim, Long> {

    /**
     * 判断用户是否领取过某任务（一次性任务）。
     *
     * @param userId   用户 ID
     * @param taskCode 任务编码
     * @return 是否已领取
     */
    boolean existsByUserIdAndTaskCode(Long userId, String taskCode);

    /**
     * 判断用户是否在指定日期领取过某任务（每日任务）。
     *
     * @param userId    用户 ID
     * @param taskCode  任务编码
     * @param claimDate 领取日期
     * @return 是否已领取
     */
    boolean existsByUserIdAndTaskCodeAndClaimDate(Long userId, String taskCode, LocalDate claimDate);

    /**
     * 查询用户的全部任务领取记录（按领取时间倒序）。
     *
     * @param userId 用户 ID
     * @return 领取记录列表
     */
    List<TaskClaim> findByUserIdOrderByCreatedAtDesc(Long userId);
}
