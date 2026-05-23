package com.campuslove.api.growth;

import com.campuslove.api.config.CheckInConfig;
import com.campuslove.api.entity.CheckIn;
import com.campuslove.api.repository.CheckInRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实签到服务实现。
 * 在 real profile 下激活，使用 CheckInRepository 实现数据库持久化。
 * <p>
 * 核心功能：
 * <ul>
 *   <li>签到：创建 CheckIn 记录，日期+用户ID唯一约束，重复签到返回错误</li>
 *   <li>签到状态查询：返回今日是否已签到、连续天数、额外推荐配额</li>
 *   <li>连续签到天数计算：从今天开始往前逐天检查，中断则归零</li>
 *   <li>签到奖励：签到成功后额外推荐次数+3（仅影响每日推荐限额，非积分/等级）</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealCheckInService implements CheckInService {

    private static final Logger log = LoggerFactory.getLogger(RealCheckInService.class);

    private final CheckInConfig checkInConfig;

    private final CheckInRepository checkInRepository;

    /**
     * 构造函数，注入签到记录 Repository。
     *
     * @param checkInRepository 签到记录数据访问层
     */
    public RealCheckInService(CheckInConfig checkInConfig, CheckInRepository checkInRepository) {
        this.checkInConfig = checkInConfig;
        this.checkInRepository = checkInRepository;
    }

    /**
     * 执行签到。
     * <p>
     * 逻辑流程：
     * 1. 校验 userId 非空
     * 2. 检查今日是否已签到（用户ID+日期唯一约束）
     * 3. 计算连续签到天数（基于昨日是否有签到记录）
     * 4. 创建 CheckIn 记录并持久化
     * 5. 返回签到结果（含额外推荐配额）
     *
     * @param userId 用户 ID
     * @return 签到结果视图
     * @throws IllegalArgumentException 当 userId 为空时
     * @throws RuntimeException         当并发签到导致唯一约束冲突时
     */
    @Override
    @Transactional
    public CheckInResultView checkIn(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        LocalDate today = LocalDate.now();

        // 检查今日是否已签到
        Optional<CheckIn> existingCheckIn = checkInRepository.findByUserIdAndCheckInDate(userId, today);
        if (existingCheckIn.isPresent()) {
            log.info("用户[{}]今日已签到，重复签到被拒绝", userId);
            // 今日已签到，返回失败结果，附带当前连续天数和已有配额
            int consecutiveDays = existingCheckIn.get().getConsecutiveDays();
            int extraQuota = calculateTotalExtraQuota(userId);
            return new CheckInResultView(false, consecutiveDays, extraQuota);
        }

        // 计算连续签到天数
        int consecutiveDays = calculateConsecutiveDays(userId, today);

        // 创建签到记录
        CheckIn checkIn = new CheckIn();
        checkIn.setUserId(userId);
        checkIn.setCheckInDate(today);
        checkIn.setConsecutiveDays(consecutiveDays);
        checkIn.setCreatedAt(LocalDateTime.now());

        try {
            checkInRepository.save(checkIn);
            log.info("用户[{}]签到成功，连续签到{}天", userId, consecutiveDays);
        } catch (DataIntegrityViolationException e) {
            // 并发场景下可能触发唯一约束冲突
            log.warn("用户[{}]签到时发生唯一约束冲突，可能为并发重复签到", userId, e);
            throw new RuntimeException("签到失败，请稍后重试", e);
        }

        // 签到成功后，额外推荐配额+3
        int extraQuota = calculateTotalExtraQuota(userId) + checkInConfig.getExtraQuotaPerCheckIn();

        return new CheckInResultView(true, consecutiveDays, extraQuota);
    }

    /**
     * 查询今日签到状态。
     * <p>
     * 返回信息包含：
     * - 今日是否已签到
     * - 连续签到天数
     * - 累计额外推荐配额（每次签到+3）
     *
     * @param userId 用户 ID
     * @return 签到状态视图
     * @throws IllegalArgumentException 当 userId 为空时
     */
    @Override
    @Transactional(readOnly = true)
    public CheckInStatusView getCheckInStatus(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        LocalDate today = LocalDate.now();

        // 检查今日是否已签到
        boolean checkedInToday = checkInRepository.findByUserIdAndCheckInDate(userId, today).isPresent();

        // 计算连续签到天数
        int consecutiveDays = calculateConsecutiveDays(userId, today);

        // 计算累计额外推荐配额
        int extraQuota = calculateTotalExtraQuota(userId);

        return new CheckInStatusView(checkedInToday, consecutiveDays, extraQuota);
    }

    // ---- 公共扩展方法 ----

    /**
     * 计算连续签到天数。
     * <p>
     * 从今天开始往前逐天检查：
     * - 如果今天有签到记录，从今天开始计数
     * - 如果今天没有签到但昨天有，从昨天开始计数
     * - 某天没有签到记录则中断计数
     * - 仅作视觉标识，无积分/等级影响
     *
     * @param userId 用户 ID
     * @return 连续签到天数
     */
    public int getStreakDays(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return calculateConsecutiveDays(userId, LocalDate.now());
    }

    /**
     * 获取指定月份的签到日历。
     * <p>
     * 返回该月中所有已签到的日期列表，用于前端日历展示。
     *
     * @param userId    用户 ID
     * @param yearMonth 年月，格式为 yyyy-MM
     * @return 当月已签到的日期列表（dayOfMonth）
     */
    @Transactional(readOnly = true)
    public List<Integer> getMonthlyCalendar(Long userId, YearMonth yearMonth) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (yearMonth == null) {
            throw new IllegalArgumentException("yearMonth is required");
        }

        LocalDate startOfMonth = yearMonth.atDay(1);
        LocalDate endOfMonth = yearMonth.atEndOfMonth();

        // 逐天查询该月哪些天有签到记录
        // 优化方案：后续可替换为范围查询减少 DB 访问次数
        List<Integer> checkedDays = new ArrayList<>();
        for (LocalDate date = startOfMonth; !date.isAfter(endOfMonth); date = date.plusDays(1)) {
            if (checkInRepository.findByUserIdAndCheckInDate(userId, date).isPresent()) {
                checkedDays.add(date.getDayOfMonth());
            }
        }

        log.debug("用户[{}]在{}年{}月共签到{}天", userId, yearMonth.getYear(), yearMonth.getMonthValue(), checkedDays.size());
        return checkedDays;
    }

    // ---- 私有辅助方法 ----

    /**
     * 计算连续签到天数（核心逻辑）。
     * <p>
     * 从指定日期开始往前逐天检查：
     * 1. 如果当天有签到记录，连续天数+1，继续检查前一天
     * 2. 如果当天没有签到记录，中断计数
     * 3. 返回累计的连续天数
     *
     * @param userId 用户 ID
     * @param startDate 起始日期（通常为今天）
     * @return 连续签到天数
     */
    private int calculateConsecutiveDays(Long userId, LocalDate startDate) {
        int streak = 0;
        LocalDate checkDate = startDate;

        // 从起始日期往前逐天检查
        while (true) {
            Optional<CheckIn> checkIn = checkInRepository.findByUserIdAndCheckInDate(userId, checkDate);
            if (checkIn.isPresent()) {
                streak++;
                checkDate = checkDate.minusDays(1);
            } else {
                // 当天没有签到记录，连续中断
                break;
            }
        }

        return streak;
    }

    /**
     * 计算用户累计额外推荐配额。
     * <p>
     * 每次签到成功增加 EXTRA_QUOTA_PER_CHECKIN（3次）额外推荐配额。
     * 此配额仅影响每日推荐限额，不涉及积分或等级系统。
     * <p>
     * 当前实现：基于用户历史签到总次数 * EXTRA_QUOTA_PER_CHECKIN。
     * 后续可替换为更精细的配额追踪机制（如独立表记录消耗情况）。
     *
     * @param userId 用户 ID
     * @return 累计额外推荐配额
     */
    private int calculateTotalExtraQuota(Long userId) {
        // 查询最近一次签到记录，获取其 consecutiveDays 作为基础
        // 简化实现：基于签到记录中的 consecutiveDays 推算总签到次数
        // 更精确的实现应使用独立的配额追踪表
        Optional<CheckIn> latestCheckIn = checkInRepository.findTopByUserIdOrderByCheckInDateDesc(userId);
        if (latestCheckIn.isEmpty()) {
            return 0;
        }

        // 使用最近签到记录的连续天数作为额外配额的计算基础
        // 每次签到（连续中的每一天）都贡献 EXTRA_QUOTA_PER_CHECKIN 配额
        // 注意：这里简化为最近一次签到的连续天数 * 单次奖励
        // 实际业务中可能需要独立追踪已使用/剩余配额
        return latestCheckIn.get().getConsecutiveDays() * checkInConfig.getExtraQuotaPerCheckIn();
    }
}
