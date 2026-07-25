package com.campuslove.api.repository;

import com.campuslove.api.entity.MakeUpQuota;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
