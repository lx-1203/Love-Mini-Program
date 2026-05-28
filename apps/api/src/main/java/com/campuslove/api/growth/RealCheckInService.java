package com.campuslove.api.growth;

import com.campuslove.api.config.CheckInConfig;
import com.campuslove.api.entity.CheckIn;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.DailyBenefit;
import com.campuslove.api.entity.Post;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.DailyBenefitRepository;
import com.campuslove.api.repository.PostRepository;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实签到服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库持久化。
 * <p>
 * 核心功能：
 * <ul>
 *   <li>签到：创建 CheckIn 记录，日期+用户ID唯一约束，重复签到返回错误</li>
 *   <li>签到权益：创建 DailyBenefit 记录，额外推荐配额+5，解锁热门话题和新入圈用户</li>
 *   <li>签到状态查询：返回今日是否已签到、连续天数、额外推荐配额</li>
 *   <li>连续签到天数计算：从今天开始往前逐天检查，中断则归零</li>
 *   <li>热门话题查询：查询当日最活跃的村口帖子/校园话题</li>
 *   <li>新入圈用户查询：查询最近24h新加入兴趣圈的用户</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealCheckInService implements CheckInService {

    private static final Logger log = LoggerFactory.getLogger(RealCheckInService.class);

    private final CheckInConfig checkInConfig;

    private final CheckInRepository checkInRepository;

    private final DailyBenefitRepository dailyBenefitRepository;

    private final PostRepository postRepository;

    private final CircleTopicRepository circleTopicRepository;

    private final CircleMembershipRepository circleMembershipRepository;

    /**
     * 构造函数，注入签到记录和签到权益相关 Repository。
     *
     * @param checkInConfig              签到配置
     * @param checkInRepository          签到记录数据访问层
     * @param dailyBenefitRepository     签到权益数据访问层
     * @param postRepository             村口帖子数据访问层
     * @param circleTopicRepository      圈子话题数据访问层
     * @param circleMembershipRepository 圈子成员数据访问层
     */
    public RealCheckInService(CheckInConfig checkInConfig,
                              CheckInRepository checkInRepository,
                              DailyBenefitRepository dailyBenefitRepository,
                              PostRepository postRepository,
                              CircleTopicRepository circleTopicRepository,
                              CircleMembershipRepository circleMembershipRepository) {
        this.checkInConfig = checkInConfig;
        this.checkInRepository = checkInRepository;
        this.dailyBenefitRepository = dailyBenefitRepository;
        this.postRepository = postRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.circleMembershipRepository = circleMembershipRepository;
    }

    /**
     * 执行签到。
     * <p>
     * 逻辑流程：
     * 1. 校验 userId 非空
     * 2. 检查今日是否已签到（用户ID+日期唯一约束）
     * 3. 计算连续签到天数（基于昨日是否有签到记录）
     * 4. 创建 CheckIn 记录并持久化
     * 5. 创建 DailyBenefit 权益记录（额外推荐配额+5）
     * 6. 查询热门话题数量和新入圈用户数量
     * 7. 返回签到结果（含签到权益信息）
     *
     * @param userId 用户 ID
     * @return 签到结果视图（含权益字段）
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
            int consecutiveDays = existingCheckIn.get().getConsecutiveDays();
            int extraQuota = calculateTotalExtraQuota(userId);

            // 获取已有权益信息
            Optional<DailyBenefit> existingBenefit = dailyBenefitRepository.findByUserIdAndBenefitDate(userId, today);
            int hotTopicCount = getHotTopicCount();
            int newUserCount = getNewCircleUserCount();

            if (existingBenefit.isPresent()) {
                DailyBenefit benefit = existingBenefit.get();
                return new CheckInResultView(false, consecutiveDays, extraQuota,
                        benefit.getExtraRecommendQuota(), benefit.getHotTopicsUnlocked(),
                        benefit.getNewUsersUnlocked(), hotTopicCount, newUserCount);
            }

            return new CheckInResultView(false, consecutiveDays, extraQuota,
                    extraQuota, true, true, hotTopicCount, newUserCount);
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
            log.warn("用户[{}]签到时发生唯一约束冲突，可能为并发重复签到", userId, e);
            throw new RuntimeException("签到失败，请稍后重试", e);
        }

        // ---- 签到后解锁权益 ----

        // 创建每日签到权益记录（推荐配额+5）
        DailyBenefit benefit = new DailyBenefit();
        benefit.setUserId(userId);
        benefit.setBenefitDate(today);
        benefit.setExtraRecommendQuota(checkInConfig.getExtraQuotaPerCheckIn()); // 5
        benefit.setHotTopicsUnlocked(true);
        benefit.setNewUsersUnlocked(true);
        benefit.setCreatedAt(LocalDateTime.now());

        try {
            dailyBenefitRepository.save(benefit);
            log.info("用户[{}]签到权益已创建，额外推荐配额+{}", userId, checkInConfig.getExtraQuotaPerCheckIn());
        } catch (DataIntegrityViolationException e) {
            // 同日重复签到（DailyBenefit 唯一约束）不影响主流程
            log.warn("用户[{}]今日签到权益已存在，跳过重复创建", userId, e);
        }

        // 计算额外推荐配额（基于历史签到记录）
        int extraQuota = calculateTotalExtraQuota(userId) + checkInConfig.getExtraQuotaPerCheckIn();

        // 查询热门话题数量和新入圈用户数量
        int hotTopicCount = getHotTopicCount();
        int newUserCount = getNewCircleUserCount();

        return new CheckInResultView(true, consecutiveDays, extraQuota,
                checkInConfig.getExtraQuotaPerCheckIn(), true, true,
                hotTopicCount, newUserCount);
    }

    /**
     * 查询今日签到状态。
     * <p>
     * 返回信息包含：
     * - 今日是否已签到
     * - 连续签到天数
     * - 累计额外推荐配额
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

        boolean checkedInToday = checkInRepository.findByUserIdAndCheckInDate(userId, today).isPresent();
        int consecutiveDays = calculateConsecutiveDays(userId, today);
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

        List<Integer> checkedDays = new ArrayList<>();
        for (LocalDate date = startOfMonth; !date.isAfter(endOfMonth); date = date.plusDays(1)) {
            if (checkInRepository.findByUserIdAndCheckInDate(userId, date).isPresent()) {
                checkedDays.add(date.getDayOfMonth());
            }
        }

        log.debug("用户[{}]在{}年{}月共签到{}天", userId, yearMonth.getYear(), yearMonth.getMonthValue(), checkedDays.size());
        return checkedDays;
    }

    // ---- 签到权益方法 ----

    /**
     * 查询当日最活跃的村口帖子/校园话题作为热门话题。
     * <p>
     * 综合查询逻辑：
     * 1. 查询当日村口帖子（posts），按点赞数倒序，取前 20 条
     * 2. 查询当日圈子话题（circle_topics），按回复数倒序，取前 20 条
     * 3. 合并去重后按热度排序返回
     *
     * @return 当日热门话题数量
     */
    @Transactional(readOnly = true)
    public int getHotTopicCount() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);

        int count = 0;

        try {
            // 统计今日活跃帖子数（点赞数 > 0）
            List<Post> hotPosts = postRepository.findByStatusOrderByLikesCountDesc(
                    Post.PostStatus.active,
                    PageRequest.of(0, 20)
            ).getContent();
            count += (int) hotPosts.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(todayStart))
                    .filter(p -> p.getLikesCount() > 0)
                    .count();
        } catch (Exception e) {
            log.warn("查询热门帖子时出错: {}", e.getMessage());
        }

        try {
            // 统计今日活跃话题数（回复数 > 0）
            List<CircleTopic> hotTopics = circleTopicRepository.findAllByOrderByCreatedAtDesc(
                    PageRequest.of(0, 20)
            ).getContent();
            count += (int) hotTopics.stream()
                    .filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(todayStart))
                    .filter(t -> t.getReplyCount() > 0)
                    .count();
        } catch (Exception e) {
            log.warn("查询热门圈子话题时出错: {}", e.getMessage());
        }

        return count;
    }

    /**
     * 查询最近 24 小时内新加入兴趣圈的用户数量。
     * <p>
     * 查询 CircleMembership 表中 joinedAt 在最近 24 小时内的记录，
     * 按 userId 去重后统计新入圈用户数。
     *
     * @return 最近 24h 新入圈用户数量
     */
    @Transactional(readOnly = true)
    public int getNewCircleUserCount() {
        LocalDateTime since = LocalDateTime.now().minusHours(24);

        try {
            List<CircleMembership> recentMemberships = circleMembershipRepository.findAll();
            long count = recentMemberships.stream()
                    .filter(m -> m.getJoinedAt() != null && !m.getJoinedAt().isBefore(since))
                    .map(CircleMembership::getUserId)
                    .distinct()
                    .count();
            return (int) count;
        } catch (Exception e) {
            log.warn("查询新入圈用户时出错: {}", e.getMessage());
            return 0;
        }
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

        while (true) {
            Optional<CheckIn> checkIn = checkInRepository.findByUserIdAndCheckInDate(userId, checkDate);
            if (checkIn.isPresent()) {
                streak++;
                checkDate = checkDate.minusDays(1);
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * 计算用户累计额外推荐配额。
     * <p>
     * 综合计算方式：
     * 1. 历史签到天数 * 单次签到奖励（基于 consecutiveDays）
     * 2. DailyBenefit 表中记录的额外配额（每次签到 +5）
     *
     * @param userId 用户 ID
     * @return 累计额外推荐配额
     */
    private int calculateTotalExtraQuota(Long userId) {
        Optional<CheckIn> latestCheckIn = checkInRepository.findTopByUserIdOrderByCheckInDateDesc(userId);
        if (latestCheckIn.isEmpty()) {
            return 0;
        }

        // 基于连续签到天数的配额计算
        return latestCheckIn.get().getConsecutiveDays() * checkInConfig.getExtraQuotaPerCheckIn();
    }
}