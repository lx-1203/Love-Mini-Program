package com.campuslove.api.growth;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CheckInConfig;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 签到服务实现。
 * 在 mock profile 下激活，返回固定的模拟签到数据。
 *
 * 功能7：新增 makeUp 方法，模拟补签逻辑（日期范围校验 + 月配额限制）。
 */
@Profile("mock")
@Service
public class MockCheckInService implements CheckInService {

  private final CheckInConfig checkInConfig;

  /** 用户最后一次签到日期缓存 */
  private final ConcurrentHashMap<Long, LocalDate> lastCheckInDateMap = new ConcurrentHashMap<>();

  /** 用户连续签到天数缓存 */
  private final ConcurrentHashMap<Long, Integer> consecutiveDaysMap = new ConcurrentHashMap<>();

  /** 用户额外推荐配额缓存 */
  private final ConcurrentHashMap<Long, Integer> extraQuotaMap = new ConcurrentHashMap<>();

  /** 功能7：用户本月已用补签次数缓存（key=userId+yearMonth，value=已用次数） */
  private final ConcurrentHashMap<String, Integer> makeUpUsedCountMap = new ConcurrentHashMap<>();

  /** 功能7：每月补签次数上限 */
  private static final int MAKE_UP_LIMIT = 3;

  /** 功能7：首次补签后每次消耗的积分 */
  private static final int MAKE_UP_COST_POINTS = 50;

  /** 功能7：补签日期范围（仅可补签昨日及之前 7 天内） */
  private static final int MAKE_UP_MAX_DAYS_BACK = 7;

  /** 功能7：年月格式化器 */
  private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

  /**
   * 构造函数，注入签到配置。
   *
   * @param checkInConfig 签到配置
   */
  public MockCheckInService(CheckInConfig checkInConfig) {
    this.checkInConfig = checkInConfig;
  }

  @Override
  public CheckInResultView checkIn(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }

    LocalDate today = LocalDate.now(TimeZones.BUSINESS);
    LocalDate lastDate = lastCheckInDateMap.get(userId);

    // 今日已签到
    if (lastDate != null && lastDate.equals(today)) {
      int consecutiveDays = consecutiveDaysMap.getOrDefault(userId, 1);
      int extraQuota = extraQuotaMap.getOrDefault(userId, 0);
      int extraRecommendQuota = checkInConfig.getExtraQuotaPerCheckIn();
      // 已签到重复提交：本次无新增奖励，points 返回 0（与 real 口径一致）
      return new CheckInResultView(false, consecutiveDays, extraQuota,
          extraRecommendQuota, true, true, 3, 2, 0);
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
    int newExtraQuota = extraQuotaMap.merge(userId, checkInConfig.getExtraQuotaPerCheckIn(), Integer::sum);

    // Mock 权益数据：热门话题3条，新入圈用户2人
    int extraRecommendQuota = checkInConfig.getExtraQuotaPerCheckIn();
    return new CheckInResultView(true, consecutiveDays, newExtraQuota,
        extraRecommendQuota, true, true, 3, 2, checkInConfig.getRewardCentsPerCheckIn());
  }

  @Override
  public CheckInStatusView getCheckInStatus(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }

    LocalDate today = LocalDate.now(TimeZones.BUSINESS);
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

    // 积分余额：mock 固定 100 分（对齐前端 MOCK_POINTS_BALANCE 常量）
    return new CheckInStatusView(checkedInToday, consecutiveDays, extraQuota, 100L);
  }

  /**
   * 功能7：Mock 签到补签。
   *
   * Mock 逻辑：
   * 1. 校验日期格式（yyyy-MM-dd）
   * 2. 校验日期范围（昨日及之前 7 天内）
   * 3. 校验当月补签次数上限（默认 3 次）
   * 4. 计算消耗积分（首次免费，其后 50 积分）
   * 5. 模拟连续签到天数 +1
   *
   * @param userId 用户 ID
   * @param date   补签日期（yyyy-MM-dd）
   * @return 补签结果视图
   * @throws IllegalArgumentException 日期无效、超出范围、超出月配额时抛出
   */
  @Override
  public MakeUpCheckInResultView makeUp(Long userId, String date) {
    if (userId == null) {
      throw new IllegalArgumentException("userId is required");
    }
    if (date == null || date.isEmpty()) {
      throw new IllegalArgumentException("date is required");
    }

    LocalDate targetDate;
    try {
      targetDate = LocalDate.parse(date);
    } catch (java.time.format.DateTimeParseException e) {
      throw new IllegalArgumentException("日期格式无效，必须为 yyyy-MM-dd");
    }

    LocalDate today = LocalDate.now(TimeZones.BUSINESS);
    LocalDate sevenDaysAgo = today.minusDays(MAKE_UP_MAX_DAYS_BACK);

    // 校验：不可补签当天或未来日期
    if (!targetDate.isBefore(today)) {
      throw new IllegalArgumentException("补签日期必须早于今天");
    }
    // 校验：不可补签超过 7 天前的日期
    if (targetDate.isBefore(sevenDaysAgo)) {
      throw new IllegalArgumentException(
          "仅可补签昨日及之前 " + MAKE_UP_MAX_DAYS_BACK + " 天内的日期");
    }

    // 当月补签次数（按 userId+yearMonth 维度统计）
    String yearMonth = targetDate.format(YEAR_MONTH_FORMATTER);
    String quotaKey = userId + "-" + yearMonth;
    int usedCount = makeUpUsedCountMap.getOrDefault(quotaKey, 0);

    if (usedCount >= MAKE_UP_LIMIT) {
      throw new IllegalArgumentException(
          "本月补签次数已用完（上限 " + MAKE_UP_LIMIT + " 次）");
    }

    // 计算消耗积分：首次免费（usedCount=0），其后 50 积分
    int costPoints = usedCount == 0 ? 0 : MAKE_UP_COST_POINTS;

    // 更新本月已用次数
    makeUpUsedCountMap.put(quotaKey, usedCount + 1);

    // 模拟连续签到天数 +1（补签视为已签到）
    int currentConsecutive = consecutiveDaysMap.getOrDefault(userId, 0);
    int newConsecutive = currentConsecutive + 1;
    consecutiveDaysMap.put(userId, newConsecutive);

    return new MakeUpCheckInResultView(
        true,
        date,
        newConsecutive,
        usedCount + 1,
        MAKE_UP_LIMIT,
        costPoints
    );
  }
}