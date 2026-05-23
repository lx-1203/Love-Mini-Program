package com.campuslove.api.repository;

import com.campuslove.api.entity.CheckIn;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 签到记录 Repository。
 * 提供基于用户和日期的查询方法。
 */
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    /**
     * 根据用户 ID 和签到日期查询签到记录。
     *
     * @param userId      用户 ID
     * @param checkInDate 签到日期
     * @return 匹配的签到记录（可能为空）
     */
    Optional<CheckIn> findByUserIdAndCheckInDate(Long userId, LocalDate checkInDate);

    /**
     * 查询指定用户最近一次签到记录，按签到日期倒序。
     *
     * @param userId 用户 ID
     * @return 最近的签到记录（可能为空）
     */
    Optional<CheckIn> findTopByUserIdOrderByCheckInDateDesc(Long userId);
}
