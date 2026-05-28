package com.campuslove.api.repository;

import com.campuslove.api.entity.DailyBenefit;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 每日签到权益 Repository。
 * 提供基于用户和日期的查询方法，支持签到后权益查询。
 */
public interface DailyBenefitRepository extends JpaRepository<DailyBenefit, Long> {

    /**
     * 根据用户 ID 和权益日期查询每日权益记录。
     *
     * @param userId      用户 ID
     * @param benefitDate 权益日期
     * @return 匹配的每日权益记录（可能为空）
     */
    Optional<DailyBenefit> findByUserIdAndBenefitDate(Long userId, LocalDate benefitDate);
}