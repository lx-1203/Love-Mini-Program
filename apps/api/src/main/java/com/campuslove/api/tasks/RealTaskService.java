package com.campuslove.api.tasks;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.TaskClaim;
import com.campuslove.api.profile.ProfileQueryService;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.TaskClaimRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实任务与积分服务实现（3-J 任务与积分，real profile）。
 *
 * <p>完成度数据源：</p>
 * <ul>
 *   <li>daily-checkin：CheckInRepository 连续签到天数（与 RealCheckInService 同算法）</li>
 *   <li>complete-profile：ProfileQueryService.calculateProfileCompletion（资料完善度 0-100）</li>
 *   <li>first-post：PostRepository 有效动态数（status=active）</li>
 *   <li>campus-verify：CampusCertificationRepository 认证状态（APPROVED=达标）</li>
 * </ul>
 *
 * <p>奖励发放：walletService.recharge 入「交友币钱包」（1 积分 = 1 分），
 * 与签到奖励同一账本；领取记录 task_claim 先查后写 +
 * (user_id, task_code, claim_date) 唯一约束防重复领取。</p>
 */
@Profile("real")
@Service
public class RealTaskService implements TaskService {

    private static final Logger log = LoggerFactory.getLogger(RealTaskService.class);

    private static final DateTimeFormatter YYYYMMDD = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final TaskClaimRepository claimRepository;
    private final CheckInRepository checkInRepository;
    private final PostRepository postRepository;
    private final CampusCertificationRepository certificationRepository;
    private final ProfileQueryService profileQueryService;
    private final WalletService walletService;

