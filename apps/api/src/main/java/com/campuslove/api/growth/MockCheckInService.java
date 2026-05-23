package com.campuslove.api.growth;

import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 签到服务实现。
 * 在 mock profile 下激活，返回固定的模拟签到数据。
 */
@Profile("mock")
@Service
public class MockCheckInService implements CheckInService {

  /** 签到奖励的额外推荐配额 */
  private static final int EXTRA_QUOTA_PER_CHECKIN = 3;

  /** 用户最后一次签到日期缓存 */
  private final ConcurrentHashMap<Long, LocalDate> lastCheckInDateMap = new ConcurrentHashMap<>();

  /** 用户连续签到天数缓存 */
  private final ConcurrentHashMap<Long, Integer> consecutiveDaysMap = new ConcurrentHashMap<>();

  /** 用户额外推荐配额缓存 */
  private final ConcurrentHashMap<Long, Integer> extraQuotaMap = new ConcurrentHashMap<>();

  @Override
  public CheckInResultView checkIn(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }

    LocalDate today = LocalDate.now();
    LocalDate lastDate = lastCheckInDateMap.get(userId);

    // 今日已签到
    if (lastDate != null && lastDate.equals(today)) {
      int consecutiveDays = consecutiveDaysMap.getOrDefault(userId, 1);
      int extraQuota = extraQuotaMap.getOrDefault(userId, 0);
      return new CheckInResultView(false, consecutiveDays, extraQuota);
    }

    // 计算连续天数
    int consecutiveDays;
    if (lastDate != null && lastDate.equals(today.minusDays(1))) {
      consecutiveDays = consecutiveDaysMap.getOrDefault(userId, 0) + 1;
    } else {
      consecutiveDays = 1;
    }

    lastCheckInDateMap.put(userId, today);
    consecutiveDaysMap.put(userId, consecutiveDays);

    // 增加额外推荐配额
    int newExtraQuota = extraQuotaMap.merge(userId, EXTRA_QUOTA_PER_CHECKIN, Integer::sum);

    return new CheckInResultView(true, consecutiveDays, newExtraQuota);
  }

  @Override
  public CheckInStatusView getCheckInStatus(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }

    LocalDate today = LocalDate.now();
    LocalDate lastDate = lastCheckInDateMap.get(userId);
    boolean checkedInToday = lastDate != null && lastDate.equals(today);

    int consecutiveDays;
    if (checkedInToday) {
      consecutiveDays = consecutiveDaysMap.getOrDefault(userId, 1);
    } else if (lastDate != null && lastDate.equals(today.minusDays(1))) {
      consecutiveDays = consecutiveDaysMap.getOrDefault(userId, 1);
    } else {
      consecutiveDays = 0;
    }

    int extraQuota = extraQuotaMap.getOrDefault(userId, 0);

    return new CheckInStatusView(checkedInToday, consecutiveDays, extraQuota);
  }
}
