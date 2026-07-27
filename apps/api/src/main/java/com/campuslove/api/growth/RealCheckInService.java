package com.campuslove.api.growth;

import com.campuslove.api.config.CheckInConfig;
import com.campuslove.api.entity.CheckIn;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.DailyBenefit;
import com.campuslove.api.entity.MakeUpQuota;
import com.campuslove.api.entity.Post;
import com.campuslove.api.mq.CheckInEventMessage;
import com.campuslove.api.mq.MessageProducer;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.DailyBenefitRepository;
import com.campuslove.api.repository.MakeUpQuotaRepository;
import com.campuslove.api.repository.PostRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
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
 *   <li>功能7 - 补签：补签昨日及之前 7 天内的日期，每月 3 次配额，首次免费</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealCheckInService implements CheckInService {

    private static final Logger log = LoggerFactory.getLogger(RealCheckInService.class);

    /** 补签日期范围：仅可补签昨日及之前 7 天内的日期 */
    private static final int MAKE_UP_MAX_DAYS_BACK = 7;

    /** 年月格式（yyyy-MM），用于补签配额按月统计 */
    private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    private final CheckInConfig checkInConfig;

    private final CheckInRepository checkInRepository;

    private final DailyBenefitRepository dailyBenefitRepository;

    private final PostRepository postRepository;

    private final CircleTopicRepository circleTopicRepository;

    private final CircleMembershipRepository circleMembershipRepository;

    /** 功能7：补签配额数据访问层 */
    private final MakeUpQuotaRepository makeUpQuotaRepository;

    /**
     * 消息生产者，用于异步推送签到事件通知。
     * <p>签到成功后通过 MQ 异步推送通知（微信订阅消息、通知持久化等），
     * 避免阻塞签到主流程。MQ 不可用时由 MessageProducer 降级处理。</p>
     */
    private final MessageProducer messageProducer;

    /**
     * 构造函数，注入签到记录和签到权益相关 Repository。
     *
     * @param checkInConfig              签到配置
     * @param checkInRepository          签到记录数据访问层
     * @param dailyBenefitRepository     签到权益数据访问层
     * @param postRepository             村口帖子数据访问层
     * @param circleTopicRepository      圈子话题数据访问层
     * @param circleMembershipRepository 圈子成员数据访问层
     * @param makeUpQuotaRepository      补签配额数据访问层（功能7）
     * @param messageProducer            消息生产者（异步推送签到事件通知）
     */
    public RealCheckInService(CheckInConfig checkInConfig,
                              CheckInRepository checkInRepository,
                              DailyBenefitRepository dailyBenefitRepository,
                              PostRepository postRepository,
                              CircleTopicRepository circleTopicRepository,
                              CircleMembershipRepository circleMembershipRepository,
                              MakeUpQuotaRepository makeUpQuotaRepository,
                              MessageProducer messageProducer) {
        this.checkInConfig = checkInConfig;
        this.checkInRepository = checkInRepository;
        this.dailyBenefitRepository = dailyBenefitRepository;
        this.postRepository = postRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.makeUpQuotaRepository = makeUpQuotaRepository;
        this.messageProducer = messageProducer;
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
            int consecutiveDays = existingCheckIn.orElseThrow(() ->
                    new IllegalStateException("existingCheckIn 已确认非空但 orElseThrow 触发，数据不一致")).getConsecutiveDays();
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

        // 通过 MQ 异步推送签到事件通知（签到成功通知、连续签到达成奖励通知等），
        // 避免同步调用外部微信 API 阻塞签到主流程。MQ 不可用时由 MessageProducer 降级处理。
        messageProducer.sendCheckInEvent(new CheckInEventMessage(
                userId,
                consecutiveDays,
                checkInConfig.getExtraQuotaPerCheckIn(),
                Instant.now()));

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

    /**
     * 功能7：签到补签。
     * <p>
     * 业务规则校验：
     * 1. userId 非空
     * 2. date 格式合法（yyyy-MM-dd，由 @Valid 已校验，此处兜底解析）
     * 3. date 必须在昨日及之前 7 天内（不可补签当天/未来/超出 7 天）
     * 4. date 当天不能已有签到记录
     * 5. 当月补签次数未超上限（默认 3 次）
     *
     * 流程：
     * 1. 校验日期范围与已签到状态
     * 2. 获取或创建当月配额记录（MakeUpQuota）
     * 3. 计算补签消耗积分（首次免费，其后 50 积分）
     * 4. 创建 CheckIn 记录，source=MAKE_UP
     * 5. 配额记录 used_count+1
     * 6. 返回补签结果视图
     *
     * @param userId 用户 ID
     * @param date   补签日期（yyyy-MM-dd）
     * @return 补签结果视图
     * @throws IllegalArgumentException 日期无效、超出范围、已签到过、超出月配额时抛出
     */
    @Override
    @Transactional
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

        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(MAKE_UP_MAX_DAYS_BACK);

        // 校验：不可补签当天或未来日期
        if (!targetDate.isBefore(today)) {
            throw new IllegalArgumentException("补签日期必须早于今天");
        }
        // 校验：不可补签超过 7 天前的日期
        if (targetDate.isBefore(sevenDaysAgo)) {
            throw new IllegalArgumentException("仅可补签昨日及之前 " + MAKE_UP_MAX_DAYS_BACK + " 天内的日期");
        }

        // 校验：该日期不能已有签到记录
        Optional<CheckIn> existing = checkInRepository.findByUserIdAndCheckInDate(userId, targetDate);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("该日期已签到，无法重复补签");
        }

        // 获取或创建当月配额记录
        String yearMonth = targetDate.format(YEAR_MONTH_FORMATTER);
        MakeUpQuota quota = makeUpQuotaRepository
                .findByUserIdAndYearMonth(userId, yearMonth)
                .orElseGet(() -> {
                    MakeUpQuota newQuota = new MakeUpQuota();
                    newQuota.setUserId(userId);
                    newQuota.setYearMonth(yearMonth);
                    newQuota.setUsedCount(0);
                    newQuota.setLimitCount(MakeUpQuota.DEFAULT_LIMIT);
                    newQuota.setUpdatedAt(LocalDateTime.now());
                    return makeUpQuotaRepository.save(newQuota);
                });

        // 校验：当月补签次数是否已用完
        if (quota.getUsedCount() >= quota.getLimitCount()) {
            throw new IllegalArgumentException(
                    "本月补签次数已用完（上限 " + quota.getLimitCount() + " 次）");
        }

        // 计算消耗积分：首次补签免费（used_count=0 时为首次），其后每次 50 积分
        int costPoints = quota.getUsedCount() == 0 ? 0 : MakeUpQuota.COST_POINTS_AFTER_FREE;

        // 计算补签后的连续签到天数
        // 补签后，从今天开始往前逐天检查，遇到补签日期会视为已签到
        // 但补签日期本身不影响今天的连续天数计算，仅在补签日期处视为签到
        // 此处采用「补签后重新计算连续天数」的策略：补签日期会作为已签到日期参与计数
        int consecutiveDays = calculateConsecutiveDaysAfterMakeUp(userId, today, targetDate);

        // 创建补签记录
        CheckIn makeUpCheckIn = new CheckIn();
        makeUpCheckIn.setUserId(userId);
        makeUpCheckIn.setCheckInDate(targetDate);
        makeUpCheckIn.setConsecutiveDays(consecutiveDays);
        makeUpCheckIn.setSource(CheckIn.SOURCE_MAKE_UP);
        makeUpCheckIn.setCreatedAt(LocalDateTime.now());

        try {
            checkInRepository.save(makeUpCheckIn);
            log.info("用户[{}]补签日期[{}]成功，source=MAKE_UP", userId, targetDate);
        } catch (DataIntegrityViolationException e) {
            // 并发补签同一日期，唯一约束冲突
            log.warn("用户[{}]补签日期[{}]时发生唯一约束冲突", userId, targetDate, e);
            throw new IllegalArgumentException("该日期已签到，无法重复补签");
        }

        // 配额记录 used_count+1
        quota.setUsedCount(quota.getUsedCount() + 1);
        quota.setUpdatedAt(LocalDateTime.now());
        makeUpQuotaRepository.save(quota);

        return new MakeUpCheckInResultView(
                true,
                date,
                consecutiveDays,
                quota.getUsedCount(),
                quota.getLimitCount(),
                costPoints
        );
    }

    /**
     * 计算补签后的连续签到天数。
     * <p>
     * 补签日期会被视为已签到，参与连续天数计算：
     * - 从今天开始往前逐天检查（含今天）
     * - 若当天有签到记录（含补签），连续天数+1，继续检查前一天
     * - 若当天无签到记录，中断计数
     *
     * @param userId     用户 ID
     * @param today      今天
     * @param makeUpDate 补签日期
     * @return 补签后的连续签到天数
     */
    private int calculateConsecutiveDaysAfterMakeUp(Long userId, LocalDate today, LocalDate makeUpDate) {
        int streak = 0;
        LocalDate checkDate = today;

        while (true) {
            Optional<CheckIn> checkIn = checkInRepository.findByUserIdAndCheckInDate(userId, checkDate);
            // 补签日期视为已签到
            if (checkIn.isPresent() || checkDate.equals(makeUpDate)) {
                streak++;
                checkDate = checkDate.minusDays(1);
            } else {
                break;
            }
        }

        return streak;
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
        } catch (DataAccessException e) {
            // 数据库查询失败时忽略，继续统计其他维度
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
        } catch (DataAccessException e) {
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
        } catch (DataAccessException e) {
            // 数据库查询失败时返回 0，不影响签到主流程
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