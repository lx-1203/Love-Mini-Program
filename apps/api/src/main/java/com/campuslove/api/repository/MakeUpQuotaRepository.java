package com.campuslove.api.repository;

import com.campuslove.api.entity.MakeUpQuota;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 签到补签每月配额 Repository。
 *
 * 功能7：提供按用户 + 年月查询当月配额的能力。
 */
public interface MakeUpQuotaRepository extends JpaRepository<MakeUpQuota, Long> {

    /**
     * 根据用户 ID 和年月查询配额记录。
     *
     * @param userId    用户 ID
     * @param yearMonth 年月（yyyy-MM）
     * @return 配额记录（可能为空，首次补签时由 service 创建）
     */
    Optional<MakeUpQuota> findByUserIdAndYearMonth(Long userId, String yearMonth);

    /**
     * P0-24：原子递增当月已用补签次数（单条 UPDATE + 条件判断，修复读-改-写竞态）。
     *
     * <p>仅在 {@code used_count < limit_count} 时递增，返回影响行数：
     * 1 表示成功占用一次配额，0 表示并发下配额已耗尽（无需再逐条加锁/重查）。
     * 取代原「读 quota → setUsedCount(+1) → save」的非原子读-改-写，
     * 并发补签时不会出现超额补签（乐观锁版本冲突同样被规避）。</p>
     *
     * @param id  配额记录 ID
     * @param now 当前时间（刷新 updated_at）
     * @return 影响行数（0 表示配额已用完）
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE MakeUpQuota q SET q.usedCount = q.usedCount + 1, q.updatedAt = :now "
            + "WHERE q.id = :id AND q.usedCount < q.limitCount")
    int incrementUsedCount(@Param("id") Long id, @Param("now") LocalDateTime now);
}
