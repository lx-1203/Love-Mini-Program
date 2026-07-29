package com.campuslove.api.wallet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Task 2.11：WalletService 并发安全与幂等单元测试。
 *
 * <p>验证 Task 2（FIN-00003）+ Task 15（FIN-00171）的资金类操作保障机制：</p>
 * <ul>
 *   <li>悲观锁：deduct / recharge 通过 {@link UserWalletRepository#findByUserIdForUpdate}
 *       锁住钱包行，同一用户同时只有一个事务能修改余额</li>
 *   <li>幂等：{@code wallet_transaction_log.order_id} 唯一索引 + 服务层先查后写，
 *       同一 orderId 重复调用直接返回已处理结果</li>
 *   <li>事务：扣减/充值与流水写入原子提交（单元测试不验证事务，由集成测试覆盖）</li>
 *   <li>余额校验：deduct 余额不足时抛 {@link InsufficientBalanceException}，不修改余额</li>
 *   <li>自动初始化：钱包不存在时自动创建（余额 0），后续校验失败抛余额不足</li>
 *   <li>参数校验：userId / amountCents / orderId / relatedType 非空，amountCents > 0</li>
 * </ul>
 *
 * <p>测试策略：</p>
 * <ul>
 *   <li>使用 Mockito mock {@link UserWalletRepository} 与 {@link WalletTransactionLogRepository}，
 *       不依赖真实数据库</li>
 *   <li>使用 {@link AtomicReference} 持有 wallet 对象，模拟持久化状态</li>
 *   <li>使用 {@link ConcurrentHashMap} 模拟 order_id 唯一索引，
 *       {@code putIfAbsent} 成功表示首次插入，失败表示唯一约束冲突</li>
 *   <li>使用 {@link AtomicInteger} 模拟数据库原子更新语义</li>
 *   <li>使用 {@link CountDownLatch} 同步多线程启动，模拟真实并发场景</li>
 *   <li>使用 {@code synchronized} 块模拟 SELECT...FOR UPDATE 悲观锁的串行化效果</li>
 * </ul>
 *
 * <p>注：真实的并发安全由数据库悲观锁 + 唯一索引保证，本单元测试验证服务层逻辑正确性
 * 与幂等语义；并发场景下的"不超发"由模拟的悲观锁串行化保证。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Task 2.11 WalletService 并发安全与幂等单元测试")
class WalletServiceConcurrencyTest {

    private static final int CONCURRENCY = 100;
    private static final long AWAIT_TIMEOUT_SECONDS = 15L;

    @Mock
    private UserWalletRepository userWalletRepository;

    @Mock
    private WalletTransactionLogRepository transactionLogRepository;

    // ============================================================
    // 基础功能测试（单线程）
    // ============================================================

    /**
     * 测试 1：deduct 余额充足时正确扣减并写入流水。
     *
     * <p>验证：</p>
     * <ul>
     *   <li>扣减后余额 = 原余额 - 扣减金额</li>
     *   <li>wallet 余额被更新</li>
     *   <li>写入一条 DEBIT 流水，金额、balanceAfter、orderId 正确</li>
     *   <li>返回扣减后余额</li>
     * </ul>
     */
    @Test
    @DisplayName("测试 1：deduct 余额充足 → 扣减成功并写入 DEBIT 流水")
    void deduct_sufficientBalance_deductsAndWritesLog() {
        // Arrange
        Long userId = 1001L;
        long initialBalance = 1000L;
        long deductAmount = 300L;

        UserWallet wallet = newWallet(userId, initialBalance);
        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(transactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        // Act
        Long balanceAfter = service.deduct(userId, deductAmount, "ORDER-001",
                WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-1");

        // Assert
        assertEquals(Long.valueOf(700L), balanceAfter, "扣减后余额应为 700");
        assertEquals(Long.valueOf(700L), wallet.getBalanceCents(), "wallet 余额应被更新为 700");
        verify(transactionLogRepository, times(1)).save(any(WalletTransactionLog.class));
    }

    /**
     * 测试 2：deduct 余额不足时抛 InsufficientBalanceException，不修改余额，不写流水。
     */
    @Test
    @DisplayName("测试 2：deduct 余额不足 → 抛 InsufficientBalanceException，余额不变")
    void deduct_insufficientBalance_throwsExceptionAndDoesNotModify() {
        Long userId = 1002L;
        long initialBalance = 50L;
        long deductAmount = 100L;

        UserWallet wallet = newWallet(userId, initialBalance);
        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(transactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        InsufficientBalanceException ex = assertThrows(
                InsufficientBalanceException.class,
                () -> service.deduct(userId, deductAmount, "ORDER-002",
                        WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-2"));

        assertEquals(userId, ex.getUserId());
        assertEquals(Long.valueOf(deductAmount), ex.getAmountCents());
        assertEquals(Long.valueOf(initialBalance), ex.getBalanceCents());
        assertEquals(Long.valueOf(initialBalance), wallet.getBalanceCents(),
                "余额不足时 wallet 余额不应被修改");
        verify(transactionLogRepository, never()).save(any(WalletTransactionLog.class));
        verify(userWalletRepository, never()).save(any(UserWallet.class));
    }

    /**
     * 测试 3：recharge 正确充值并写入 CREDIT 流水。
     */
    @Test
    @DisplayName("测试 3：recharge → 充值成功并写入 CREDIT 流水")
    void recharge_addsBalanceAndWritesLog() {
        Long userId = 1003L;
        long initialBalance = 0L;
        long rechargeAmount = 1000L;

        UserWallet wallet = newWallet(userId, initialBalance);
        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(transactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        Long balanceAfter = service.recharge(userId, rechargeAmount, "ORDER-003",
                WalletTransactionLog.RELATED_TYPE_RED_PACKET_CLAIM, "redpacket-1");

        assertEquals(Long.valueOf(1000L), balanceAfter, "充值后余额应为 1000");
        assertEquals(Long.valueOf(1000L), wallet.getBalanceCents(), "wallet 余额应被更新为 1000");
        verify(transactionLogRepository, times(1)).save(any(WalletTransactionLog.class));
    }

    // ============================================================
    // 幂等测试
    // ============================================================

    /**
     * 测试 4：deduct 幂等 - 相同 orderId 重复调用返回相同结果，不重复扣减。
     *
     * <p>验证 Task 2 / 15 的幂等保障：服务层先查后写，orderId 已存在时直接返回。</p>
     */
    @Test
    @DisplayName("测试 4：deduct 幂等 - 相同 orderId 重复调用返回相同结果，不重复扣减")
    void deduct_idempotent_sameOrderIdReturnsCachedResult() {
        Long userId = 1004L;
        long initialBalance = 1000L;
        long deductAmount = 200L;
        String orderId = "ORDER-IDEMPOTENT-001";

        UserWallet wallet = newWallet(userId, initialBalance);
        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // 模拟首次查询返回空，save 后将流水存入 holder 模拟"已持久化"，后续查询返回已存在流水
        AtomicReference<Optional<WalletTransactionLog>> logHolder =
                new AtomicReference<>(Optional.empty());
        when(transactionLogRepository.findByOrderId(orderId))
                .thenAnswer(inv -> logHolder.get());
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> {
                    WalletTransactionLog saved = inv.getArgument(0);
                    logHolder.set(Optional.of(saved));
                    return saved;
                });

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        // 首次扣减
        Long firstResult = service.deduct(userId, deductAmount, orderId,
                WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-idem");
        assertEquals(Long.valueOf(800L), firstResult, "首次扣减后余额应为 800");
        assertEquals(Long.valueOf(800L), wallet.getBalanceCents());

        // 再次扣减相同 orderId：应直接返回已处理结果，wallet 不再扣减
        Long secondResult = service.deduct(userId, deductAmount, orderId,
                WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-idem");

        assertEquals(firstResult, secondResult, "幂等返回结果应一致");
        assertEquals(Long.valueOf(800L), wallet.getBalanceCents(),
                "幂等调用不应再次扣减 wallet 余额");
        // save 仅被调用一次（首次扣减），第二次直接返回未触发 save
        verify(transactionLogRepository, times(1)).save(any(WalletTransactionLog.class));
    }

    /**
     * 测试 5：recharge 幂等 - 相同 orderId 重复调用返回相同结果。
     */
    @Test
    @DisplayName("测试 5：recharge 幂等 - 相同 orderId 重复调用返回相同结果")
    void recharge_idempotent_sameOrderIdReturnsCachedResult() {
        Long userId = 1005L;
        long initialBalance = 0L;
        long rechargeAmount = 500L;
        String orderId = "ORDER-IDEMPOTENT-002";

        UserWallet wallet = newWallet(userId, initialBalance);
        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AtomicReference<Optional<WalletTransactionLog>> logHolder =
                new AtomicReference<>(Optional.empty());
        when(transactionLogRepository.findByOrderId(orderId))
                .thenAnswer(inv -> logHolder.get());
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> {
                    WalletTransactionLog saved = inv.getArgument(0);
                    logHolder.set(Optional.of(saved));
                    return saved;
                });

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        Long firstResult = service.recharge(userId, rechargeAmount, orderId,
                WalletTransactionLog.RELATED_TYPE_RED_PACKET_CLAIM, "rp-idem");
        Long secondResult = service.recharge(userId, rechargeAmount, orderId,
                WalletTransactionLog.RELATED_TYPE_RED_PACKET_CLAIM, "rp-idem");

        assertEquals(firstResult, secondResult, "幂等返回结果应一致");
        assertEquals(Long.valueOf(500L), wallet.getBalanceCents(),
                "幂等调用不应再次充值 wallet 余额");
        verify(transactionLogRepository, times(1)).save(any(WalletTransactionLog.class));
    }

    /**
     * 测试 6：deduct 幂等冲突 - 并发场景下另一事务先写入流水时，
     * findByOrderId 返回空但 save 抛 DataIntegrityViolationException，
     * 服务应重新查询并返回已存在结果。
     *
     * <p>模拟场景：两个线程同时通过 findByOrderId 检查（都返回空），
     * 第一个线程 save 成功，第二个线程 save 抛唯一约束冲突。
     * WalletServiceImpl 应捕获冲突并重新查询返回。</p>
     */
    @Test
    @DisplayName("测试 6：deduct 幂等冲突 - save 抛 DataIntegrityViolationException 时重新查询返回")
    void deduct_idempotentConflict_requeriesAndReturnsExisting() {
        Long userId = 1006L;
        long initialBalance = 1000L;
        long deductAmount = 100L;
        String orderId = "ORDER-CONFLICT-001";

        UserWallet wallet = newWallet(userId, initialBalance);
        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // 预构造已存在的流水（模拟另一事务已写入）
        WalletTransactionLog existingLog = new WalletTransactionLog();
        existingLog.setUserId(userId);
        existingLog.setType(WalletTransactionLog.TransactionType.DEBIT.name());
        existingLog.setAmount(deductAmount);
        existingLog.setBalanceAfter(900L);
        existingLog.setOrderId(orderId);
        existingLog.setRelatedType(WalletTransactionLog.RELATED_TYPE_VIP_RENEW);

        // findByOrderId 首次返回空（让服务进入扣减分支），后续返回已存在流水
        AtomicInteger findCallCount = new AtomicInteger(0);
        when(transactionLogRepository.findByOrderId(orderId)).thenAnswer(inv -> {
            int count = findCallCount.incrementAndGet();
            return count == 1 ? Optional.empty() : Optional.of(existingLog);
        });

        // save 抛唯一约束冲突
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate entry for order_id"));

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        Long result = service.deduct(userId, deductAmount, orderId,
                WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-conflict");

        assertEquals(Long.valueOf(900L), result,
                "幂等冲突时应返回已存在流水的 balanceAfter");
    }

    // ============================================================
    // 并发测试
    // ============================================================

    /**
     * 测试 7：并发扣减 - 10 个不同 orderId 并发扣减同一用户，余额 1000 分，每次扣 100 分。
     *
     * <p>验证：</p>
     * <ul>
     *   <li>所有 10 次扣减成功（每个 orderId 不同，不触发幂等）</li>
     *   <li>最终余额为 0（无超发）</li>
     *   <li>所有 10 条流水被写入</li>
     * </ul>
     *
     * <p>模拟悲观锁：使用 synchronized 块包装 deduct 调用，模拟 SELECT...FOR UPDATE
     * 的串行化效果（同一用户同时只有一个事务能修改余额）。
     * 真实的并发安全由数据库悲观锁保证，本单元测试验证 WalletServiceImpl 在串行化访问下的
     * 逻辑正确性。</p>
     */
    @Test
    @DisplayName("测试 7：10 个不同 orderId 并发扣减 → 全部成功，余额 0，无超发")
    void deduct_concurrentDifferentOrderIds_allSucceedNoOversell() throws InterruptedException {
        Long userId = 2001L;
        long initialBalance = 1000L;
        long deductAmount = 100L;
        int threadCount = 10;

        UserWallet wallet = newWallet(userId, initialBalance);
        Object walletLock = new Object();

        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(transactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        // Act：10 个线程并发扣减，每个线程使用不同 orderId
        // synchronized 包装 deduct 调用，模拟 SELECT...FOR UPDATE 串行化
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final String orderId = "ORDER-CONC-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        synchronized (walletLock) {
                            Long result = service.deduct(userId, deductAmount, orderId,
                                    WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-" + orderId);
                            assertNotNull(result);
                            successCount.incrementAndGet();
                        }
                    } catch (RuntimeException e) {
                        failureCount.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertTrue(finished, "所有并发线程应在超时前完成");
        assertEquals(threadCount, successCount.get(),
                "所有 10 个不同 orderId 应全部扣减成功，实际: " + successCount.get());
        assertEquals(0, failureCount.get(), "无失败");
        assertEquals(Long.valueOf(0L), wallet.getBalanceCents(),
                "10 次扣减 100 后余额应为 0，实际: " + wallet.getBalanceCents());
        verify(transactionLogRepository, times(threadCount)).save(any(WalletTransactionLog.class));
    }

    /**
     * 测试 8：并发扣减 - 100 个不同 orderId 并发扣减同一用户，余额 1000 分，每次扣 100 分。
     *
     * <p>验证：仅前 10 次扣减成功，后 90 次余额不足抛 InsufficientBalanceException。
     * 验证无超发（最终余额 = 0，不会变成负数）。</p>
     *
     * <p>模拟悲观锁：使用 synchronized 块包装 deduct 调用，模拟 SELECT...FOR UPDATE
     * 的串行化效果。</p>
     */
    @Test
    @DisplayName("测试 8：100 并发扣减 → 仅 10 次成功，90 次余额不足，最终余额 0")
    void deduct_concurrentOversellOnly10Succeed() throws InterruptedException {
        Long userId = 2002L;
        long initialBalance = 1000L;
        long deductAmount = 100L;

        UserWallet wallet = newWallet(userId, initialBalance);
        Object walletLock = new Object();

        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(transactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientCount = new AtomicInteger(0);
        AtomicInteger otherFailureCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENCY);
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);

        for (int i = 0; i < CONCURRENCY; i++) {
            final String orderId = "ORDER-OVERSELL-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        synchronized (walletLock) {
                            service.deduct(userId, deductAmount, orderId,
                                    WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-" + orderId);
                            successCount.incrementAndGet();
                        }
                    } catch (InsufficientBalanceException e) {
                        insufficientCount.incrementAndGet();
                    } catch (RuntimeException e) {
                        otherFailureCount.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertTrue(finished, "所有并发线程应在超时前完成");
        assertEquals(10, successCount.get(),
                "仅 10 次扣减应成功（余额 1000 / 每次 100），实际: " + successCount.get());
        assertEquals(90, insufficientCount.get(),
                "90 次应抛 InsufficientBalanceException，实际: " + insufficientCount.get());
        assertEquals(0, otherFailureCount.get(), "无其他异常");
        // 关键断言：最终余额为 0，不超发
        assertEquals(Long.valueOf(0L), wallet.getBalanceCents(),
                "并发扣减后余额应为 0（不超发），实际: " + wallet.getBalanceCents());
    }

    /**
     * 测试 9：并发充值 - 10 个不同 orderId 并发充值同一用户，每次 100 分。
     *
     * <p>验证：所有 10 次充值成功，最终余额 = 10 * 100 = 1000 分。</p>
     *
     * <p>模拟悲观锁：使用 synchronized 块包装 recharge 调用，模拟 SELECT...FOR UPDATE
     * 的串行化效果。</p>
     */
    @Test
    @DisplayName("测试 9：10 并发充值 → 全部成功，余额 1000")
    void recharge_concurrentDifferentOrderIds_allSucceed() throws InterruptedException {
        Long userId = 2003L;
        long initialBalance = 0L;
        long rechargeAmount = 100L;
        int threadCount = 10;

        UserWallet wallet = newWallet(userId, initialBalance);
        Object walletLock = new Object();

        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(transactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        AtomicInteger successCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final String orderId = "ORDER-RECHARGE-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        synchronized (walletLock) {
                            service.recharge(userId, rechargeAmount, orderId,
                                    WalletTransactionLog.RELATED_TYPE_RED_PACKET_CLAIM, "rp-" + orderId);
                            successCount.incrementAndGet();
                        }
                    } catch (RuntimeException e) {
                        // 不预期失败
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertTrue(finished, "所有并发线程应在超时前完成");
        assertEquals(threadCount, successCount.get(),
                "所有 10 次充值应成功，实际: " + successCount.get());
        assertEquals(Long.valueOf(1000L), wallet.getBalanceCents(),
                "10 次充值 100 后余额应为 1000，实际: " + wallet.getBalanceCents());
    }

    /**
     * 测试 10：相同 orderId 并发调用 deduct 10 次。
     *
     * <p>验证：仅 1 次实际扣减，9 次命中幂等返回相同结果。
     * 模拟唯一索引：使用 ConcurrentHashMap.putIfAbsent，
     * 首个线程成功插入，其余线程抛 DataIntegrityViolationException
     * 被服务层捕获后重新查询返回。</p>
     *
     * <p>模拟悲观锁：使用 synchronized 块包装 deduct 调用，模拟 SELECT...FOR UPDATE
     * 的串行化效果。串行化下，首个线程完成扣减 + 写流水，后续线程在 findByOrderId
     * 阶段命中幂等直接返回。</p>
     */
    @Test
    @DisplayName("测试 10：相同 orderId 并发调用 deduct 10 次 → 仅 1 次实际扣减")
    void deduct_concurrentSameOrderId_onlyOneActualDeduction() throws InterruptedException {
        Long userId = 2004L;
        long initialBalance = 1000L;
        long deductAmount = 100L;
        String orderId = "ORDER-SAME-CONCURRENT-001";

        UserWallet wallet = newWallet(userId, initialBalance);
        Object walletLock = new Object();

        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.of(wallet));
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // 模拟唯一索引：使用 ConcurrentHashMap.putIfAbsent
        ConcurrentHashMap<String, WalletTransactionLog> orderIdIndex = new ConcurrentHashMap<>();

        // findByOrderId：返回当前已存在的流水（首次为空）
        when(transactionLogRepository.findByOrderId(orderId))
                .thenAnswer(inv -> Optional.ofNullable(orderIdIndex.get(orderId)));

        // save：putIfAbsent 模拟唯一约束，首个线程成功，其余抛冲突
        when(transactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> {
                    WalletTransactionLog entry = inv.getArgument(0);
                    WalletTransactionLog existing = orderIdIndex.putIfAbsent(orderId, entry);
                    if (existing != null) {
                        throw new DataIntegrityViolationException(
                                "Duplicate entry for order_id");
                    }
                    return entry;
                });

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(10);
        ExecutorService executor = Executors.newFixedThreadPool(10);

        for (int i = 0; i < 10; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        synchronized (walletLock) {
                            Long result = service.deduct(userId, deductAmount, orderId,
                                    WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "renewal-same");
                            assertNotNull(result);
                            successCount.incrementAndGet();
                        }
                    } catch (RuntimeException e) {
                        failureCount.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertTrue(finished, "所有并发线程应在超时前完成");
        // 所有 10 次调用都应返回成功（1 次实际扣减 + 9 次幂等返回）
        assertEquals(10, successCount.get(),
                "所有 10 次调用应返回成功（含幂等），实际: " + successCount.get());
        assertEquals(0, failureCount.get(), "无失败");
        // wallet 余额仅扣减一次
        assertEquals(Long.valueOf(900L), wallet.getBalanceCents(),
                "相同 orderId 应仅扣减一次，余额 900，实际: " + wallet.getBalanceCents());
    }

    // ============================================================
    // 边界与参数校验测试
    // ============================================================

    /**
     * 测试 11：deduct 参数校验 - userId 为空抛 IllegalArgumentException。
     */
    @Test
    @DisplayName("测试 11：deduct userId 为 null → 抛 IllegalArgumentException")
    void deduct_nullUserId_throwsIllegalArgument() {
        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);
        assertThrows(IllegalArgumentException.class, () ->
                service.deduct(null, 100L, "ORDER-X", "VIP_RENEW", "r-1"));
    }

    /**
     * 测试 12：deduct 参数校验 - amountCents <= 0 抛 IllegalArgumentException。
     */
    @Test
    @DisplayName("测试 12：deduct amountCents <= 0 → 抛 IllegalArgumentException")
    void deduct_nonPositiveAmount_throwsIllegalArgument() {
        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);
        assertThrows(IllegalArgumentException.class, () ->
                service.deduct(1L, 0L, "ORDER-X", "VIP_RENEW", "r-1"));
        assertThrows(IllegalArgumentException.class, () ->
                service.deduct(1L, -100L, "ORDER-X", "VIP_RENEW", "r-1"));
    }

    /**
     * 测试 13：deduct 参数校验 - orderId 为空抛 IllegalArgumentException。
     */
    @Test
    @DisplayName("测试 13：deduct orderId 为空 → 抛 IllegalArgumentException")
    void deduct_blankOrderId_throwsIllegalArgument() {
        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);
        assertThrows(IllegalArgumentException.class, () ->
                service.deduct(1L, 100L, null, "VIP_RENEW", "r-1"));
        assertThrows(IllegalArgumentException.class, () ->
                service.deduct(1L, 100L, "  ", "VIP_RENEW", "r-1"));
    }

    /**
     * 测试 14：deduct 参数校验 - relatedType 为空抛 IllegalArgumentException。
     */
    @Test
    @DisplayName("测试 14：deduct relatedType 为空 → 抛 IllegalArgumentException")
    void deduct_blankRelatedType_throwsIllegalArgument() {
        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);
        assertThrows(IllegalArgumentException.class, () ->
                service.deduct(1L, 100L, "ORDER-X", null, "r-1"));
    }

    /**
     * 测试 15：getBalance 钱包不存在时返回 0。
     */
    @Test
    @DisplayName("测试 15：getBalance 钱包不存在 → 返回 0")
    void getBalance_walletNotExists_returnsZero() {
        when(userWalletRepository.findByUserId(9999L)).thenReturn(Optional.empty());
        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);
        Long balance = service.getBalance(9999L);
        assertEquals(Long.valueOf(0L), balance, "钱包不存在时余额应返回 0");
    }

    /**
     * 测试 16：getBalance 钱包存在时返回正确余额。
     */
    @Test
    @DisplayName("测试 16：getBalance 钱包存在 → 返回正确余额")
    void getBalance_walletExists_returnsBalance() {
        UserWallet wallet = newWallet(8888L, 1500L);
        when(userWalletRepository.findByUserId(8888L)).thenReturn(Optional.of(wallet));
        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);
        Long balance = service.getBalance(8888L);
        assertEquals(Long.valueOf(1500L), balance);
    }

    /**
     * 测试 17：deduct 钱包不存在时自动初始化（余额 0），随后余额不足抛异常。
     *
     * <p>验证 WalletServiceImpl 的钱包自动初始化逻辑：</p>
     * <ul>
     *   <li>findByUserIdForUpdate 返回空时，调用 initWallet 创建余额 0 的钱包</li>
     *   <li>新钱包余额 0，扣减时余额不足抛 InsufficientBalanceException</li>
     * </ul>
     */
    @Test
    @DisplayName("测试 17：deduct 钱包不存在 → 自动初始化后余额不足抛异常")
    void deduct_walletNotExists_autoInitThenInsufficientBalance() {
        Long userId = 9999L;
        when(userWalletRepository.findByUserIdForUpdate(userId))
                .thenReturn(Optional.empty());
        // 模拟 initWallet 的 save 调用
        when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(transactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());

        WalletServiceImpl service = new WalletServiceImpl(userWalletRepository, transactionLogRepository);

        InsufficientBalanceException ex = assertThrows(
                InsufficientBalanceException.class,
                () -> service.deduct(userId, 100L, "ORDER-AUTOINIT",
                        WalletTransactionLog.RELATED_TYPE_VIP_RENEW, "r-auto"));

        assertEquals(Long.valueOf(0L), ex.getBalanceCents(),
                "自动初始化的钱包余额为 0，余额不足时应抛异常并携带当前余额 0");
    }

    // ============================================================
    // 辅助方法
    // ============================================================

    /**
     * 创建测试用钱包实体。
     */
    private UserWallet newWallet(Long userId, long balanceCents) {
        UserWallet wallet = new UserWallet();
        wallet.setId((long) System.identityHashCode(wallet));
        wallet.setUserId(userId);
        wallet.setBalanceCents(balanceCents);
        wallet.setFrozenCents(0L);
        wallet.setVersion(0L);
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        wallet.setCreatedAt(now);
        wallet.setUpdatedAt(now);
        return wallet;
    }
}
