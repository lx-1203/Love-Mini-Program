package com.campuslove.api.vip;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.entity.VipBillingLog;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.wallet.InsufficientBalanceException;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * VIP 自动续费服务。
 * <p>提供自动续费开关的查询、开启、关闭等业务逻辑。
 * 开启后，VIP 到期前 24 小时自动扣款续费。</p>
 *
 * <p>定价与权益时长（P0-3 A）：续费扣款金额与顺延天数一律来自
 * {@link VipPlanCatalog}，按「订阅的 planId」查目录得出——
 * 本类不再持有任何金额/天数常量。订阅的套餐身份取自最近一笔
 * {@code status=SUCCESS 且 period_end 非空} 的 {@code vip_bills} 快照
 * （项目无订阅计划表、{@code users} 表也没有续费套餐列，且本次禁止新增迁移）；
 * 该快照只读：续费只顺延 {@code period_end}，绝不改写历史成交金额/原价/套餐名。</p>
 *
 * <p>fail-closed：找不到可续费订阅、订阅套餐为空白/目录外/已下架时，
 * 拒绝续费——不产生任何钱包交易、不新建账单，仅写一条金额为 0 的 FAILED 流水
 * （0 表示本次未发生扣款，便于对账区分「尝试过但失败」与「未尝试」）。</p>
 *
 * <p>事务处理：所有写操作使用 @Transactional 保证原子性。
 * 状态查询使用只读事务以优化性能。</p>
 *
 * <p>并发控制（Task 12.2）：自动续费方法使用 Redisson 分布式锁
 * （key = auto-renew:{userId}），保证同一用户同时只有一个续费流程执行，
 * 避免定时任务重复触发或用户手动续费与定时任务并发导致多扣费。
 * 锁超时 30 秒，避免持锁线程崩溃导致死锁。</p>
 *
 * <p>对账支持（Task 12.2）：每次续费（无论成功/失败）写入 vip_billing_log 流水，
 * 用于核对支付渠道侧扣款与系统侧续费次数是否一致。</p>
 *
 * <p>错误处理：用户不存在等异常抛出 IllegalArgumentException，
 * 由 GlobalExceptionHandler 统一转换为 400 响应。
 * 数据库操作异常被捕获后包装为 RuntimeException 抛出，避免泄漏堆栈。</p>
 */
@Profile("real")
@Service
public class AutoRenewService {

    private static final Logger log = LoggerFactory.getLogger(AutoRenewService.class);

    /**
     * 分布式锁超时时间（秒）。
     * <p>30 秒覆盖单次续费流程（DB 写入 + 调用支付渠道）的正常耗时，
     * 超时后锁自动释放，避免持锁线程崩溃导致死锁。</p>
     */
    private static final long LOCK_TIMEOUT_SECONDS = 30L;

    /**
     * 分布式锁等待时间（秒）。
     * <p>等待 5 秒后仍未获取锁则放弃，避免定时任务线程长时间阻塞。
     * 同一用户重复触发续费时，后到的请求快速失败而不是堆积。</p>
     */
    private static final long LOCK_WAIT_SECONDS = 5L;

    /**
     * 未产生（或无法确定）扣款额的流水金额（分）。
     * <p>P0-3：目录无法给出套餐价时不得沿用任何硬编码价，
     * FAILED 流水以 0 记账，明确表示本次没有扣款。</p>
     */
    private static final int NO_CHARGE_AMOUNT_CENTS = 0;

    /** 续费流水状态：失败。FAILED 走独立事务落库，见 {@link #writeBillingLog}。 */
    private static final String STATUS_FAILED = "FAILED";

    /**
     * 续费结果状态：本周期已续费（幂等命中），未再次扣款、未再次顺延权益。
     * 既不是成功续费也不是失败，扫描统计单独计入 skipped。
     */
    private static final String STATUS_SKIPPED = "SKIPPED";

