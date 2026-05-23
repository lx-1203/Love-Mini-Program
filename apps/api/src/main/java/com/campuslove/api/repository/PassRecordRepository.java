package com.campuslove.api.repository;

import com.campuslove.api.entity.PassRecord;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 左滑(pass)记录 Repository。
 * 提供基于用户和时间的查询方法，用于推荐排除和反悔功能。
 */
public interface PassRecordRepository extends JpaRepository<PassRecord, Long> {

    /**
     * 根据用户查询 pass 记录，按创建时间倒序。
     *
     * @param userId 用户 ID
     * @return pass 记录列表
     */
    List<PassRecord> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 检查用户是否已 pass 过指定用户（避免重复 pass）。
     *
     * @param userId       执行 pass 的用户 ID
     * @param passedUserId 被 pass 的用户 ID
     * @return 是否存在记录
     */
    boolean existsByUserIdAndPassedUserId(Long userId, Long passedUserId);

    /**
     * 统计用户在指定时间之后的 pass 次数（用于反悔每日限次）。
     *
     * @param userId 用户 ID
     * @param since  起始时间
     * @return pass 次数
     */
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime since);
}