    public RealTaskService(TaskClaimRepository claimRepository,
                           CheckInRepository checkInRepository,
                           PostRepository postRepository,
                           CampusCertificationRepository certificationRepository,
                           ProfileQueryService profileQueryService,
                           WalletService walletService) {
        this.claimRepository = claimRepository;
        this.checkInRepository = checkInRepository;
        this.postRepository = postRepository;
        this.certificationRepository = certificationRepository;
        this.profileQueryService = profileQueryService;
        this.walletService = walletService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskService.TaskView> listTasks(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        LocalDate today = LocalDate.now(TimeZones.BUSINESS);

        int streak = calculateStreakDays(userId, today);
        int profileCompletion = profileQueryService.calculateProfileCompletion(userId);
        long postCount = postRepository.countByAuthorIdAndStatus(userId, Post.PostStatus.active);
        boolean certified = isCampusCertified(userId);

        boolean dailyClaimed = claimRepository.existsByUserIdAndTaskCodeAndClaimDate(
                userId, TASK_DAILY_CHECKIN, today);
        boolean profileClaimed = claimRepository.existsByUserIdAndTaskCode(userId, TASK_COMPLETE_PROFILE);
        boolean postClaimed = claimRepository.existsByUserIdAndTaskCode(userId, TASK_FIRST_POST);
        boolean verifyClaimed = claimRepository.existsByUserIdAndTaskCode(userId, TASK_CAMPUS_VERIFY);

        return List.of(
                buildView(TASK_DAILY_CHECKIN, "每日签到", "今日完成签到即可领取",
                        REWARD_DAILY_CHECKIN, Math.min(streak, 1), 1, dailyClaimed),
                buildView(TASK_COMPLETE_PROFILE, "完善个人资料", "资料完善度达到 100% 即可领取",
                        REWARD_COMPLETE_PROFILE, profileCompletion, 100, profileClaimed),
                buildView(TASK_FIRST_POST, "发布首条动态", "发布 1 条动态即可领取",
                        REWARD_FIRST_POST, Math.min((int) postCount, 1), 1, postClaimed),
                buildView(TASK_CAMPUS_VERIFY, "完成校园认证", "校园认证通过即可领取",
                        REWARD_CAMPUS_VERIFY, certified ? 1 : 0, 1, verifyClaimed)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public TaskService.TaskProgressView getProgress(Long userId) {
        List<TaskService.TaskView> tasks = listTasks(userId);
        int completedCount = (int) tasks.stream().filter(t -> t.progressCurrent() >= t.progressTarget()).count();
        int claimedCount = (int) tasks.stream().filter(TaskService.TaskView::claimed).count();
        int totalReward = tasks.stream().mapToInt(TaskService.TaskView::rewardPoints).sum();
        int claimedReward = tasks.stream()
                .filter(TaskService.TaskView::claimed)
                .mapToInt(TaskService.TaskView::rewardPoints)
                .sum();
        int percent = totalReward > 0 ? Math.round(claimedReward * 100f / totalReward) : 0;
        return new TaskService.TaskProgressView(
                tasks, completedCount, claimedCount, tasks.size(), claimedReward, totalReward, percent);
    }

    @Override
    @Transactional
    public TaskService.ClaimResultView claim(Long userId, String taskCode) {
        if (userId == null || taskCode == null) {
            throw new IllegalArgumentException("userId and taskCode are required");
        }
        LocalDate today = LocalDate.now(TimeZones.BUSINESS);

        // 1. 解析任务定义（校验编码 + 完成度 + 领取状态）
        TaskDefinition def = resolveTaskDefinition(taskCode, userId, today);

        // 2. 未领取校验（每日任务按当日，一次性任务终身一次）
        boolean alreadyClaimed = def.daily
                ? claimRepository.existsByUserIdAndTaskCodeAndClaimDate(userId, taskCode, today)
                : claimRepository.existsByUserIdAndTaskCode(userId, taskCode);
        if (alreadyClaimed) {
            throw new IllegalArgumentException(ErrorMessages.TASK_ALREADY_CLAIMED);
        }

        // 3. 记录领取（先落记录，与入账同一事务；唯一约束兜底并发重复领取）
        TaskClaim claim = new TaskClaim();
        claim.setUserId(userId);
        claim.setTaskCode(taskCode);
        claim.setClaimDate(def.daily ? today : null);
        claimRepository.saveAndFlush(claim);

        // 4. 发放奖励入「交友币钱包」（1 积分 = 1 分，与签到同一账本）
        //    orderId 幂等：一次性任务固定 TASK-{code}-{userId}；每日任务追加日期
        String orderId = "TASK-" + taskCode + "-" + userId
                + (def.daily ? "-" + today.format(YYYYMMDD) : "");
        long balanceAfter;
        try {
            balanceAfter = walletService.recharge(
                    userId,
                    (long) def.rewardPoints,
                    orderId,
                    WalletTransactionLog.RELATED_TYPE_TASK_REWARD,
                    taskCode);
        } catch (RuntimeException e) {
            log.error("任务奖励入账失败（回滚领取记录）：userId={}, taskCode={}, error={}",
                    userId, taskCode, e.getMessage());
            throw new RuntimeException(ErrorMessages.TASK_REWARD_CREDIT_FAILED, e);
        }

        log.info("任务奖励领取成功：userId={}, taskCode={}, reward={}, balanceAfter={}",
                userId, taskCode, def.rewardPoints, balanceAfter);
        return new TaskService.ClaimResultView(taskCode, def.rewardPoints, balanceAfter);
    }

    // ---- 私有辅助方法 ----

    /**
     * 任务定义（编码 → 名称/描述/奖励/目标/完成度计算/是否每日）。
     */
    private record TaskDefinition(
            String code, String name, String description, int rewardPoints,
            int progressCurrent, int progressTarget, boolean daily) {
        boolean completed() {
            return progressCurrent >= progressTarget;
        }
    }

    private TaskDefinition resolveTaskDefinition(String taskCode, Long userId, LocalDate today) {
        TaskDefinition def = switch (taskCode) {
            case TASK_DAILY_CHECKIN -> new TaskDefinition(taskCode, "每日签到", "今日完成签到即可领取",
                    REWARD_DAILY_CHECKIN, calculateStreakDays(userId, today), 1, true);
            case TASK_COMPLETE_PROFILE -> new TaskDefinition(taskCode, "完善个人资料", "资料完善度达到 100% 即可领取",
                    REWARD_COMPLETE_PROFILE, profileQueryService.calculateProfileCompletion(userId), 100, false);
            case TASK_FIRST_POST -> new TaskDefinition(taskCode, "发布首条动态", "发布 1 条动态即可领取",
                    REWARD_FIRST_POST,
                    (int) Math.min(postRepository.countByAuthorIdAndStatus(userId, Post.PostStatus.active), 1),
                    1, false);
            case TASK_CAMPUS_VERIFY -> new TaskDefinition(taskCode, "完成校园认证", "校园认证通过即可领取",
                    REWARD_CAMPUS_VERIFY, isCampusCertified(userId) ? 1 : 0, 1, false);
            default -> throw new IllegalArgumentException(ErrorMessages.TASK_CODE_UNKNOWN_PREFIX + taskCode);
        };
        if (!def.completed()) {
            throw new IllegalArgumentException(ErrorMessages.TASK_NOT_COMPLETED);
        }
        return def;
    }

    private TaskService.TaskView buildView(String code, String name, String description,
                                           int reward, int progressCurrent, int progressTarget,
                                           boolean claimed) {
        boolean completed = progressCurrent >= progressTarget;
        return new TaskService.TaskView(code, name, description, reward,
                progressCurrent, progressTarget, claimed, completed && !claimed);
    }

    /**
     * 计算连续签到天数（与 RealCheckInService 同算法：从 today 往前逐日判定连续段）。
     */
    private int calculateStreakDays(Long userId, LocalDate startDate) {
        List<LocalDate> dates = checkInRepository.findCheckInDatesBefore(userId, startDate);
        int streak = 0;
        LocalDate expected = startDate;
        for (LocalDate date : dates) {
            if (date.equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * 校园认证是否通过（status=APPROVED）。
     */
    private boolean isCampusCertified(Long userId) {
        Set<String> approved = Set.of("APPROVED");
        return certificationRepository.findByUserId(userId)
                .map(CampusCertification::getStatus)
                .map(approved::contains)
                .orElse(false);
    }
}