    /**
     * 续费幂等键里的到期日精度（秒）：足够区分同一套餐的相邻周期，
     * 又不至于因为写入时的毫秒截断而漂移。
     */
    private static final DateTimeFormatter RENEWAL_KEY_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final UserRepository userRepository;
    private final VipBillingLogRepository vipBillingLogRepository;
    /**
     * VIP 账单 Repository（FIN HIGH-10 新增，R4-00347 改构造器注入）。
     *
     * <p>两个职责：① 扣款成功后延长 {@code vip_bills.period_end}（VIP 有效期结束时间）；
     * ② P0-3：读取订阅的 {@code plan_id} 快照作为续费目录查询键。</p>
     */
    private final VipBillRepository vipBillRepository;
    private final RedissonClient redissonClient;
    /**
     * Task 2（FIN-00003）：钱包服务，用于真实扣减用户余额。
     *
     * <p>替代前序版本中"仅记录日志未扣费"的 mock 逻辑，
     * 现在每次续费都会调用 {@link WalletService#deduct} 真实扣减月费，
     * 余额不足时捕获 {@link InsufficientBalanceException} 写 FAILED 流水并通知用户。</p>
     */
    private final WalletService walletService;
    /**
     * VIP 套餐目录（P0-3 A：续费定价与权益时长的唯一来源，与两条购买链路同一颗 bean）。
     */
    private final VipPlanCatalog planCatalog;

    /**
     * 自引用代理（R4-00316）。
     *
     * <p>Spring AOP 基于代理，同一 Bean 内部方法调用不经过代理：
     * 定时扫描任务 {@link #runRenewScan} 必须通过本代理调用 {@link #renewVip}，
     * 否则 {@code @Transactional} 失效、无活动事务时
     * {@link TransactionSynchronizationManager#registerSynchronization} 会抛异常
     * （R4-00317 锁边界修复依赖事务存在）。</p>
     */
    @Lazy
    @Autowired
    private AutoRenewService self;

    /**
     * 自动续费扫描窗口（小时）：VIP 距到期 24 小时内触发续费（含已过期）。
     */
    private static final long RENEW_WINDOW_HOURS = 24L;

    public AutoRenewService(UserRepository userRepository,
                            VipBillingLogRepository vipBillingLogRepository,
                            VipBillRepository vipBillRepository,
                            RedissonClient redissonClient,
                            WalletService walletService,
                            VipPlanCatalog planCatalog) {
        this.userRepository = userRepository;
        this.vipBillingLogRepository = vipBillingLogRepository;
        this.vipBillRepository = vipBillRepository;
        this.redissonClient = redissonClient;
        this.walletService = walletService;
        this.planCatalog = planCatalog;
    }

    /**
     * 自动续费定时扫描（R4-00316）。
     *
     * <p>每 6 小时执行一次：扫描全部开启自动续费的用户，对「VIP 距到期 24 小时
     * 内（含已过期）」的用户逐个触发 {@link #renewVip}（经 self 代理保证事务生效）。
     * 单用户续费失败（余额不足等）仅记录日志，不阻断其他用户。</p>
     *
     * <p>幂等说明：续费成功后 VIP 到期时间按目录套餐天数顺延（月 30 / 季 90 / 年 365），
     * 自然移出扫描窗口，不会因每 6 小时扫描而重复扣费；失败用户留在窗口内下次重试
     * （失败不扣费）。订阅套餐无法按目录定价的用户同样留在「不扣款」一侧，
     * 直到其订阅数据被修正或下架套餐重新可售（fail-closed，不猜测金额）。</p>
     *
     * @return 扫描结果汇总（scanned 扫描数 / renewed 续费成功数 / failed 失败数 / skipped 幂等跳过数）
     */
    public RenewScanResult runRenewScan() {
        List<User> users;
        try {
            users = userRepository.findByAutoRenewEnabledTrue();
        } catch (DataAccessException e) {
            log.error("自动续费扫描查询用户失败：{}", e.getMessage());
            return new RenewScanResult(0, 0, 0, 0);
        }
        int scanned = 0;
        int renewed = 0;
        int failed = 0;
        int skipped = 0;
        for (User user : users) {
            if (!isVipExpiringSoon(user.getId())) {
                continue;
            }
            scanned++;
            try {
                RenewResultView result = self.renewVip(user.getId());
                if ("SUCCESS".equals(result.status())) {
                    renewed++;
                } else if (STATUS_SKIPPED.equals(result.status())) {
                    // 本周期已扣过款：既不算新续费，也不算失败。skipped>0 说明并发/锁失效
                    // 真实发生过，只是被幂等键拦住了——这是"避免了一次双扣"的证据。
                    skipped++;
                    log.info("自动续费扫描：用户 {} 本周期已续费，幂等跳过：orderNo={}",
                            user.getId(), result.orderNo());
                } else {
                    failed++;
                    log.info("自动续费扫描：用户 {} 续费未成功：status={}, message={}",
                            user.getId(), result.status(), result.message());
                }
            } catch (RuntimeException e) {
                failed++;
                log.warn("自动续费扫描：用户 {} 续费异常：{}", user.getId(), e.getMessage());
            }
        }
        log.info("自动续费扫描完成：scanned={}, renewed={}, failed={}, skipped={}",
                scanned, renewed, failed, skipped);
        return new RenewScanResult(scanned, renewed, failed, skipped);
    }

