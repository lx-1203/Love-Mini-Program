package com.campuslove.api.wallet;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 钱包服务实现。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：资金类操作的真实扣减/充值实现。</p>
 *
 * <p>并发安全三重保障：</p>
 * <ol>
 *   <li>悲观锁：{@link #deduct} / {@link #recharge} 通过
 *       {@link UserWalletRepository#findByUserIdForUpdate} 锁住钱包行，
 *       同一用户同时只有一个事务能修改余额</li>
 *   <li>幂等键：{@code wallet_transaction_log.order_id} 唯一索引，
 *       同一 orderId 重复调用直接返回已处理结果；
 *       并发场景下两个事务同时通过"未存在"校验时，
 *       后插入的事务因唯一约束冲突回滚</li>
 *   <li>事务：{@code @Transactional} 保证扣减/充值与流水写入原子提交，
 *       任意一步失败全部回滚</li>
 * </ol>
 *
 * <p>错误处理：</p>
 * <ul>
 *   <li>余额不足抛 {@link InsufficientBalanceException}，由调用方决定如何处理：
 *     <ul>
 *       <li>VIP 续费：捕获并写 FAILED 流水 + 推送通知</li>
 *       <li>红包发送：向上抛出，事务回滚，红包创建失败</li>
 *     </ul>
 *   </li>
 *   <li>数据库异常包装为 RuntimeException 抛出，避免泄漏堆栈</li>
 *   <li>幂等冲突（DataIntegrityViolationException on order_id）静默处理，
 *       重新查询已存在的流水并返回，符合幂等语义；
 *       P0-16：若冲突后重查为空（非 order_id 键冲突场景），强制回滚事务，
 *       防止同 orderId 二次入账/扣款</li>
 * </ul>
 */
@Profile("real")
@Service
public class WalletServiceImpl implements WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletServiceImpl.class);

    /**
     * P0-17：扣减（deduct）允许的 relatedType 白名单。
     *
     * <p>防止客户端通过 {@code /wallet/deduct} 通用扣费端点以任意 relatedType 消费余额
     * （业务上每个扣费场景必须走对应入口/下单链路）。集合依据现有调用方确定：</p>
     * <ul>
     *   <li>VIP_RENEW：VIP 自动续费（AutoRenewService）</li>
     *   <li>RED_PACKET_SEND：红包发送（VipRedPacketService）</li>
     *   <li>ADMIN_ADJUST：管理后台余额调整（AdminWalletController）</li>
     *   <li>MESSAGE_UNLOCK / VISITORS_UNLOCK / LIKES_UNLOCK / WHISPER_UNLOCK：客户端
     *       旧版解锁扣费（/wallet/deduct 直调，兼容过渡期）</li>
     *   <li>UNLOCK_LIKED_ME / UNLOCK_VISITOR：P0-17 商业化解锁（/wallet/unlock 内部扣费）</li>
     *   <li>SWEET_TALK：AI 情话解锁（预留）</li>
     * </ul>
     */
    private static final Set<String> DEDUCT_RELATED_TYPE_WHITELIST = Set.of(
            WalletTransactionLog.RELATED_TYPE_VIP_RENEW,
            WalletTransactionLog.RELATED_TYPE_RED_PACKET_SEND,
            WalletTransactionLog.RELATED_TYPE_UNLOCK_LIKED_ME,
            WalletTransactionLog.RELATED_TYPE_UNLOCK_VISITOR,
            WalletTransactionLog.RELATED_TYPE_SWEET_TALK,
            "ADMIN_ADJUST",
            "MESSAGE_UNLOCK",
            "VISITORS_UNLOCK",
            "LIKES_UNLOCK",
            "WHISPER_UNLOCK"
    );

    private final UserWalletRepository userWalletRepository;
    private final WalletTransactionLogRepository transactionLogRepository;

    public WalletServiceImpl(UserWalletRepository userWalletRepository,
                             WalletTransactionLogRepository transactionLogRepository) {
        this.userWalletRepository = userWalletRepository;
        this.transactionLogRepository = transactionLogRepository;
    }

    /**
     * 扣减用户钱包余额。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>参数校验：userId / amountCents / orderId 非空，amountCents > 0</li>
     *   <li>幂等校验：按 orderId 查询流水，若已存在则直接返回 balanceAfter</li>
     *   <li>悲观锁查询钱包：SELECT ... FOR UPDATE</li>
     *   <li>余额校验：balanceCents >= amountCents，否则抛 InsufficientBalanceException</li>
     *   <li>扣减余额，写入流水（DEBIT, balanceAfter）</li>
     * </ol>
     *
     * <p>修复（FIN HIGH-16）：{@code noRollbackFor = DataIntegrityViolationException.class}
     * 配合下方 catch 内的幂等冲突重查逻辑，避免 UnexpectedRollbackException——
     * 原实现在事务内捕获唯一约束冲突后继续提交，事务已被标记 rollback-only，
     * 提交时抛 UnexpectedRollbackException，用户收到失败但资金实际已处理。</p>
     */
    @Override
    @Transactional(noRollbackFor = DataIntegrityViolationException.class)
    public Long deduct(Long userId, Long amountCents, String orderId, String relatedType, String relatedId) {
        validateParams(userId, amountCents, orderId, relatedType);
        // P0-17：relatedType 白名单校验——未登记的业务类型禁止扣费（返回 400）
        if (!DEDUCT_RELATED_TYPE_WHITELIST.contains(relatedType)) {
            log.warn("钱包扣减被拒绝：relatedType 不在白名单, userId={}, relatedType={}", userId, relatedType);
            throw new IllegalArgumentException("不支持的扣费业务类型: " + relatedType);
        }

        // 幂等校验：orderId 已存在则直接返回已处理结果
        Optional<WalletTransactionLog> existing = transactionLogRepository.findByOrderId(orderId);
        if (existing.isPresent()) {
            WalletTransactionLog logEntry = existing.get();
            // infra R2-00266: 校验幂等命中流水的归属用户，防止调用方传错 userId 返回他人余额
            if (logEntry.getUserId() == null || !logEntry.getUserId().equals(userId)) {
                throw new IllegalArgumentException(
                        "orderId 已存在但归属用户不一致: orderId=" + orderId);
            }
            log.info("钱包扣减幂等命中：userId={}, orderId={}, amount={}, balanceAfter={}",
                    userId, orderId, logEntry.getAmount(), logEntry.getBalanceAfter());
            return logEntry.getBalanceAfter();
        }

        try {
            // 悲观锁查询钱包（SELECT ... FOR UPDATE）
            UserWallet wallet = userWalletRepository.findByUserIdForUpdate(userId)
                    .orElseGet(() -> {
                        // 钱包不存在则初始化（余额 0），后续余额校验会失败抛 InsufficientBalanceException
                        // 这条路径仅在用户从未充值过且未触发钱包初始化时走
                        log.info("用户钱包不存在，自动初始化：userId={}", userId);
                        return initWallet(userId);
                    });

            // 余额校验
            if (wallet.getBalanceCents() == null || wallet.getBalanceCents() < amountCents) {
                long currentBalance = wallet.getBalanceCents() == null ? 0L : wallet.getBalanceCents();
                log.warn("钱包扣减失败，余额不足：userId={}, 需要={}, 当前={}",
                        userId, amountCents, currentBalance);
                throw new InsufficientBalanceException(userId, amountCents, currentBalance);
            }

            // 扣减余额
            long newBalance = wallet.getBalanceCents() - amountCents;
            wallet.setBalanceCents(newBalance);
            wallet.setUpdatedAt(LocalDateTime.now());
            userWalletRepository.save(wallet);

            // 写入流水
            Long balanceAfter = newBalance;
            writeTransactionLog(userId, WalletTransactionLog.TransactionType.DEBIT.name(),
                    amountCents, balanceAfter, orderId, relatedType, relatedId,
                    "扣减：" + relatedType + " orderId=" + orderId);

            log.info("钱包扣减成功：userId={}, amount={}, balanceAfter={}, orderId={}",
                    userId, amountCents, balanceAfter, orderId);
            return balanceAfter;
        } catch (InsufficientBalanceException e) {
            // 余额不足异常向上抛出，由调用方处理
            throw e;
        } catch (DataIntegrityViolationException e) {
            // 幂等冲突：orderId 唯一索引冲突（并发场景下另一事务已先写入）
            // 重新查询已存在的流水并返回，符合幂等语义（noRollbackFor 仅豁免该分支）
            log.info("钱包扣减幂等冲突，重新查询：userId={}, orderId={}", userId, orderId);
            Optional<WalletTransactionLog> conflictExisting = transactionLogRepository.findByOrderId(orderId);
            if (conflictExisting.isPresent()) {
                // 唯一键冲突且重查命中：另一事务已处理该 orderId，直接返回其结果（幂等语义）
                return conflictExisting.get().getBalanceAfter();
            }
            // P0-16 修复：幂等冲突但重查为空——说明冲突并非 order_id 唯一键
            // （或其他约束冲突/事务未提交可见性），此时【必须强制回滚】：
            // 若提交，钱包余额变更（若已 flush）会落库但流水未写入，orderId 幂等键失效，
            // 同一 orderId 重试会再次扣款/入账（二次入账/扣款）。显式标记 rollback + 抛
            // 普通 RuntimeException 双保险，保证本次变更整体回滚。
            log.warn("钱包扣减幂等冲突且重查为空，强制回滚：userId={}, orderId={}", userId, orderId);
            org.springframework.transaction.interceptor.TransactionAspectSupport
                    .currentTransactionStatus().setRollbackOnly();
            throw new RuntimeException("钱包扣减失败且幂等查询无记录，已回滚", e);
        } catch (DataAccessException e) {
            log.error("钱包扣减数据库异常：userId={}, orderId={}", userId, orderId, e);
            throw new RuntimeException("钱包扣减失败，请稍后重试", e);
        }
    }

    /**
     * 充值用户钱包余额。
     *
     * <p>处理流程同 {@link #deduct}，但方向相反（余额 += amount，写入 CREDIT 流水）。</p>
     *
     * <p>修复（FIN HIGH-16）：{@code noRollbackFor = DataIntegrityViolationException.class}
     * 配合下方 catch 内的幂等冲突重查逻辑，避免 UnexpectedRollbackException。</p>
     */
    @Override
    @Transactional(noRollbackFor = DataIntegrityViolationException.class)
    public Long recharge(Long userId, Long amountCents, String orderId, String relatedType, String relatedId) {
        validateParams(userId, amountCents, orderId, relatedType);

        // 幂等校验：orderId 已存在则直接返回已处理结果
        Optional<WalletTransactionLog> existing = transactionLogRepository.findByOrderId(orderId);
        if (existing.isPresent()) {
            WalletTransactionLog logEntry = existing.get();
            log.info("钱包充值幂等命中：userId={}, orderId={}, amount={}, balanceAfter={}",
                    userId, orderId, logEntry.getAmount(), logEntry.getBalanceAfter());
            return logEntry.getBalanceAfter();
        }

        try {
            // 悲观锁查询钱包
            UserWallet wallet = userWalletRepository.findByUserIdForUpdate(userId)
                    .orElseGet(() -> {
                        log.info("用户钱包不存在，自动初始化：userId={}", userId);
                        return initWallet(userId);
                    });

            // 充值余额
            long currentBalance = wallet.getBalanceCents() == null ? 0L : wallet.getBalanceCents();
            long newBalance = currentBalance + amountCents;
            wallet.setBalanceCents(newBalance);
            wallet.setUpdatedAt(LocalDateTime.now());
            userWalletRepository.save(wallet);

            // 写入流水
            Long balanceAfter = newBalance;
            writeTransactionLog(userId, WalletTransactionLog.TransactionType.CREDIT.name(),
                    amountCents, balanceAfter, orderId, relatedType, relatedId,
                    "充值：" + relatedType + " orderId=" + orderId);

            log.info("钱包充值成功：userId={}, amount={}, balanceAfter={}, orderId={}",
                    userId, amountCents, balanceAfter, orderId);
            return balanceAfter;
        } catch (DataIntegrityViolationException e) {
            // 幂等冲突：orderId 唯一索引冲突（并发场景下另一事务已先写入）
            // 重新查询已存在的流水并返回，符合幂等语义（noRollbackFor 仅豁免该分支）
            log.info("钱包充值幂等冲突，重新查询：userId={}, orderId={}", userId, orderId);
            Optional<WalletTransactionLog> conflictExisting = transactionLogRepository.findByOrderId(orderId);
            if (conflictExisting.isPresent()) {
                // 唯一键冲突且重查命中：另一事务已处理该 orderId，直接返回其结果（幂等语义）
                return conflictExisting.get().getBalanceAfter();
            }
            // P0-16 修复：幂等冲突但重查为空——强制回滚，防止同 orderId 二次入账
            // （详见 deduct 同分支注释）。
            log.warn("钱包充值幂等冲突且重查为空，强制回滚：userId={}, orderId={}", userId, orderId);
            org.springframework.transaction.interceptor.TransactionAspectSupport
                    .currentTransactionStatus().setRollbackOnly();
            throw new RuntimeException("钱包充值失败且幂等查询无记录，已回滚", e);
        } catch (DataAccessException e) {
            log.error("钱包充值数据库异常：userId={}, orderId={}", userId, orderId, e);
            throw new RuntimeException("钱包充值失败，请稍后重试", e);
        }
    }

    /**
     * 查询用户钱包余额。
     *
     * <p>钱包不存在时返回 0，不自动创建。</p>
     */
    @Override
    @Transactional(readOnly = true)
    public Long getBalance(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        return userWalletRepository.findByUserId(userId)
                .map(UserWallet::getBalanceCents)
                .orElse(0L);
    }

    /**
     * 分页查询用户钱包交易流水（按创建时间倒序）。
     *
     * <p>只读操作，不创建钱包；流水不存在时返回空分页。</p>
     */
    @Override
    @Transactional(readOnly = true)
    public Page<WalletTransactionLog> listTransactions(Long userId, Pageable pageable) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        return transactionLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * 初始化用户钱包记录（余额 0）。
     *
     * <p>调用方需在事务内调用本方法，初始化后的钱包记录可被后续 {@code save} 持久化。</p>
     *
     * @param userId 用户 ID
     * @return 新建的钱包实体（尚未持久化）
     */
    private UserWallet initWallet(Long userId) {
        UserWallet wallet = new UserWallet();
        wallet.setUserId(userId);
        wallet.setBalanceCents(0L);
        wallet.setFrozenCents(0L);
        wallet.setVersion(0L);
        LocalDateTime now = LocalDateTime.now();
        wallet.setCreatedAt(now);
        wallet.setUpdatedAt(now);
        return userWalletRepository.save(wallet);
    }

    /**
     * 校验 deduct / recharge 入参。
     *
     * @throws IllegalArgumentException 任一参数非法时抛出
     */
    private void validateParams(Long userId, Long amountCents, String orderId, String relatedType) {
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (amountCents == null || amountCents <= 0) {
            throw new IllegalArgumentException("金额必须为正数");
        }
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("订单号不能为空");
        }
        if (relatedType == null || relatedType.isBlank()) {
            throw new IllegalArgumentException("关联业务类型不能为空");
        }
    }

    /**
     * 写入钱包交易流水。
     *
     * <p>infra R2-00267: 修正注释——本方法实际无独立 try-catch，流水写入失败
     * 由调用方（deduct/recharge）捕获处理（如幂等冲突重查），不再宣称"独立 try-catch"。</p>
     */
    private void writeTransactionLog(Long userId, String type, Long amountCents, Long balanceAfter,
                                      String orderId, String relatedType, String relatedId, String remark) {
        WalletTransactionLog logEntry = new WalletTransactionLog();
        logEntry.setUserId(userId);
        logEntry.setType(type);
        logEntry.setAmount(amountCents);
        logEntry.setBalanceAfter(balanceAfter);
        logEntry.setRelatedType(relatedType);
        logEntry.setRelatedId(relatedId);
        logEntry.setOrderId(orderId);
        logEntry.setRemark(remark);
        LocalDateTime now = LocalDateTime.now();
        logEntry.setCreatedAt(now);
        logEntry.setUpdatedAt(now);
        transactionLogRepository.save(logEntry);
    }
}
