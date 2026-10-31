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
import java.util.concurrent.TimeUnit;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
 * (user_id, task_code, claim_date) 唯一约束防同日重复领取。
 * claim_date 自 Flyway V2026.10.30.0002 起对四类任务一律写业务时区当日（非空）——
 * 该列曾允许 NULL，而 MySQL 唯一索引把 NULL 视为互不相同，
 * 使一次性任务的重复领取护栏形同虚设。</p>
 *
 * <p><b>一次性任务「终身一次」的并发护栏（S2-4，2026-10-31）</b>：
 * claim_date 非空后，{@code uk_task_claim_user_code_date} 只挡<b>同日</b>重复领取；
 * 一次性任务的判定是 {@code existsByUserIdAndTaskCode}（不按日期分片），
 * 而「先查后写」两步之间原先没有任何锁 —— 跨午夜的两次请求（各自的 today 不同）、
 * 或双击并发，都能通过检查、各插一行、各调一次 recharge，即重复发奖。
 * 现按 (user, taskCode) 取 Redisson 分布式锁，并<b>在事务提交之后</b>才释放
 * （{@link TransactionSynchronization#afterCompletion}，与
 * {@code AutoRenewService} 的 R4-00317 同一实现口径：在代理层提交前释放锁等于把
 * 竞态窗口原样 reopen，第二个请求会读到尚未提交的空结果）。</p>
 *
 * <p>资金兜底不止靠锁：一次性任务的 recharge 幂等键是固定不含日期的
 * {@code TASK-{taskCode}-{userId}}，由 {@code wallet_transaction_log.order_id}
 * 唯一索引 + {@code WalletServiceImpl} 的冲突回滚分支兜底 —— 即使 Redis 整体不可用
 * 或锁租约到期中断，也不会二次入账；锁的职责是把「查—写—发奖」整段串行化，
 * 让失败的一方拿到业务语义的 {@code TASK_ALREADY_CLAIMED}（400）而不是幽灵领取行/500。</p>
 */
@Profile("real")
@Service
public class RealTaskService implements TaskService {

    private static final Logger log = LoggerFactory.getLogger(RealTaskService.class);

    private static final DateTimeFormatter YYYYMMDD = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** 领取锁等待上限（秒）：拿不到即判定「已有领取在途」，按已领取口径拒绝，不排队堆积 */
    private static final long CLAIM_LOCK_WAIT_SECONDS = 5L;

    /**
     * 领取锁租约（秒）：必须显著大于「查完成度 + 落领取行 + 钱包入账」的单次事务耗时，
     * 否则锁在提交前自动释放，竞态窗口重新打开（AutoRenewService 同参数取档）。
     */
    private static final long CLAIM_LOCK_LEASE_SECONDS = 30L;

    private final TaskClaimRepository claimRepository;
    private final CheckInRepository checkInRepository;
    private final PostRepository postRepository;
    private final CampusCertificationRepository certificationRepository;
    private final ProfileQueryService profileQueryService;
    private final WalletService walletService;
    /**
     * 领取并发护栏（S2-4）。real profile 下该 bean 恒存在
     * （{@code RedisConfig} 提供，{@code AutoRenewService} 同样硬依赖它），
     * 为 null 只可能是走了下方那个测试用构造器。
     */
    private final RedissonClient redissonClient;

    @Autowired
    public RealTaskService(TaskClaimRepository claimRepository,
                           CheckInRepository checkInRepository,
                           PostRepository postRepository,
                           CampusCertificationRepository certificationRepository,
                           ProfileQueryService profileQueryService,
                           WalletService walletService,
                           RedissonClient redissonClient) {
        this.claimRepository = claimRepository;
        this.checkInRepository = checkInRepository;
        this.postRepository = postRepository;
        this.certificationRepository = certificationRepository;
        this.profileQueryService = profileQueryService;
        this.walletService = walletService;
        this.redissonClient = redissonClient;
    }

    /**
     * 无锁构造器（仅供既有单元测试与旧装配使用，S2-4 之前的签名）。
     *
     * <p>Spring 装配走上面那个 {@code @Autowired} 构造器；本构造器把
     * {@code redissonClient} 置 null，此时 {@link #claim} 退化为
     * 「先查后写 + 钱包幂等键」的旧行为并打一条 warn，绝不静默假装已加锁。</p>
     */
    public RealTaskService(TaskClaimRepository claimRepository,
                           CheckInRepository checkInRepository,
                           PostRepository postRepository,
                           CampusCertificationRepository certificationRepository,
                           ProfileQueryService profileQueryService,
                           WalletService walletService) {
        this(claimRepository, checkInRepository, postRepository, certificationRepository,
                profileQueryService, walletService, null);
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

        // 0. 并发护栏（S2-4）：同一 (user, taskCode) 的「判重 → 落领取行 → 发奖」整段串行化。
        //    锁必须在 existsByUserIdAndTaskCode 这次「读」之前拿，
        //    并在事务提交之后才放（见 lockClaim 的 afterCompletion 注册）——
        //    否则跨午夜的两次「一次性任务」领取、或双击并发，会同时读到空结果并各发一次奖。
        ClaimLock claimLock = lockClaim(userId, taskCode);
        try {
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
            // claim_date 一律落业务时区当日（与上面防重查询用的 today 同一口径，Flyway V2026.10.30.0002
            // 起该列 NOT NULL）：旧写法对一次性任务写 NULL，而 InnoDB 唯一索引里 NULL 彼此不相等，
            // uk_task_claim_user_code_date 对一次性任务完全不设防，并发双击可重复入账发奖。
            // 一次性任务的「终身一次」由第 0 步的锁 + 第 2 步 existsByUserIdAndTaskCode（不按日期分片）
            // 保证；本列非空后唯一键额外补上「同日并发重复领取」的数据库护栏。
            claim.setClaimDate(today);
            claimRepository.saveAndFlush(claim);

            // 4. 发放奖励入「交友币钱包」（1 积分 = 1 分，与签到同一账本）
            //    orderId 幂等：一次性任务固定 TASK-{code}-{userId}（不含日期 ⇒ 跨天重放也撞同一幂等键）；
            //    每日任务追加日期，故次日可再领。
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
        } finally {
            claimLock.releaseUnlessDeferred();
        }
    }

    // ---- 并发护栏（S2-4）----

    /**
     * 领取锁的句柄：持有锁与「锁是否已交由事务同步释放」两个事实。
     *
     * @param lock 已持有的 RLock（未加锁 / 无 RedissonClient 时为 null）
     * @param lockKey 日志用的锁名
     * @param deferredToTransaction true 表示释放动作已注册到
     *        {@link TransactionSynchronization#afterCompletion(int)}，
     *        必须等事务提交/回滚后才放（提前放等于把竞态窗口重新打开）
     */
    private record ClaimLock(RLock lock, String lockKey, boolean deferredToTransaction) {

        /** 未被事务接手的锁，在方法退出时立即释放；已交由事务同步的这里什么都不做。 */
        void releaseUnlessDeferred() {
            if (lock == null || deferredToTransaction) {
                return;
            }
            releaseQuietly(lock, lockKey);
        }

        private static final ClaimLock NO_LOCK = new ClaimLock(null, null, false);
    }

    /**
     * 取 (user, taskCode) 的分布式锁。
     *
     * <p>行为：</p>
     * <ul>
     *   <li>无 RedissonClient（仅测试构造器可能）→ 记一条 warn 后不加锁，
     *       行为退回 S2-4 之前（钱包幂等键仍是资金底线）；</li>
     *   <li>{@code tryLock} 等待超时 → 已有同 (user, taskCode) 的领取在途，
     *       按「已领取」同一业务语义拒绝（HTTP 400，与重复领取同码同文案），
     *       不给调用方 500、也不发第二份奖；</li>
     *   <li>取到锁 → 注册 {@code afterCompletion} 在事务结束后释放（R4-00317 口径）；
     *       无活动事务（理论不发生，claim 经代理调用必有事务）时退化为方法返回即释放；</li>
     *   <li>线程被打断 → 复位中断标志后按「已有领取在途」拒绝（fail-closed，不发奖）。</li>
     * </ul>
     *
     * @param userId   领取用户
     * @param taskCode 任务编码
     * @return 锁句柄（可能表示「未加锁」）
     */
    private ClaimLock lockClaim(Long userId, String taskCode) {
        if (redissonClient == null) {
            log.warn("任务领取未启用分布式锁（无 RedissonClient，仅测试装配可能出现）："
                    + "userId={}, taskCode={} —— 资金底线为钱包 orderId 幂等键，并发防重降级", userId, taskCode);
            return ClaimLock.NO_LOCK;
        }
        String lockKey = "task-claim:" + userId + ":" + taskCode;
        RLock lock = redissonClient.getLock(lockKey);
        boolean locked;
        try {
            locked = lock.tryLock(CLAIM_LOCK_WAIT_SECONDS, CLAIM_LOCK_LEASE_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("任务领取等待锁被中断：userId={}, taskCode={}", userId, taskCode);
            throw new IllegalArgumentException(ErrorMessages.TASK_ALREADY_CLAIMED);
        } catch (RuntimeException e) {
            // Redis 侧异常：宁可不发奖也不放开并发（fail-closed）。
            // 复用既有的「发放失败，请稍后重试」文案：本次确实没发奖，且 400 而非 500。
            log.error("任务领取加锁异常，拒绝本次领取：userId={}, taskCode={}, error={}",
                    userId, taskCode, e.getMessage());
            throw new IllegalArgumentException(ErrorMessages.TASK_REWARD_CREDIT_FAILED, e);
        }
        if (!locked) {
            log.warn("任务领取并发拦截：已有同一 (user, taskCode) 的领取在执行："
                    + "userId={}, taskCode={}", userId, taskCode);
            throw new IllegalArgumentException(ErrorMessages.TASK_ALREADY_CLAIMED);
        }
        boolean deferred = false;
        try {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    releaseQuietly(lock, lockKey);
                }
            });
            deferred = true;
        } catch (IllegalStateException e) {
            // 无活动事务（防御分支）：退化为 finally 立即释放
            log.warn("无活动事务，任务领取锁退化为方法返回时释放：lockKey={}", lockKey);
        }
        return new ClaimLock(lock, lockKey, deferred);
    }

    /**
     * 安静释放锁：仅当前线程持有时释放，异常只记日志（回调/finally 环境不传播异常）。
     * 与 {@code AutoRenewService#releaseLockQuietly} 同一处置——租约到期后
     * {@code unlock()} 会抛 IllegalMonitorStateException，那不是业务失败。
     */
    private static void releaseQuietly(RLock lock, String lockKey) {
        try {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.debug("任务领取锁已释放（事务结束后）：lockKey={}", lockKey);
            }
        } catch (IllegalMonitorStateException e) {
            log.debug("任务领取锁已被租约释放：lockKey={}", lockKey);
        } catch (RuntimeException e) {
            log.warn("释放任务领取锁异常（不影响业务结果）：lockKey={}, error={}", lockKey, e.getMessage());
        }
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