    /**
     * 定时调度入口（R4-00316）。
     * 每 6 小时执行一次。2026-08-09 修复：Spring 不允许 cron 触发器携带 initialDelay
     * （"initialDelay not supported for cron triggers" 启动失败），首次延迟语义由
     * 应用就绪后首次立即执行兜底（扫描本身幂等，见方法内注释）。
     */
    @Scheduled(cron = "0 0 */6 * * *")
    public void scheduledRenewScan() {
        runRenewScan();
    }

    /**
     * 判断用户 VIP 是否处于续费窗口（距到期 24 小时内，含已过期）。
     *
     * <p>以最近一笔 SUCCESS 账单的 periodEnd 为 VIP 到期时间；无 SUCCESS 账单
     * （从未开通 VIP）时不触发。</p>
     */
    private boolean isVipExpiringSoon(Long userId) {
        try {
            List<VipBill> bills = vipBillRepository.findByUserIdOrderByCreatedAtDesc(userId);
            if (bills == null || bills.isEmpty()) {
                return false;
            }
            LocalDateTime windowEnd = LocalDateTime.now(TimeZones.BUSINESS).plusHours(RENEW_WINDOW_HOURS);
            for (VipBill bill : bills) {
                if ("SUCCESS".equals(bill.getStatus()) && bill.getPeriodEnd() != null) {
                    // periodEnd <= now + 24h（含已过期）即进入续费窗口
                    return !bill.getPeriodEnd().isAfter(windowEnd);
                }
            }
            return false;
        } catch (DataAccessException e) {
            log.warn("查询用户 VIP 到期时间失败，跳过续费扫描：userId={}, error={}", userId, e.getMessage());
            return false;
        }
    }

    /**
     * 自动续费扫描结果汇总。
     *
     * @param scanned 进入续费窗口并尝试续费的用户数
     * @param renewed 续费成功数
     * @param failed  续费失败数（余额不足 / 异常）
     * @param skipped 幂等跳过数（本周期已扣过款；&gt;0 说明并发或锁失效真实发生过）
     */
    public record RenewScanResult(int scanned, int renewed, int failed, int skipped) {
    }

