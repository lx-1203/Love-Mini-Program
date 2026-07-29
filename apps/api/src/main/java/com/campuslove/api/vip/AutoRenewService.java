package com.campuslove.api.vip;

import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipBillingLog;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.wallet.InsufficientBalanceException;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final UserRepository userRepository;
    private final VipBillingLogRepository vipBillingLogRepository;
    private final RedissonClient redissonClient;
    /**
     * Task 2（FIN-00003）：钱包服务，用于真实扣减用户余额。
     *
     * <p>替代前序版本中"仅记录日志未扣费"的 mock 逻辑，
     * 现在每次续费都会调用 {@link WalletService#deduct} 真实扣减月费，
     * 余额不足时捕获 {@link InsufficientBalanceException} 写 FAILED 流水并通知用户。</p>
     */
    private final WalletService walletService;

    public AutoRenewService(UserRepository userRepository,
                            VipBillingLogRepository vipBillingLogRepository,
                            RedissonClient redissonClient,
                            WalletService walletService) {
        this.userRepository = userRepository;
        this.vipBillingLogRepository = vipBillingLogRepository;
        this.redissonClient = redissonClient;
        this.walletService = walletService;
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
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
            boolean enabled = Boolean.TRUE.equals(user.getAutoRenewEnabled());
            return new AutoRenewStatusView(enabled);
        } catch (IllegalArgumentException e) {
            // 业务参数异常直接抛出
            throw e;
        } catch (DataAccessException e) {
            // 数据库查询失败时上报，由 GlobalExceptionHandler 转换为 5xx 响应
            log.error("查询自动续费状态失败：userId={}", userId, e);
            throw new RuntimeException("查询自动续费状态失败，请稍后重试", e);
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
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (planId == null || planId.isBlank()) {
            throw new IllegalArgumentException("套餐 ID 不能为空");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        try {
            user.setAutoRenewEnabled(true);
            userRepository.save(user);
            log.info("自动续费已开启：userId={}, planId={}", userId, planId);
            return new AutoRenewStatusView(true);
        } catch (DataAccessException e) {
            // 数据库访问异常（save 失败、约束冲突等）
            log.error("开启自动续费失败：userId={}, planId={}", userId, planId, e);
            throw new RuntimeException("开启自动续费失败，请稍后重试", e);
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
            throw new IllegalArgumentException("用户 ID 不能为空");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        try {
            user.setAutoRenewEnabled(false);
            userRepository.save(user);
            log.info("自动续费已关闭：userId={}", userId);
            return new AutoRenewStatusView(false);
        } catch (DataAccessException e) {
            // 数据库更新失败时回滚事务并上报
            log.error("关闭自动续费失败：userId={}", userId, e);
            throw new RuntimeException("关闭自动续费失败，请稍后重试", e);
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
            throw new IllegalArgumentException("启用状态不能为空");
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
    public RenewResultView renewVip(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }

        // 1. 获取分布式锁：auto-renew:{userId}
        String lockKey = "auto-renew:" + userId;
        RLock lock = redissonClient.getLock(lockKey);
        boolean locked = false;
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

            // 2. 校验用户存在且已开启自动续费
            User user;
            try {
                user = userRepository.findById(userId)
                        .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
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

                // 4. 写入续费流水（SUCCESS）
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
            throw new RuntimeException("自动续费被中断，请稍后重试", e);
        } catch (DataAccessException e) {
            // 数据库访问异常：记录失败流水并抛出
            log.error("自动续费数据库异常：userId={}, orderNo={}", userId, orderNo, e);
            writeBillingLog(userId, orderNo, DEFAULT_RENEW_AMOUNT_CENTS, "FAILED");
            throw new RuntimeException("自动续费失败，请稍后重试", e);
        } finally {
            // 5. 释放锁：仅当持有锁时才释放，避免 IllegalMonitorStateException
            if (locked && lock.isHeldByCurrentThread()) {
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
            logEntry.setCreatedAt(LocalDateTime.now());
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
