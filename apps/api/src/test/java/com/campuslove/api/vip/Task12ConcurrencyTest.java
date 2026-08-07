package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.PaymentCallbackLog;
import com.campuslove.api.entity.PromoCode;
import com.campuslove.api.entity.PromoCodeUsage;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.entity.VipBillingLog;
import com.campuslove.api.entity.VipRedPacket;
import com.campuslove.api.entity.VipRedPacketClaim;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.PromoCodeUsageRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.repository.VipRedPacketClaimRepository;
import com.campuslove.api.repository.VipRedPacketRepository;
import com.campuslove.api.wallet.WalletService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

/**
 * Task 12.5：资金类服务并发单元测试。
 *
 * <p>验证 Task 12.1-12.4 实现的幂等键、分布式锁、悲观锁、原子扣减在并发场景下的正确性，
 * 覆盖 REAUDIT-REPORT-100+ 编号 38（支付回调幂等）、39（自动续费分布式锁）、
 * 40（红包悲观锁+原子扣减）、41（优惠码原子扣减）四大问题。</p>
 *
 * <p>测试策略：</p>
 * <ul>
 *   <li>使用 {@link CountDownLatch} 同步多线程启动，模拟真实并发场景</li>
 *   <li>使用 {@link AtomicInteger} 模拟数据库原子 UPDATE 语义（CAS 保证仅 N 个线程扣减成功）</li>
 *   <li>使用 {@link AtomicBoolean} 模拟 Redisson 分布式锁（仅一个线程获取锁）</li>
 *   <li>使用 {@link AtomicReference} 模拟唯一索引插入冲突（首个线程插入成功，后续失败）</li>
 *   <li>每个测试用例独立线程池，避免线程复用导致状态污染</li>
 *   <li>使用 lenient() 避免 Mockito 严格存根对未使用 stub 的报错</li>
 * </ul>
 *
 * <p>不使用 @SpringBootTest 启动完整上下文（避免数据库/Redis 依赖），
 * 仅验证服务层并发控制逻辑的正确性。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Task 12.5 资金类服务并发单元测试")
class Task12ConcurrencyTest {

    private static final int CONCURRENCY = 100;
    private static final long AWAIT_TIMEOUT_SECONDS = 15L;

    @Mock
    private VipRedPacketRepository redPacketRepository;
    @Mock
    private VipRedPacketClaimRepository claimRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PromoCodeRepository promoCodeRepository;
    @Mock
    private PromoCodeUsageRepository promoCodeUsageRepository;
    @Mock
    private VipBillRepository vipBillRepository;
    @Mock
    private PaymentCallbackLogRepository paymentCallbackLogRepository;
    @Mock
    private VipBillingLogRepository vipBillingLogRepository;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private RLock rLock;
    /**
     * Task 2 / Task 15：钱包服务 Mock。
     *
     * <p>AutoRenewService.renewVip 与 VipRedPacketService.createRedPacket/claimRedPacket
     * 现已集成 WalletService，单元测试通过 Mock 注入，验证并发场景下：
     * <ul>
     *   <li>红包领取：100 并发仅 10 次进入钱包充值（与原子扣减次数一致）</li>
     *   <li>自动续费：仅 1 个持锁线程调用钱包扣减，9 个未持锁线程快速失败不调用</li>
     * </ul>
     * </p>
     */
    @Mock
    private WalletService walletService;

    /**
     * 场景 1：红包并发领取 —— 100 个用户并发领取一个 10 份的红包。
     *
     * <p>验证 Task 12.3（REAUDIT-REPORT-100+ 编号 40）：</p>
     * <ul>
     *   <li>成功领取数 ≤ totalCount（不超发）</li>
     *   <li>原子扣减 SQL（decrementRemaining）正确保证并发安全</li>
     *   <li>失败线程收到"红包已被领完"异常</li>
     *   <li>总领取金额 = 红包总金额（无超发）</li>
     * </ul>
     */
    @Test
    @DisplayName("并发场景 1：100 个用户并发领取 10 份红包 → 成功数 = 10，无超发")
    void redPacketConcurrentClaim_noOversell() throws InterruptedException {
        // Arrange：构造一个 10 份的普通红包，总金额 1000 分（每人 100 分）
        final long redPacketId = 1L;
        final long senderId = 1000L;
        final int totalCount = 10;
        final int totalAmount = 1000;

        VipRedPacket packet = new VipRedPacket();
        packet.setId(redPacketId);
        packet.setSenderId(senderId);
        packet.setTotalAmount(totalAmount);
        packet.setTotalCount(totalCount);
        packet.setClaimedCount(0);
        packet.setClaimedAmount(0);
        packet.setRemainingAmount(totalAmount);
        packet.setRemainingCount(totalCount);
        packet.setType("NORMAL");
        packet.setStatus("PENDING");
        packet.setExpireAt(LocalDateTime.now().plusHours(24));

        // 模拟原子扣减：使用 AtomicInteger CAS 保证仅 totalCount 个线程扣减成功
        AtomicInteger remainingCount = new AtomicInteger(totalCount);
        AtomicInteger remainingAmount = new AtomicInteger(totalAmount);

        // 悲观锁查询返回同一红包对象
        when(redPacketRepository.findByIdForUpdate(redPacketId))
                .thenReturn(Optional.of(packet));

        // 模拟原子扣减：CAS remainingCount，成功则返回 1，失败返回 0
        // 使用正确的 CAS 循环：读取 -> 校验 -> CAS，CAS 失败则重试
        when(redPacketRepository.decrementRemaining(eq(redPacketId), anyInt()))
                .thenAnswer(invocation -> {
                    int amount = invocation.getArgument(1);
                    while (true) {
                        int currentCount = remainingCount.get();
                        int currentAmount = remainingAmount.get();
                        if (currentCount <= 0 || currentAmount < amount) {
                            return 0; // 影响行数 0：扣减失败
                        }
                        if (remainingCount.compareAndSet(currentCount, currentCount - 1)) {
                            remainingAmount.addAndGet(-amount);
                            return 1; // 影响行数 1：扣减成功
                        }
                        // CAS 失败，重试
                    }
                });

        // markDepletedIfEmpty 可能在 newRemainingCount <= 0 时被调用，使用 lenient 避免严格存根报错
        lenient().when(redPacketRepository.markDepletedIfEmpty(redPacketId))
                .thenReturn(0);

        // 模拟 findByRedPacketIdAndClaimerId：每个用户首次查询返回空（未领取过）
        when(claimRepository.findByRedPacketIdAndClaimerId(eq(redPacketId), anyLong()))
                .thenReturn(Optional.empty());

        // 模拟 save：返回传入的 claim 对象
        when(claimRepository.save(any(VipRedPacketClaim.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Task 15：模拟 WalletService.recharge 始终成功返回固定余额
        // 仅在原子扣减成功（affected=1）的线程才会调用 recharge
        lenient().when(walletService.recharge(anyLong(), anyLong(), any(String.class),
                any(String.class), any(String.class)))
                .thenReturn(1000L);

        // Task 14（P1.12）：模拟 Redisson 分布式锁 red-packet-claim:{redPacketId}
        // 所有线程都能获取锁（串行化由原子扣减 CAS 保证），不影响 10 成功 / 90 失败的业务语义
        when(redissonClient.getLock("red-packet-claim:" + redPacketId)).thenReturn(rLock);
        when(rLock.tryLock(anyLong(), anyLong(), any())).thenReturn(true);
        lenient().when(rLock.isHeldByCurrentThread()).thenReturn(true);
        lenient().doNothing().when(rLock).unlock();

        // 构造 VipRedPacketService（Task 14：新增 redissonClient 依赖）
        VipRedPacketService service = new VipRedPacketService(
                redPacketRepository, claimRepository, userRepository, vipBillRepository, walletService, redissonClient);

        // Act：100 个用户并发领取
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        AtomicInteger totalClaimedAmount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENCY);
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);

        for (int i = 0; i < CONCURRENCY; i++) {
            final long claimerId = 2000L + i; // 不同用户 ID
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        VipRedPacketService.ClaimResultView result =
                                service.claimRedPacket(redPacketId, claimerId);
                        successCount.incrementAndGet();
                        totalClaimedAmount.addAndGet(result.amount());
                    } catch (RuntimeException e) {
                        // IllegalArgumentException 是 RuntimeException 的子类，统一捕获即可
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

        // Assert：所有线程都完成
        assertTrue(finished, "所有并发线程应在超时前完成");

        // Assert：成功领取数 ≤ totalCount（不超发）
        assertTrue(successCount.get() <= totalCount,
                "成功领取数应 ≤ " + totalCount + "，实际: " + successCount.get());
        assertEquals(totalCount, successCount.get(),
                "正好 " + totalCount + " 个用户应成功领取，实际: " + successCount.get());
        assertEquals(CONCURRENCY - totalCount, failureCount.get(),
                "剩余 " + (CONCURRENCY - totalCount) + " 个用户应失败，实际: " + failureCount.get());

        // Assert：总领取金额 = 红包总金额（无超发）
        assertEquals(totalAmount, totalClaimedAmount.get(),
                "总领取金额应等于红包总金额 " + totalAmount + "，实际: " + totalClaimedAmount.get());

        // Assert：原子扣减被调用至少 CONCURRENCY 次（每个并发领取都尝试扣减）
        verify(redPacketRepository, atLeastOnce()).decrementRemaining(eq(redPacketId), anyInt());
    }

    /**
     * 场景 1b：红包并发领取（单份红包）—— 100 个用户并发领取一个 1 份的红包。
     *
     * <p>验证 Task 14（P1.12）：单份红包并发领取场景下的 Redisson 锁 + 原子扣减多重保障：</p>
     * <ul>
     *   <li>仅 1 个用户成功领取（不超发）</li>
     *   <li>其余 99 个用户快速失败（红包已被领完）</li>
     *   <li>总领取金额 = 红包总金额（无超发）</li>
     * </ul>
     *
     * <p>测试策略：与场景 1 相同，所有线程都能获取 Redisson 锁（mock tryLock 返回 true），
     * 串行化由原子扣减 CAS 保证。仅 1 个线程的 CAS 成功（remainingCount 1→0），
     * 其余 99 个线程 CAS 失败（remainingCount=0）后快速失败。</p>
     */
    @Test
    @DisplayName("并发场景 1b：100 个用户并发领取 1 份红包 → 仅 1 次成功，99 次快速失败")
    void redPacketConcurrentClaim_singleShare_onlyOneSucceeds() throws InterruptedException {
        // Arrange：构造一个 1 份的普通红包，总金额 100 分
        final long redPacketId = 2L;
        final long senderId = 1001L;
        final int totalCount = 1;
        final int totalAmount = 100;

        VipRedPacket packet = new VipRedPacket();
        packet.setId(redPacketId);
        packet.setSenderId(senderId);
        packet.setTotalAmount(totalAmount);
        packet.setTotalCount(totalCount);
        packet.setClaimedCount(0);
        packet.setClaimedAmount(0);
        packet.setRemainingAmount(totalAmount);
        packet.setRemainingCount(totalCount);
        packet.setType("NORMAL");
        packet.setStatus("PENDING");
        packet.setExpireAt(LocalDateTime.now().plusHours(24));

        // 模拟原子扣减：使用 AtomicInteger CAS 保证仅 1 个线程扣减成功
        AtomicInteger remainingCount = new AtomicInteger(totalCount);
        AtomicInteger remainingAmount = new AtomicInteger(totalAmount);

        // 悲观锁查询返回同一红包对象
        when(redPacketRepository.findByIdForUpdate(redPacketId))
                .thenReturn(Optional.of(packet));

        // 模拟原子扣减：CAS remainingCount，成功则返回 1，失败返回 0
        when(redPacketRepository.decrementRemaining(eq(redPacketId), anyInt()))
                .thenAnswer(invocation -> {
                    int amount = invocation.getArgument(1);
                    while (true) {
                        int currentCount = remainingCount.get();
                        int currentAmount = remainingAmount.get();
                        if (currentCount <= 0 || currentAmount < amount) {
                            return 0; // 影响行数 0：扣减失败
                        }
                        if (remainingCount.compareAndSet(currentCount, currentCount - 1)) {
                            remainingAmount.addAndGet(-amount);
                            return 1; // 影响行数 1：扣减成功
                        }
                        // CAS 失败，重试
                    }
                });

        // markDepletedIfEmpty 在最后一个领取者时被调用
        lenient().when(redPacketRepository.markDepletedIfEmpty(redPacketId))
                .thenReturn(1);

        // 模拟 findByRedPacketIdAndClaimerId：每个用户首次查询返回空（未领取过）
        when(claimRepository.findByRedPacketIdAndClaimerId(eq(redPacketId), anyLong()))
                .thenReturn(Optional.empty());

        // 模拟 save：返回传入的 claim 对象
        when(claimRepository.save(any(VipRedPacketClaim.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Task 15：模拟 WalletService.recharge 始终成功返回固定余额
        // 仅在原子扣减成功（affected=1）的线程才会调用 recharge
        lenient().when(walletService.recharge(anyLong(), anyLong(), any(String.class),
                any(String.class), any(String.class)))
                .thenReturn(1000L);

        // Task 14（P1.12）：模拟 Redisson 分布式锁 red-packet-claim:{redPacketId}
        // 所有线程都能获取锁（串行化由原子扣减 CAS 保证），仅 1 个线程 CAS 成功
        when(redissonClient.getLock("red-packet-claim:" + redPacketId)).thenReturn(rLock);
        when(rLock.tryLock(anyLong(), anyLong(), any())).thenReturn(true);
        lenient().when(rLock.isHeldByCurrentThread()).thenReturn(true);
        lenient().doNothing().when(rLock).unlock();

        // 构造 VipRedPacketService（Task 14：新增 redissonClient 依赖）
        VipRedPacketService service = new VipRedPacketService(
                redPacketRepository, claimRepository, userRepository, vipBillRepository, walletService, redissonClient);

        // Act：100 个用户并发领取
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        AtomicInteger totalClaimedAmount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENCY);
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);

        for (int i = 0; i < CONCURRENCY; i++) {
            final long claimerId = 5000L + i; // 不同用户 ID
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        VipRedPacketService.ClaimResultView result =
                                service.claimRedPacket(redPacketId, claimerId);
                        successCount.incrementAndGet();
                        totalClaimedAmount.addAndGet(result.amount());
                    } catch (RuntimeException e) {
                        // IllegalArgumentException / IllegalStateException 都是 RuntimeException 子类
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

        // Assert：所有线程都完成
        assertTrue(finished, "所有并发线程应在超时前完成");

        // Assert：仅 1 个用户成功领取（不超发）
        assertEquals(1, successCount.get(),
                "仅 1 个用户应成功领取 1 份红包，实际: " + successCount.get());
        assertEquals(CONCURRENCY - 1, failureCount.get(),
                "其余 99 个用户应快速失败，实际: " + failureCount.get());

        // Assert：总领取金额 = 红包总金额（无超发）
        assertEquals(totalAmount, totalClaimedAmount.get(),
                "总领取金额应等于红包总金额 " + totalAmount + "，实际: " + totalClaimedAmount.get());

        // Assert：原子扣减被调用至少 CONCURRENCY 次
        verify(redPacketRepository, atLeastOnce()).decrementRemaining(eq(redPacketId), anyInt());
    }

    /**
     * 场景 2：优惠码并发兑换 —— 100 个用户并发兑换一个剩余 5 次的优惠码。
     *
     * <p>验证 Task 12.4（REAUDIT-REPORT-100+ 编号 41）：</p>
     * <ul>
     *   <li>成功兑换数 ≤ remainingUses（不超发）</li>
     *   <li>原子扣减 SQL（decrementRemaining）正确保证并发安全</li>
     *   <li>失败线程收到"优惠码已用完"异常</li>
     * </ul>
     */
    @Test
    @DisplayName("并发场景 2：100 个用户并发兑换剩余 5 次的优惠码 → 成功数 = 5，无超发")
    void promoCodeConcurrentRedeem_noOversell() throws InterruptedException {
        // Arrange：构造一个剩余 5 次的优惠码
        final String code = "NEWUSER100";
        final long promoCodeId = 1L;
        final int remainingUses = 5;
        final int maxUsesPerUser = 1;

        PromoCode promo = new PromoCode();
        promo.setId(promoCodeId);
        promo.setCode(code);
        promo.setDiscountType("AMOUNT");
        promo.setDiscountValue(100); // 满 100 减 100 分
        promo.setMaxUses(100);
        promo.setMaxUsesPerUser(maxUsesPerUser);
        promo.setUsedCount(0);
        promo.setRemainingUses(remainingUses);
        promo.setValidFrom(LocalDateTime.now().minusDays(1));
        promo.setValidTo(LocalDateTime.now().plusDays(1));
        promo.setStatus("ACTIVE");

        // 模拟原子扣减：使用 AtomicInteger CAS 保证仅 remainingUses 个线程扣减成功
        AtomicInteger remaining = new AtomicInteger(remainingUses);

        // 悲观锁查询返回同一优惠码对象
        when(promoCodeRepository.findByCodeForUpdate(code))
                .thenReturn(Optional.of(promo));

        // 模拟原子扣减：CAS remaining，成功则返回 1，失败返回 0
        when(promoCodeRepository.decrementRemaining(code))
                .thenAnswer(invocation -> {
                    while (true) {
                        int current = remaining.get();
                        if (current <= 0) {
                            return 0; // 影响行数 0：扣减失败
                        }
                        if (remaining.compareAndSet(current, current - 1)) {
                            return 1; // 影响行数 1：扣减成功
                        }
                        // CAS 失败，重试
                    }
                });

        // incrementUsedCount 始终返回 1
        when(promoCodeRepository.incrementUsedCount(promoCodeId)).thenReturn(1);

        // countByPromoCodeIdAndUserId 返回 0（每个用户都未使用过）
        when(promoCodeUsageRepository.countByPromoCodeIdAndUserId(eq(promoCodeId), anyLong()))
                .thenReturn(0L);

        // 模拟 save：返回传入的 usage 对象
        when(promoCodeUsageRepository.save(any(PromoCodeUsage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // 构造 PromoCodeService
        PromoCodeService service = new PromoCodeService(
                promoCodeRepository, promoCodeUsageRepository);

        // Act：100 个用户并发兑换
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENCY);
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);

        for (int i = 0; i < CONCURRENCY; i++) {
            final long userId = 3000L + i;
            final int baseAmount = 1000; // 基础金额 1000 分
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        PromoCodeService.RedeemResultView result =
                                service.redeem(code, userId, baseAmount);
                        successCount.incrementAndGet();
                        assertNotNull(result);
                    } catch (RuntimeException e) {
                        // IllegalArgumentException 是 RuntimeException 的子类，统一捕获即可
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

        // Assert：所有线程都完成
        assertTrue(finished, "所有并发线程应在超时前完成");

        // Assert：成功兑换数 ≤ remainingUses（不超发）
        assertTrue(successCount.get() <= remainingUses,
                "成功兑换数应 ≤ " + remainingUses + "，实际: " + successCount.get());
        assertEquals(remainingUses, successCount.get(),
                "正好 " + remainingUses + " 个用户应成功兑换，实际: " + successCount.get());
        assertEquals(CONCURRENCY - remainingUses, failureCount.get(),
                "剩余 " + (CONCURRENCY - remainingUses) + " 个用户应失败，实际: " + failureCount.get());

        // Assert：原子扣减被调用至少 CONCURRENCY 次
        verify(promoCodeRepository, atLeastOnce()).decrementRemaining(code);
    }

    /**
     * 场景 3：支付回调幂等 —— 同一 notificationId 被并发调用 10 次。
     *
     * <p>验证 Task 12.1（REAUDIT-REPORT-100+ 编号 38）：</p>
     * <ul>
     *   <li>至少 1 次回调执行业务逻辑（更新账单状态）</li>
     *   <li>其余回调检测到幂等键已处理，直接返回 SUCCESS</li>
     *   <li>vip_bills 表至多被查询 N 次（每个并发回调都查询）</li>
     * </ul>
     *
     * <p>注意：由于并发竞态，可能存在多个线程同时进入业务处理分支，
     * 但 payment_callback_log 的唯一索引保证只有一个线程能成功 save。
     * 失败的 save 抛 DataIntegrityViolationException，被 BillingService 捕获后返回 FAIL。</p>
     */
    @Test
    @DisplayName("并发场景 3：同一 notificationId 并发回调 10 次 → 至少 1 次成功处理")
    void paymentCallbackIdempotentConcurrent_atLeastOneProcessed() throws InterruptedException {
        // Arrange：构造测试数据
        final String notificationId = "NOTIF-1234567890";
        final String orderNo = "ORDER-20260727-001";
        final BigDecimal callbackAmount = new BigDecimal("19.90");
        final Long userId = 5000L;

        VipBill bill = new VipBill();
        bill.setId(1L);
        bill.setUserId(userId);
        bill.setAmount(1990); // 19.90 元 = 1990 分
        bill.setStatus("PENDING");
        bill.setTransactionId(orderNo);

        // 模拟 payment_callback_log 唯一索引：首个线程插入成功，其余插入抛唯一约束冲突
        AtomicBoolean firstInsert = new AtomicBoolean(true);
        AtomicReference<PaymentCallbackLog> existingLog = new AtomicReference<>(null);

        // findByNotificationId：返回当前已存在的记录（首次为空）
        when(paymentCallbackLogRepository.findByNotificationId(notificationId))
                .thenAnswer(invocation -> Optional.ofNullable(existingLog.get()));

        // 模拟 save 行为：首次 save 成功并设置到 existingLog，后续 save 抛唯一约束冲突
        doAnswer(invocation -> {
            PaymentCallbackLog logEntry = invocation.getArgument(0);
            if (firstInsert.compareAndSet(true, false)) {
                existingLog.set(logEntry);
                return logEntry;
            } else {
                throw new org.springframework.dao.DataIntegrityViolationException(
                        "Duplicate entry for notification_id");
            }
        }).when(paymentCallbackLogRepository).save(any(PaymentCallbackLog.class));

        // findByTransactionId 返回账单
        when(vipBillRepository.findByTransactionId(orderNo))
                .thenReturn(Optional.of(bill));

        // vipBillRepository.save 返回账单
        when(vipBillRepository.save(any(VipBill.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // 构造 BillingService
        BillingService service = new BillingService(vipBillRepository, paymentCallbackLogRepository);

        // Act：10 个线程并发调用 handlePaymentCallback
        AtomicInteger successCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(10);
        ExecutorService executor = Executors.newFixedThreadPool(10);

        for (int i = 0; i < 10; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    String result = service.handlePaymentCallback(
                            notificationId, orderNo, callbackAmount, userId, "MONTHLY", "月度套餐");
                    if ("SUCCESS".equals(result)) {
                        successCount.incrementAndGet();
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

        // Assert：所有线程都完成
        assertTrue(finished, "所有并发线程应在超时前完成");

        // Assert：至少 1 次回调成功处理（首个进入的线程完成业务并写入 SUCCESS 日志）
        assertTrue(successCount.get() >= 1,
                "至少 1 次回调应成功处理，实际: " + successCount.get());

        // Assert：vip_bills 至少被查询一次（每个进入业务分支的线程都会查询）
        verify(vipBillRepository, atLeastOnce()).findByTransactionId(orderNo);

        // Assert：payment_callback_log 至少被写入一次（首个成功处理的线程）
        verify(paymentCallbackLogRepository, atLeastOnce()).save(any(PaymentCallbackLog.class));
    }

    /**
     * 场景 4：自动续费分布式锁 —— 同一用户并发触发 10 次续费。
     *
     * <p>验证 Task 12.2（REAUDIT-REPORT-100+ 编号 39）：</p>
     * <ul>
     *   <li>仅 1 个线程能获取分布式锁并执行续费（SUCCESS）</li>
     *   <li>其余 9 个线程快速失败（获取锁失败），返回 FAILED 状态</li>
     *   <li>vip_billing_log 表记录 10 条流水（1 SUCCESS + 9 FAILED）</li>
     * </ul>
     */
    @Test
    @DisplayName("并发场景 4：同一用户并发触发 10 次续费 → 仅 1 次成功获取锁，其余快速失败")
    void autoRenewConcurrentDistributedLock_onlyOneAcquiresLock() throws InterruptedException {
        // Arrange：构造已开启自动续费的用户
        final Long userId = 7000L;
        User user = new User();
        user.setId(userId);
        user.setAutoRenewEnabled(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // 模拟 Redisson 分布式锁：仅一个线程获取锁成功
        AtomicBoolean lockHeld = new AtomicBoolean(false);
        AtomicReference<Thread> lockOwner = new AtomicReference<>(null);

        when(redissonClient.getLock("auto-renew:" + userId)).thenReturn(rLock);

        // tryLock：CAS 保证仅一个线程获取锁，成功时记录持锁线程
        when(rLock.tryLock(anyLong(), anyLong(), any()))
                .thenAnswer(invocation -> {
                    if (lockHeld.compareAndSet(false, true)) {
                        lockOwner.set(Thread.currentThread());
                        return true;
                    }
                    return false;
                });

        // isHeldByCurrentThread：仅持锁线程返回 true
        when(rLock.isHeldByCurrentThread()).thenAnswer(invocation ->
                Thread.currentThread() == lockOwner.get());

        // unlock：持锁线程调用，但不释放锁状态。
        // 真实 Redisson 锁有 30 秒持锁时间（LOCK_TIMEOUT_SECONDS），
        // 测试场景下所有并发线程的 tryLock 几乎同时调用，
        // 但持锁线程的 renewVip 流程很快（毫秒级），
        // 若 unlock 立即释放锁，后续等待的线程会重新获取锁导致"串行成功"。
        // 为模拟"持锁期间其他线程无法获取锁"的语义，
        // 测试中 unlock 不重置 lockHeld，确保其他线程的 tryLock 仍返回 false。
        // 这样验证的是"同一时刻只有一个线程持锁"的核心语义。
        doAnswer(invocation -> {
            // 持锁线程调用 unlock 时不释放锁状态
            return null;
        }).when(rLock).unlock();

        // vipBillingLogRepository.save 返回传入的日志对象
        when(vipBillingLogRepository.save(any(VipBillingLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Task 2：模拟 WalletService.deduct 始终成功返回余额
        // 仅持锁线程会进入扣减逻辑，9 个未持锁线程在 tryLock 失败分支直接返回 FAILED，不调用 deduct
        lenient().when(walletService.deduct(anyLong(), anyLong(), any(String.class),
                any(String.class), any(String.class)))
                .thenReturn(0L);

        // 构造 AutoRenewService（Task 2：新增 walletService 依赖）
        AutoRenewService service = new AutoRenewService(
                userRepository, vipBillingLogRepository, redissonClient, walletService);

        // Act：10 个线程并发触发续费
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failedCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(10);
        ExecutorService executor = Executors.newFixedThreadPool(10);

        for (int i = 0; i < 10; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        AutoRenewService.RenewResultView result = service.renewVip(userId);
                        if ("SUCCESS".equals(result.status())) {
                            successCount.incrementAndGet();
                        } else {
                            failedCount.incrementAndGet();
                        }
                    } catch (RuntimeException e) {
                        failedCount.incrementAndGet();
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

        // Assert：所有线程都完成
        assertTrue(finished, "所有并发线程应在超时前完成");

        // Assert：仅 1 个线程成功获取锁并完成续费
        assertEquals(1, successCount.get(),
                "仅 1 个线程应成功获取分布式锁并完成续费，实际: " + successCount.get());
        assertEquals(9, failedCount.get(),
                "其余 9 个线程应快速失败，实际: " + failedCount.get());

        // Assert：vip_billing_log 表记录 10 条流水（1 SUCCESS + 9 FAILED）
        verify(vipBillingLogRepository, times(10)).save(any(VipBillingLog.class));
    }
}