    /**
     * 查询当前用户的自动续费状态。
     *
     * @param userId 用户 ID
     * @return 自动续费状态视图
     * @throws IllegalArgumentException 用户 ID 为空或用户不存在时抛出
     */
    @Transactional(readOnly = true)
    public AutoRenewStatusView getStatus(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.USER_NOT_FOUND));
            boolean enabled = Boolean.TRUE.equals(user.getAutoRenewEnabled());
            return new AutoRenewStatusView(enabled);
        } catch (IllegalArgumentException e) {
            // 业务参数异常直接抛出
            throw e;
        } catch (DataAccessException e) {
            // 数据库查询失败时上报，由 GlobalExceptionHandler 转换为 5xx 响应
            log.error("查询自动续费状态失败：userId={}", userId, e);
            throw new RuntimeException(ErrorMessages.AUTO_RENEW_QUERY_FAILED_RETRY, e);
        }
    }

    /**
     * 开启自动续费。
     *
     * <p>P0-3 A：planId 必须命中 {@link VipPlanCatalog} 的在售套餐——历史实现只校验
     * 「非空白」，任何客户端 planId（含目录外 ID）都能开启续费，等于给续费链路
     * 留下第二个定价入口。目录外/已下架一律 IllegalArgumentException（HTTP 400），
     * 且在写库之前拒绝，不产生任何状态变更。</p>
     *
     * <p>说明：planId 不落库（{@code users} 无续费套餐列，本次禁止新增迁移）。
     * 续费真正扣款与顺延按订阅账单的 {@code plan_id} 快照查目录，
     * 因此这里校验的是「客户端不得用一个不存在的套餐建立续费意图」。</p>
     *
     * @param userId 用户 ID
     * @param planId 套餐 ID（必须是服务端目录内的在售套餐）
     * @return 更新后的状态视图
     * @throws IllegalArgumentException 用户 ID 为空、套餐 ID 为空或不在目录、用户不存在时抛出
     */
    @Transactional
    public AutoRenewStatusView enable(Long userId, String planId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        // 目录权威校验（fail-closed）：空白/目录外/已下架均拒绝，且不触碰数据库
        VipPlanCatalog.VipPlanDef plan = planCatalog.requirePurchasable(planId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.USER_NOT_FOUND));

        try {
            user.setAutoRenewEnabled(true);
            userRepository.save(user);
            log.info("自动续费已开启：userId={}, planId={}, renewAmountCents={}, renewDays={}",
                    userId, plan.planId(), plan.priceCents(), plan.days());
            return new AutoRenewStatusView(true);
        } catch (DataAccessException e) {
            // 数据库访问异常（save 失败、约束冲突等）
            log.error("开启自动续费失败：userId={}, planId={}", userId, planId, e);
            throw new RuntimeException(ErrorMessages.AUTO_RENEW_ENABLE_FAILED_RETRY, e);
        }
    }

    /**
     * 关闭自动续费。
     *
     * @param userId 用户 ID
     * @return 更新后的状态视图
     * @throws IllegalArgumentException 用户 ID 为空或用户不存在时抛出
     */
    @Transactional
    public AutoRenewStatusView disable(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.USER_NOT_FOUND));

        try {
            user.setAutoRenewEnabled(false);
            userRepository.save(user);
            log.info("自动续费已关闭：userId={}", userId);
            return new AutoRenewStatusView(false);
        } catch (DataAccessException e) {
            // 数据库更新失败时回滚事务并上报
            log.error("关闭自动续费失败：userId={}", userId, e);
            throw new RuntimeException(ErrorMessages.AUTO_RENEW_DISABLE_FAILED_RETRY, e);
        }
    }

    /**
     * 执行自动续费（分布式锁保护 + 真实扣减 + 写入交易流水）。
     *
     * <p>Task 2（FIN-00003）+ Task 12.2（REAUDIT-REPORT-100+ 编号 39）：
     * 分布式锁防并发多扣 + 真实扣减用户余额 + 交易流水对账。</p>
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>获取 Redisson 分布式锁 auto-renew:{userId}（等待 5s，持锁 30s）</li>
     *   <li>校验用户存在且 auto_renew_enabled = true</li>
     *   <li>解析续费套餐（P0-3 A）：按订阅账单的 planId 查 {@link VipPlanCatalog}，
     *       得到本次扣款金额（分）与顺延天数；解析不到即 fail-closed，不扣款</li>
     *   <li>生成订单号（UUID），调用 {@link WalletService#deduct} 按目录价真实扣减：
     *     <ul>
     *       <li>扣减成功：延长 VIP 到期时间并写入 vip_billing_log SUCCESS 流水，返回 SUCCESS</li>
     *       <li>余额不足（{@link InsufficientBalanceException}）：写入 FAILED 流水，
     *           返回 FAILED（不抛异常，由调用方根据状态决定后续动作，如推送通知）</li>
     *     </ul>
     *   </li>
     *   <li>finally 块释放锁</li>
     * </ol>
     *
     * <p>并发安全：同一用户同时只有一个续费流程执行，避免定时任务与手动续费并发
     * 导致 VIP 时间被多次延长、用户被多次扣费。WalletService 内部还有悲观锁 +
     * 幂等键（order_id 唯一索引）+ 事务三重保障，即使锁失效也不会重复扣减。</p>
     *
     * <p>幂等性：orderNo 是「用户 + 套餐 + 当前到期日」的确定性键（{@link #renewalOrderNo}），
     * 作为 WalletService.deduct 的 orderId 参数，同一续费周期重复触发只扣一次；
     * 扣款前还会用 SUCCESS 流水短路（{@link #STATUS_SKIPPED}），避免重放白送权益。
     * 未产生扣款的失败分支流水金额记 0（{@link #NO_CHARGE_AMOUNT_CENTS}），
     * 不再沿用任何硬编码续费价。</p>
     *
     * @param userId 用户 ID
     * @return 续费结果视图（含订单号、金额、状态）
     * @throws IllegalArgumentException 用户 ID 为空、用户不存在或未开启自动续费时抛出
     */
    @Transactional
    public RenewResultView renewVip(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }

        // 1. 获取分布式锁：auto-renew:{userId}
        String lockKey = "auto-renew:" + userId;
        RLock lock = redissonClient.getLock(lockKey);
        boolean locked = false;
        // R4-00317：锁是否已委托事务同步释放（afterCompletion 在事务提交/回滚后执行）。
        // 为 true 时 finally 不再主动释放，保证锁生命周期覆盖整个事务提交过程。
        boolean unlockAfterCommitRegistered = false;
        // 临时订单号：仅用于「还没解析出续费目标」的失败分支流水（锁未获取、用户不存在、
        // 未开启续费、目录不可定价），这些分支金额恒为 0、不触碰钱包扣费。
        // 一旦目录解析成功，订单号立刻换成确定性幂等键（见步骤 3.5）。
        String orderNo = "RENW-" + UUID.randomUUID().toString().replace("-", "");
        // 本次实际扣款额（分）：目录解析成功前保持 0，保证异常分支流水不会伪造一个「续费价」
        int chargeCents = NO_CHARGE_AMOUNT_CENTS;

        try {
            // 尝试获取锁：最多等待 5 秒，持锁 30 秒自动释放
            locked = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!locked) {
                // 未获取锁：说明同一用户已有续费流程在执行，快速失败
                log.warn("自动续费获取锁失败，已有任务在执行：userId={}", userId);
                writeBillingLog(userId, orderNo, NO_CHARGE_AMOUNT_CENTS, "FAILED");
                return new RenewResultView(orderNo, NO_CHARGE_AMOUNT_CENTS, "FAILED",
                        "已有续费任务在执行");
            }

            // R4-00317：注册事务同步——锁在事务提交（或回滚）完成后再释放。
            // 原实现在 finally 中释放锁，早于代理层事务提交：并发二次续费可读到
            // 未提交数据再次扣款+再次顺延 VIP（双扣费）。注册后锁生命周期覆盖
            // 「扣款 + 顺延 VIP + 写流水」的完整事务。
            try {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        releaseLockQuietly(lock, lockKey);
                    }
                });
                unlockAfterCommitRegistered = true;
            } catch (IllegalStateException e) {
                // 无活动事务（理论不发生——renewVip 经代理调用必有事务；防御处理）：
                // 不注册同步，退化为 finally 立即释放（旧行为）。
                log.warn("无活动事务，退化为方法返回时释放锁：userId={}, lockKey={}", userId, lockKey);
            }

            // 2. 校验用户存在且已开启自动续费
            User user;
            try {
                user = userRepository.findById(userId)
                        .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.USER_NOT_FOUND));
            } catch (IllegalArgumentException e) {
                log.warn("自动续费失败，用户不存在：userId={}", userId);
                writeBillingLog(userId, orderNo, NO_CHARGE_AMOUNT_CENTS, "FAILED");
                throw e;
            }

            if (!Boolean.TRUE.equals(user.getAutoRenewEnabled())) {
                log.info("自动续费跳过，用户未开启自动续费：userId={}", userId);
                writeBillingLog(userId, orderNo, NO_CHARGE_AMOUNT_CENTS, "FAILED");
                return new RenewResultView(orderNo, NO_CHARGE_AMOUNT_CENTS, "FAILED",
                        "用户未开启自动续费");
            }

            // 3. 解析续费套餐（P0-3 A）：定价与时长唯一来源是服务端目录，
            //    目录查不到（无订阅 / planId 空白 / 目录外 / 已下架）时 fail-closed，
            //    绝不回落到某个「默认续费价」。
            RenewalTarget target = resolveRenewalTarget(userId);
            if (target == null) {
                log.warn("自动续费拒绝：订阅套餐无法按服务端目录定价（无 SUCCESS 账单或套餐已下架/非法）：userId={}",
                        userId);
                writeBillingLog(userId, orderNo, NO_CHARGE_AMOUNT_CENTS, "FAILED");
                return new RenewResultView(orderNo, NO_CHARGE_AMOUNT_CENTS, "FAILED",
                        "订阅套餐不在服务端可售目录，已拒绝续费");
            }
            chargeCents = target.plan().priceCents();

            // 3.5 扣款幂等键确定性化（S1-2，2026-10-30）：一个续费周期只对应一个键。
            //     原实现整个方法都用步骤 1 之前的 UUID 订单号，于是本类文档里
            //     「重复调用同一 orderNo 会直接返回已处理结果」这条保障在续费链路上
            //     从未成立：分布式锁一旦失效（30 秒持锁超时自动释放、Redis 重启、
            //     扫描任务被重复触发），同一周期就会二次扣款并二次顺延 VIP。
            //     续费成功必然把 vip_bills.period_end 推进到下一周期，所以下一轮扫描
            //     自然换键，不会影响正常续费节奏。
            orderNo = renewalOrderNo(userId, target.plan().planId(), target.bill().getPeriodEnd());
            if (vipBillingLogRepository.existsByOrderNoAndStatus(orderNo, "SUCCESS")) {
                // 短路必须在扣款之前：deduct 命中同 orderId 时只静默返回旧余额，
                // 调用方无从分辨「重放」与「新扣款」，若继续往下走就会白送一个周期的权益。
                log.info("自动续费幂等命中，本周期已续费，跳过：userId={}, orderNo={}", userId, orderNo);
                return new RenewResultView(orderNo, NO_CHARGE_AMOUNT_CENTS, STATUS_SKIPPED,
                        "本周期已续费，未重复扣款");
            }

            // 4. 真实扣减用户钱包余额（Task 2 FIN-00003）
            //    WalletService 内部通过悲观锁 + 幂等键 + 事务保证扣减安全：
            //    - 悲观锁：SELECT ... FOR UPDATE 锁住 user_wallet 行
            //    - 幂等：order_id 唯一索引，同一 orderNo 重复调用直接返回
            //    - 事务：扣减 + 写 wallet_transaction_log 原子提交
            //    余额不足时抛 InsufficientBalanceException，此处捕获并写 FAILED 流水。
            try {
                Long balanceAfter = walletService.deduct(
                        userId,
                        (long) chargeCents,
                        orderNo,
                        WalletTransactionLog.RELATED_TYPE_VIP_RENEW,
                        orderNo
                );
                log.info("自动续费扣款成功：userId={}, orderNo={}, planId={}, amount={}, grantDays={}, balanceAfter={}",
                        userId, orderNo, target.plan().planId(), chargeCents, target.plan().days(), balanceAfter);

                // 5. 修复（FIN HIGH-10）：扣款成功后真正延长 VIP 到期时间。
                //    项目未在 User 实体上定义 vipExpiresAt 字段（实体无该列，DB ddl-auto=validate
                //    不允许凭空新增），VIP 有效期结束时间以 vip_bills.period_end 为准
                //    （见 VipBill 实体注释 "VIP 有效期结束时间"）。
                //    规则：取 max(当前时间, 订阅账单的 periodEnd) + 目录套餐天数，
                //    保证续费在已有权益基础上顺延，不会因续费时间点而丢失剩余天数。
                extendVipExpiry(target);

                // 6. 写入续费流水（SUCCESS）
                writeBillingLog(userId, orderNo, chargeCents, "SUCCESS");
                return new RenewResultView(orderNo, chargeCents, "SUCCESS", null);
            } catch (InsufficientBalanceException e) {
                // 余额不足：写 FAILED 流水，不抛异常，由调用方根据状态决定后续动作
                // （如推送通知提醒用户充值）
                log.warn("自动续费扣款失败，余额不足：userId={}, orderNo={}, 需要={}, 当前余额={}",
                        userId, orderNo, e.getAmountCents(), e.getBalanceCents());
                writeBillingLog(userId, orderNo, chargeCents, "FAILED");
                return new RenewResultView(orderNo, chargeCents, "FAILED",
                        "余额不足，请充值后重试");
            }
        } catch (InterruptedException e) {
            // 等待锁时被中断：恢复中断状态并失败返回
            Thread.currentThread().interrupt();
            log.error("自动续费等待锁时被中断：userId={}", userId, e);
            writeBillingLog(userId, orderNo, chargeCents, "FAILED");
            throw new RuntimeException(ErrorMessages.AUTO_RENEW_INTERRUPTED_RETRY, e);
        } catch (DataAccessException e) {
            // 数据库访问异常：记录失败流水并抛出
            log.error("自动续费数据库异常：userId={}, orderNo={}", userId, orderNo, e);
            writeBillingLog(userId, orderNo, chargeCents, "FAILED");
            throw new RuntimeException(ErrorMessages.AUTO_RENEW_FAILED_RETRY, e);
        } finally {
            // 7. 释放锁：仅当持有锁且未委托事务同步时才释放，避免 IllegalMonitorStateException。
            // R4-00317：正常路径（unlockAfterCommitRegistered=true）锁由
            // TransactionSynchronization.afterCompletion 在事务提交/回滚后释放，
            // finally 不再提前解锁——锁生命周期完整覆盖事务提交。
            if (!unlockAfterCommitRegistered && locked && lock.isHeldByCurrentThread()) {
                try {
                    lock.unlock();
                } catch (IllegalMonitorStateException e) {
                    // 锁已被自动释放（持锁超时），忽略
                    log.debug("锁已被自动释放：userId={}, lockKey={}", userId, lockKey);
                }
            }
        }
    }

    /**
     * 安静释放分布式锁（R4-00317 事务同步回调专用）。
     * 仅当当前线程仍持有锁时释放，异常仅记录日志不向上抛出（回调环境不传播异常）。
     */
    private void releaseLockQuietly(RLock lock, String lockKey) {
        try {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.debug("自动续费锁已释放（事务提交后）：lockKey={}", lockKey);
            }
        } catch (IllegalMonitorStateException e) {
            // 锁已被自动释放（持锁超时），忽略
            log.debug("锁已被自动释放：lockKey={}", lockKey);
        } catch (RuntimeException e) {
            log.warn("释放自动续费锁异常（不影响业务结果）：lockKey={}, error={}", lockKey, e.getMessage());
        }
    }

    /**
     * 生成续费幂等键（S1-2）。
     *
     * <p>键由「用户 + 套餐 + 本次要顺延的当前到期日」三元组决定，与扣款次数无关：
     * 同一周期内无论被触发多少次（并发、锁失效、任务重放）都落在同一个 orderId 上，
     * 由 {@code wallet_transaction_log.order_id} 唯一索引挡下重复扣款；续费成功后
     * period_end 前进到下一周期，键随之改变，正常续费节奏不受影响。</p>
     *
     * <p>长度控制在 {@code vip_billing_logs.order_no VARCHAR(64)} 之内：
     * {@code RENW-<userId>-<planId>-<yyyyMMddHHmmss>}。</p>
     *
     * @param userId             用户 ID
     * @param planId             目录套餐 ID
     * @param currentPeriodEnd   当前订阅到期时间（续费前的 period_end）
     * @return 续费订单号，同时作为钱包扣款的幂等 orderId
     */
    static String renewalOrderNo(Long userId, String planId, LocalDateTime currentPeriodEnd) {
        return "RENW-" + userId + "-" + planId + "-" + currentPeriodEnd.format(RENEWAL_KEY_FORMAT);
    }

    /**
     * 续费目标：订阅账单快照 + 目录套餐（P0-3 A）。
     *
     * <p>两者必须成对出现：扣款额与顺延天数由目录套餐决定，而被顺延的那一行
     * 正是提供 planId 的订阅账单——避免「按 A 套餐定价、给 B 账单续期」的错配。</p>
     *
     * @param bill 提供订阅身份的 SUCCESS 账单（只读其快照，仅 periodEnd 会被顺延）
     * @param plan 目录套餐（定价与权益时长来源）
     */
    private record RenewalTarget(VipBill bill, VipPlanCatalog.VipPlanDef plan) {
    }

    /**
     * 解析续费目标（P0-3 A：定价/时长的唯一入口，fail-closed）。
     *
     * <p>订阅身份口径与 VIP 有效期判定一致（见 {@link #isVipExpiringSoon}、
     * {@code VipBillRepository} 注释）：按创建时间倒序取第一笔
     * {@code status=SUCCESS 且 period_end 非空} 的账单，其 {@code plan_id}
     * 即订阅套餐，再由 {@link VipPlanCatalog} 给出扣款额与天数。</p>
     *
     * <p>返回 {@code null} 表示不可续费（拒绝扣款）：无 SUCCESS 账单、
     * planId 空白、planId 不在目录、或套餐已下架。</p>
     *
     * @param userId 用户 ID
     * @return 续费目标；无法按目录定价时为 {@code null}
     */
    private RenewalTarget resolveRenewalTarget(Long userId) {
        List<VipBill> bills = vipBillRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (bills == null) {
            return null;
        }
        for (VipBill bill : bills) {
            if (!"SUCCESS".equals(bill.getStatus()) || bill.getPeriodEnd() == null) {
                continue;
            }
            String planId = bill.getPlanId();
            if (planId == null || planId.isBlank()) {
                log.warn("订阅账单缺少套餐快照，无法按目录定价：userId={}, billId={}", userId, bill.getId());
                return null;
            }
            try {
                return new RenewalTarget(bill, planCatalog.requirePurchasable(planId));
            } catch (IllegalArgumentException e) {
                // 目录外 / 已下架：fail-closed，绝不沿用历史硬编码续费价
                log.warn("订阅套餐不在服务端可售目录，拒绝续费：userId={}, billId={}, planId={}, reason={}",
                        userId, bill.getId(), planId, e.getMessage());
                return null;
            }
        }
        return null;
    }

    /**
     * 延长用户 VIP 到期时间（FIN HIGH-10 + P0-3 A）。
     *
     * <p>扣款成功后调用：在订阅账单的 periodEnd（已过期则以当前时间为基准）上
     * 顺延<b>目录套餐天数</b>（月 30 / 季 90 / 年 365），不再固定 30 天。
     * VIP 有效期结束时间以 {@code vip_bills.period_end} 为准（User 实体未定义
     * vipExpiresAt 字段，见 {@link com.campuslove.api.entity.VipBill} 注释）。</p>
     *
     * <p>历史快照只读：本方法只写 {@code period_end}（以及缺失时补写的
     * {@code period_start}），成交金额、原价、套餐名等历史快照一律不改写，
     * 也不新建账单行（续费目标必然存在，否则 {@link #resolveRenewalTarget} 已 fail-closed）。</p>
     *
     * @param target 续费目标（订阅账单 + 目录套餐）
     */
    private void extendVipExpiry(RenewalTarget target) {
        VipBill bill = target.bill();
        int grantDays = target.plan().days();
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        LocalDateTime newExpiry = bill.getPeriodEnd().isAfter(now)
                ? bill.getPeriodEnd().plusDays(grantDays)
                : now.plusDays(grantDays);

        bill.setPeriodEnd(newExpiry);
        if (bill.getPeriodStart() == null) {
            bill.setPeriodStart(now);
        }
        vipBillRepository.save(bill);
        log.info("VIP 到期时间已延长：userId={}, newExpiry={}, billId={}, planId={}, grantDays={}",
                bill.getUserId(), newExpiry, bill.getId(), target.plan().planId(), grantDays);
    }

    /**
     * 写入续费交易流水（内部辅助方法）。
     *
     * <p>独立 try-catch 防止流水写入失败影响主流程返回值。
     * 若流水写入失败，主流程仍按业务结果返回，但会记录 ERROR 日志。</p>
     *
     * @param userId  用户 ID
     * @param orderNo 订单号
     * @param amount  金额（分）
     * @param status  状态 SUCCESS / FAILED
     */
    private void writeBillingLog(Long userId, String orderNo, int amount, String status) {
        if (STATUS_FAILED.equals(status)) {
            // 失败流水走独立事务：renewVip 的失败分支大多会 rethrow，主事务回滚会把
            // "这一轮续费失败过"的证据一起抹掉，对账与告警都看不到。
            // SUCCESS 不能这样处理——若顺延失败却留下 SUCCESS 流水，反而是更糟的假账。
            failedLedgerProxy().writeFailedBillingLog(userId, orderNo, amount);
            return;
        }
        doWriteBillingLog(userId, orderNo, amount, status);
    }

    /**
     * 写"续费失败"流水（独立事务提交）。
     *
     * <p>必须由代理调用才生效，因此通过 {@link #self} 走一层；单测直连构造时代理缺失，
     * 退化为随主事务（此时方法上的 @Transactional 本来也不生效，与本类其他路径一致）。</p>
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void writeFailedBillingLog(Long userId, String orderNo, int amount) {
        doWriteBillingLog(userId, orderNo, amount, STATUS_FAILED);
    }

    /** 取代理对象；无代理时退回 this（见方法注释）。 */
    private AutoRenewService failedLedgerProxy() {
        return self != null ? self : this;
    }

    /** 流水落库本体（不改变调用方的事务边界）。 */
    private void doWriteBillingLog(Long userId, String orderNo, int amount, String status) {
        try {
            VipBillingLog logEntry = new VipBillingLog();
            logEntry.setUserId(userId);
            logEntry.setOrderNo(orderNo);
            logEntry.setAmount(amount);
            logEntry.setStatus(status);
            logEntry.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
            vipBillingLogRepository.save(logEntry);
        } catch (DataAccessException e) {
            // 流水写入失败不影响主流程，但需记录 ERROR 便于排查
            log.error("续费流水写入失败：userId={}, orderNo={}", userId, orderNo, e);
        }
    }

    /**
     * 自动续费状态视图。
     *
     * @param enabled 是否启用自动续费
     */
    public record AutoRenewStatusView(Boolean enabled) {
    }

    /**
     * 自动续费结果视图。
     *
     * @param orderNo 续费订单号
     * @param amount  续费金额（分）
     * @param status  续费状态 SUCCESS / FAILED
     * @param message 失败原因（status=FAILED 时非空）
     */
    public record RenewResultView(
            String orderNo,
            Integer amount,
            String status,
            String message
    ) {
    }
}
