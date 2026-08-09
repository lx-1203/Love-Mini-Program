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
 * <p>事务处理：所有写操作使用 @Transactional 保证原子性。
 * 状态查询使用只读事务以优化性能。</p>
 *
 * <p>并发控制（Task 12.2）：自动续费方法使用 Redisson 分布式锁
 * （key = auto-renew:{userId}），保证同一用户同时只有一个续费流程执行，
 * 避免定时任务重复触发或用户手动续费与定时任务并发导致多扣费。
 * 锁超时 30 秒，避免持锁线程崩溃导致死锁。</p>
 *
 * <p>对账支持（Task 12.2）：每次续费（无论成功/失败）写入 vip_billing_log 流水表，
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

    /** 默认续费金额（分）：1990 分 = 19.90 元（月度套餐） */
    private static final int DEFAULT_RENEW_AMOUNT_CENTS = 1990;

    /**
     * 续费对应权益时长（天）：30 天（月度套餐）。
     * FIN HIGH-10：扣款成功后按此天数延长 VIP 到期时间（vip_bills.period_end）。
     */
    private static final int RENEW_PERIOD_DAYS = 30;

    private final UserRepository userRepository;
    private final VipBillingLogRepository vipBillingLogRepository;
    /**
     * VIP 账单 Repository（FIN HIGH-10 新增，R4-00347 改构造器注入）。
     *
     * <p>用于扣款成功后延长 {@code vip_bills.period_end}（VIP 有效期结束时间）。
     * 构造器注入保证生产必注入，不再有"注入失败权益延长静默降级为仅日志"的
     * 无失败可见性路径（原 @Autowired(required=false) 字段注入已移除）。</p>
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
                            WalletService walletService) {
        this.userRepository = userRepository;
        this.vipBillingLogRepository = vipBillingLogRepository;
        this.vipBillRepository = vipBillRepository;
        this.redissonClient = redissonClient;
        this.walletService = walletService;
    }

    /**
     * 自动续费定时扫描（R4-00316）。
     *
     * <p>每 6 小时执行一次：扫描全部开启自动续费的用户，对「VIP 距到期 24 小时
     * 内（含已过期）」的用户逐个触发 {@link #renewVip}（经 self 代理保证事务生效）。
     * 单用户续费失败（余额不足等）仅记录日志，不阻断其他用户。</p>
     *
     * <p>幂等说明：续费成功后 VIP 到期时间顺延 30 天，自然移出扫描窗口，
     * 不会因每 6 小时扫描而重复扣费；失败用户留在窗口内下次重试（失败不扣费）。</p>
     *
     * @return 扫描结果汇总（scanned 扫描数 / renewed 续费成功数 / failed 失败数）
     */
    public RenewScanResult runRenewScan() {
        List<User> users;
        try {
            users = userRepository.findByAutoRenewEnabledTrue();
        } catch (DataAccessException e) {
            log.error("自动续费扫描查询用户失败：{}", e.getMessage());
            return new RenewScanResult(0, 0, 0);
        }
        int scanned = 0;
        int renewed = 0;
        int failed = 0;
        for (User user : users) {
            if (!isVipExpiringSoon(user.getId())) {
                continue;
            }
            scanned++;
            try {
                RenewResultView result = self.renewVip(user.getId());
                if ("SUCCESS".equals(result.status())) {
                    renewed++;
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
        log.info("自动续费扫描完成：scanned={}, renewed={}, failed={}", scanned, renewed, failed);
        return new RenewScanResult(scanned, renewed, failed);
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
     */
    public record RenewScanResult(int scanned, int renewed, int failed) {
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
     * @param userId 用户 ID
     * @param planId 套餐 ID（用于将来扩展绑定支付渠道等）
     * @return 更新后的状态视图
     * @throws IllegalArgumentException 用户 ID 为空、套餐 ID 为空或用户不存在时抛出
     */
    @Transactional
    public AutoRenewStatusView enable(Long userId, String planId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        if (planId == null || planId.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PLAN_ID_REQUIRED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.USER_NOT_FOUND));

        try {
            user.setAutoRenewEnabled(true);
            userRepository.save(user);
            log.info("自动续费已开启：userId={}, planId={}", userId, planId);
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
     * 设置自动续费开关（兼容旧接口，保留供内部调用）。
     *
     * @param userId  用户 ID
     * @param enabled 是否启用自动续费
     * @return 更新后的状态视图
     */
    @Transactional
    public AutoRenewStatusView setEnabled(Long userId, Boolean enabled) {
        if (enabled == null) {
            throw new IllegalArgumentException(ErrorMessages.ENABLED_REQUIRED);
        }
        return enabled ? enable(userId, "default") : disable(userId);
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
     *   <li>生成订单号（UUID），调用 {@link WalletService#deduct} 真实扣减月费：
     *     <ul>
     *       <li>扣减成功：写入 vip_billing_log SUCCESS 流水，返回 SUCCESS</li>
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
     * <p>幂等性：orderNo 作为 WalletService.deduct 的 orderId 参数，
     * 重复调用同一 orderNo 会直接返回已处理结果，不会重复扣减。</p>
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
        String orderNo = "RENW-" + UUID.randomUUID().toString().replace("-", "");

        try {
            // 尝试获取锁：最多等待 5 秒，持锁 30 秒自动释放
            locked = lock.tryLock(LOCK_WAIT_SECONDS, LOCK_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!locked) {
                // 未获取锁：说明同一用户已有续费流程在执行，快速失败
                log.warn("自动续费获取锁失败，已有任务在执行：userId={}", userId);
                writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED");
                return new RenewResultView(orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED",
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
                writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED");
                throw e;
            }

            if (!Boolean.TRUE.equals(user.getAutoRenewEnabled())) {
                log.info("自动续费跳过，用户未开启自动续费：userId={}", userId);
                writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED");
                return new RenewResultView(orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED",
                        "用户未开启自动续费");
            }

            // 3. 真实扣减用户钱包余额（Task 2 FIN-00003）
            //    WalletService 内部通过悲观锁 + 幂等键 + 事务保证扣减安全：
            //    - 悲观锁：SELECT ... FOR UPDATE 锁住 user_wallet 行
            //    - 幂等：order_id 唯一索引，同一 orderNo 重复调用直接返回
            //    - 事务：扣减 + 写 wallet_transaction_log 原子提交
            //    余额不足时抛 InsufficientBalanceException，此处捕获并写 FAILED 流水。
            try {
                Long balanceAfter = walletService.deduct(
                        userId,
                        (long) DEFAULT_RENEW_AMOUNT_CENTS,
                        orderNo,
                        WalletTransactionLog.RELATED_TYPE_VIP_RENEW,
                        orderNo
                );
                log.info("自动续费扣款成功：userId={}, orderNo={}, amount={}, balanceAfter={}",
                        userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, balanceAfter);

                // 4. 修复（FIN HIGH-10）：扣款成功后真正延长 VIP 到期时间。
                //    项目未在 User 实体上定义 vipExpiresAt 字段（实体无该列，DB ddl-auto=validate
                //    不允许凭空新增），VIP 有效期结束时间以 vip_bills.period_end 为准
                //    （见 VipBill 实体注释 "VIP 有效期结束时间"）。
                //    规则：取 max(当前时间, 最近一笔 SUCCESS 账单的 periodEnd) + 30 天，
                //    保证续费在已有权益基础上顺延，不会因续费时间点而丢失剩余天数。
                extendVipExpiry(userId, orderNo);

                // 5. 写入续费流水（SUCCESS）
                writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "SUCCESS");
                return new RenewResultView(orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "SUCCESS", null);
            } catch (InsufficientBalanceException e) {
                // 余额不足：写 FAILED 流水，不抛异常，由调用方根据状态决定后续动作
                // （如推送通知提醒用户充值）
                log.warn("自动续费扣款失败，余额不足：userId={}, orderNo={}, 需要={}, 当前余额={}",
                        userId, orderNo, e.getAmountCents(), e.getBalanceCents());
                writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED");
                return new RenewResultView(orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED",
                        "余额不足，请充值后重试");
            }
        } catch (InterruptedException e) {
            // 等待锁时被中断：恢复中断状态并失败返回
            Thread.currentThread().interrupt();
            log.error("自动续费等待锁时被中断：userId={}", userId, e);
            writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED");
            throw new RuntimeException(ErrorMessages.AUTO_RENEW_INTERRUPTED_RETRY, e);
        } catch (DataAccessException e) {
            // 数据库访问异常：记录失败流水并抛出
            log.error("自动续费数据库异常：userId={}, orderNo={}", userId, orderNo, e);
            writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED");
            throw new RuntimeException(ErrorMessages.AUTO_RENEW_FAILED_RETRY, e);
        } finally {
            // 5. 释放锁：仅当持有锁且未委托事务同步时才释放，避免 IllegalMonitorStateException。
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
     * 延长用户 VIP 到期时间（FIN HIGH-10）。
     *
     * <p>扣款成功后调用：在最近一笔 SUCCESS 账单的 periodEnd（无则当前时间）基础上
     * 顺延 {@value #DEFAULT_RENEW_AMOUNT_CENTS} 分对应的 30 天（月度套餐）。
     * VIP 有效期结束时间以 {@code vip_bills.period_end} 为准（User 实体未定义
     * vipExpiresAt 字段，见 {@link com.campuslove.api.entity.VipBill} 注释）。</p>
     *
     * @param userId  用户 ID
     * @param orderNo 本次续费订单号（用于日志与兜底建单）
     */
    private void extendVipExpiry(Long userId, String orderNo) {
        // R4-00347：vipBillRepository 已改构造器注入（生产必注入），移除原降级分支
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        LocalDateTime newExpiry = now.plusDays(RENEW_PERIOD_DAYS);

        // 优先基于最近一笔 SUCCESS 账单顺延，避免丢失剩余权益天数
        List<VipBill> bills = vipBillRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (bills == null) {
            bills = List.of();
        }
        for (VipBill bill : bills) {
            if ("SUCCESS".equals(bill.getStatus()) && bill.getPeriodEnd() != null) {
                if (bill.getPeriodEnd().isAfter(now)) {
                    newExpiry = bill.getPeriodEnd().plusDays(RENEW_PERIOD_DAYS);
                }
                break;
            }
        }

        // 有最近一笔 SUCCESS 账单则更新其 periodEnd，否则创建一笔 RENEW 账单记录权益。
        // 修复（R2 review MED）：target 必须选 SUCCESS 账单——旧实现取最新账单，
        // 若最新账单为 FAILED（如余额不足记录）会把续费权益写错对象。
        VipBill target = null;
        for (VipBill bill : bills) {
            if ("SUCCESS".equals(bill.getStatus())) {
                target = bill;
                break;
            }
        }
        if (target != null) {
            target.setPeriodEnd(newExpiry);
            if (target.getPeriodStart() == null) {
                target.setPeriodStart(now);
            }
            vipBillRepository.save(target);
            log.info("VIP 到期时间已延长：userId={}, newExpiry={}, billId={}", userId, newExpiry, target.getId());
        } else {
            VipBill newBill = new VipBill();
            newBill.setUserId(userId);
            newBill.setPlanId("monthly");
            newBill.setPlanName("月度会员");
            newBill.setAmount(DEFAULT_RENEW_AMOUNT_CENTS);
            newBill.setOriginalAmount(DEFAULT_RENEW_AMOUNT_CENTS);
            newBill.setType("RENEW");
            newBill.setStatus("SUCCESS");
            newBill.setPaymentMethod("WALLET");
            newBill.setTransactionId(orderNo);
            newBill.setPeriodStart(now);
            newBill.setPeriodEnd(newExpiry);
            newBill.setRemark("自动续费扣款成功，开通/延长 VIP");
            newBill.setCreatedAt(now);
            vipBillRepository.save(newBill);
            log.info("VIP 权益账单已创建：userId={}, newExpiry={}", userId, newExpiry);
        }
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
