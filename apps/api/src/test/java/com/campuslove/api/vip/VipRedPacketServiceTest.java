package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.VipRedPacket;
import com.campuslove.api.entity.VipRedPacketClaim;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipRedPacketClaimRepository;
import com.campuslove.api.repository.VipRedPacketRepository;
import com.campuslove.api.wallet.InsufficientBalanceException;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

/**
 * Task 14（P1.12）：VipRedPacketService 红包真实扣款单元测试。
 *
 * <p>验证红包创建/领取对接 {@link WalletService} 后的核心行为：</p>
 * <ul>
 *   <li>余额不足时创建红包失败，抛 {@link InsufficientBalanceException}</li>
 *   <li>正常创建红包调用 {@link WalletService#deduct} 扣减发送方余额</li>
 *   <li>领取红包调用 {@link WalletService#recharge} 充值领取方余额</li>
 *   <li>重复领取同一红包返回业务异常，不调用 recharge</li>
 *   <li>并发领取 1 份红包，仅 1 次成功，其余快速失败（原子扣减 + Redisson 锁）</li>
 * </ul>
 *
 * <p>测试策略：</p>
 * <ul>
 *   <li>使用 Mockito mock Repository / WalletService / RedissonClient，不依赖真实数据库/Redis</li>
 *   <li>使用 AtomicInteger CAS 模拟数据库原子 UPDATE 语义</li>
 *   <li>使用 CountDownLatch 同步多线程启动，模拟真实并发场景</li>
 *   <li>使用 lenient() 避免 Mockito 严格存根对 finally 块中 unlock 等调用的报错</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Task 14 VipRedPacketService 红包真实扣款单元测试")
class VipRedPacketServiceTest {

    private static final long AWAIT_TIMEOUT_SECONDS = 15L;

    @Mock
    private VipRedPacketRepository redPacketRepository;
    @Mock
    private VipRedPacketClaimRepository claimRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private WalletService walletService;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private RLock rLock;

    /**
     * 模拟 Redisson 锁获取成功（tryLock 返回 true，isHeldByCurrentThread 返回 true，unlock 无副作用）。
     *
     * <p>所有测试默认让锁获取成功，业务逻辑的并发安全由原子扣减 CAS 保证。
     * 测试关注的是 WalletService 集成逻辑，而非 Redisson 锁本身（锁行为由 Task12ConcurrencyTest 覆盖）。</p>
     *
     * @param lockKey 锁键
     * @throws InterruptedException 仅声明以匹配 RLock.tryLock 的受检异常签名，mock 场景下不会真正抛出
     */
    private void mockLockAcquired(String lockKey) throws InterruptedException {
        when(redissonClient.getLock(lockKey)).thenReturn(rLock);
        when(rLock.tryLock(anyLong(), anyLong(), any())).thenReturn(true);
        lenient().when(rLock.isHeldByCurrentThread()).thenReturn(true);
        lenient().doNothing().when(rLock).unlock();
    }

    /**
     * 构造测试用红包实体。
     */
    private VipRedPacket newPacket(Long id, Long senderId, int totalAmount, int totalCount, String status) {
        VipRedPacket p = new VipRedPacket();
        p.setId(id);
        p.setSenderId(senderId);
        p.setTotalAmount(totalAmount);
        p.setTotalCount(totalCount);
        p.setClaimedCount(0);
        p.setClaimedAmount(0);
        p.setRemainingAmount(totalAmount);
        p.setRemainingCount(totalCount);
        p.setType("NORMAL");
        p.setStatus(status);
        p.setExpireAt(LocalDateTime.now().plusHours(24));
        LocalDateTime now = LocalDateTime.now();
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        return p;
    }

    /**
     * 测试 1：余额不足时创建红包失败 → 抛 InsufficientBalanceException。
     *
     * <p>验证：</p>
     * <ul>
     *   <li>walletService.deduct 抛 InsufficientBalanceException 时，createRedPacket 向上抛出</li>
     *   <li>异常携带正确的 userId / amountCents / balanceCents</li>
     *   <li>deduct 被调用一次（红包记录先 save，再 deduct）</li>
     * </ul>
     *
     * <p>注：@Transactional 的事务回滚由 Spring 代理处理，单元测试不验证回滚（无真实事务）。
     * 但服务层正确抛出异常即可保证代理层回滚生效。</p>
     */
    @Test
    @DisplayName("测试 1：余额不足时创建红包失败 → 抛 InsufficientBalanceException")
    void createRedPacket_insufficientBalance_throwsException() throws InterruptedException {
        // Arrange
        Long senderId = 100L;
        Integer totalAmount = 1000;
        Integer totalCount = 1;

        when(userRepository.existsById(senderId)).thenReturn(true);
        when(redPacketRepository.save(any(VipRedPacket.class))).thenAnswer(inv -> {
            VipRedPacket p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });
        when(walletService.deduct(eq(senderId), eq(totalAmount.longValue()), anyString(),
                eq(WalletTransactionLog.RELATED_TYPE_RED_PACKET_SEND), eq("1")))
                .thenThrow(new InsufficientBalanceException(senderId, totalAmount.longValue(), 50L));
        mockLockAcquired("red-packet-create:" + senderId);

        VipRedPacketService service = new VipRedPacketService(
                redPacketRepository, claimRepository, userRepository, walletService, redissonClient);

        // Act & Assert
        InsufficientBalanceException ex = assertThrows(
                InsufficientBalanceException.class,
                () -> service.createRedPacket(senderId, totalAmount, totalCount, "NORMAL", null, null));

        assertEquals(senderId, ex.getUserId());
        assertEquals(Long.valueOf(1000L), ex.getAmountCents());
        assertEquals(Long.valueOf(50L), ex.getBalanceCents());
        // 验证 deduct 被调用（红包 save 后立即 deduct）
        verify(walletService).deduct(eq(senderId), eq(1000L), anyString(),
                eq(WalletTransactionLog.RELATED_TYPE_RED_PACKET_SEND), eq("1"));
    }

    /**
     * 测试 2：正常创建红包扣减余额 → 返回红包视图且调用 deduct。
     *
     * <p>验证：</p>
     * <ul>
     *   <li>红包 save 后调用 walletService.deduct 扣减发送方余额</li>
     *   <li>deduct 参数正确：userId=senderId, amountCents=totalAmount, relatedType=RED_PACKET_SEND,
     *       relatedId=红包ID</li>
     *   <li>返回的 RedPacketView 字段正确（id、senderId、totalAmount、status=PENDING 等）</li>
     * </ul>
     */
    @Test
    @DisplayName("测试 2：正常创建红包扣减余额 → 返回红包视图且调用 deduct")
    void createRedPacket_normal_deductsBalance() throws InterruptedException {
        // Arrange
        Long senderId = 101L;
        Integer totalAmount = 500;
        Integer totalCount = 5;

        when(userRepository.existsById(senderId)).thenReturn(true);
        when(redPacketRepository.save(any(VipRedPacket.class))).thenAnswer(inv -> {
            VipRedPacket p = inv.getArgument(0);
            p.setId(2L);
            return p;
        });
        when(walletService.deduct(eq(senderId), eq(totalAmount.longValue()), anyString(),
                eq(WalletTransactionLog.RELATED_TYPE_RED_PACKET_SEND), eq("2")))
                .thenReturn(500L); // 余额 1000 - 500 = 500
        mockLockAcquired("red-packet-create:" + senderId);

        VipRedPacketService service = new VipRedPacketService(
                redPacketRepository, claimRepository, userRepository, walletService, redissonClient);

        // Act
        VipRedPacketService.RedPacketView view = service.createRedPacket(
                senderId, totalAmount, totalCount, "NORMAL", "chat-1", "祝福");

        // Assert
        assertNotNull(view, "返回的红包视图不应为空");
        assertEquals(2L, view.id(), "红包 ID 应为 2");
        assertEquals(senderId, view.senderId(), "发送者 ID 应匹配");
        assertEquals(totalAmount, view.totalAmount(), "总金额应匹配");
        assertEquals(totalCount, view.totalCount(), "总个数应匹配");
        assertEquals("NORMAL", view.type(), "类型应为 NORMAL");
        assertEquals("chat-1", view.chatId(), "聊天 ID 应匹配");
        assertEquals("祝福", view.blessing(), "祝福语应匹配");
        assertEquals("PENDING", view.status(), "初始状态应为 PENDING");
        // 验证 deduct 被调用且参数正确
        verify(walletService).deduct(eq(senderId), eq(500L), anyString(),
                eq(WalletTransactionLog.RELATED_TYPE_RED_PACKET_SEND), eq("2"));
    }

    /**
     * 测试 3：领取红包充值余额 → 调用 recharge 且返回领取结果。
     *
     * <p>验证：</p>
     * <ul>
     *   <li>原子扣减成功后调用 walletService.recharge 充值领取方余额</li>
     *   <li>recharge 参数正确：userId=claimerId, amountCents=领取金额,
     *       orderId=RP-CLAIM-{redPacketId}-{claimerId}, relatedType=RED_PACKET_CLAIM,
     *       relatedId=红包ID</li>
     *   <li>返回的 ClaimResultView 字段正确（amount、claimedCount、totalCount）</li>
     *   <li>领取最后一份时调用 markDepletedIfEmpty 将红包状态置为 DEPLETED</li>
     * </ul>
     */
    @Test
    @DisplayName("测试 3：领取红包充值余额 → 调用 recharge 且返回领取结果")
    void claimRedPacket_normal_rechargesBalance() throws InterruptedException {
        // Arrange：1 份普通红包，总金额 100 分
        Long redPacketId = 10L;
        Long senderId = 200L;
        Long claimerId = 201L;
        int totalAmount = 100;
        int totalCount = 1;

        VipRedPacket packet = newPacket(redPacketId, senderId, totalAmount, totalCount, "PENDING");

        when(redPacketRepository.findByIdForUpdate(redPacketId)).thenReturn(Optional.of(packet));
        when(claimRepository.findByRedPacketIdAndClaimerId(redPacketId, claimerId))
                .thenReturn(Optional.empty());
        when(redPacketRepository.decrementRemaining(eq(redPacketId), anyInt())).thenReturn(1);
        when(claimRepository.save(any(VipRedPacketClaim.class))).thenAnswer(inv -> inv.getArgument(0));
        when(walletService.recharge(eq(claimerId), eq(100L), eq("RP-CLAIM-10-201"),
                eq(WalletTransactionLog.RELATED_TYPE_RED_PACKET_CLAIM), eq("10")))
                .thenReturn(100L);
        lenient().when(redPacketRepository.markDepletedIfEmpty(redPacketId)).thenReturn(1);
        mockLockAcquired("red-packet-claim:" + redPacketId);

        VipRedPacketService service = new VipRedPacketService(
                redPacketRepository, claimRepository, userRepository, walletService, redissonClient);

        // Act
        VipRedPacketService.ClaimResultView result = service.claimRedPacket(redPacketId, claimerId);

        // Assert
        assertNotNull(result, "领取结果不应为空");
        assertEquals(100, result.amount(), "领取金额应为 100（1 份 100 总额）");
        assertEquals(1, result.claimedCount(), "已领取数应为 1");
        assertEquals(1, result.totalCount(), "总个数应为 1");
        // 验证 recharge 被调用且参数正确（orderId = RP-CLAIM-{redPacketId}-{claimerId}）
        verify(walletService).recharge(eq(claimerId), eq(100L), eq("RP-CLAIM-10-201"),
                eq(WalletTransactionLog.RELATED_TYPE_RED_PACKET_CLAIM), eq("10"));
        // 验证最后一份领取后标记 DEPLETED
        verify(redPacketRepository).markDepletedIfEmpty(redPacketId);
    }

    /**
     * 测试 4：重复领取同一红包 → 抛 IllegalArgumentException 且不调用 recharge。
     *
     * <p>验证：</p>
     * <ul>
     *   <li>findByRedPacketIdAndClaimerId 返回已存在记录时，抛 IllegalArgumentException</li>
     *   <li>异常消息包含"已领取"</li>
     *   <li>未调用 decrementRemaining（未进入扣减分支）</li>
     *   <li>未调用 walletService.recharge（未进入充值分支）</li>
     * </ul>
     */
    @Test
    @DisplayName("测试 4：重复领取同一红包 → 抛 IllegalArgumentException 且不调用 recharge")
    void claimRedPacket_alreadyClaimed_throwsException() throws InterruptedException {
        // Arrange
        Long redPacketId = 11L;
        Long senderId = 200L;
        Long claimerId = 201L;

        VipRedPacket packet = newPacket(redPacketId, senderId, 100, 1, "PENDING");
        VipRedPacketClaim existingClaim = new VipRedPacketClaim();
        existingClaim.setRedPacketId(redPacketId);
        existingClaim.setClaimerId(claimerId);
        existingClaim.setAmount(100);
        existingClaim.setClaimedAt(LocalDateTime.now());

        when(redPacketRepository.findByIdForUpdate(redPacketId)).thenReturn(Optional.of(packet));
        when(claimRepository.findByRedPacketIdAndClaimerId(redPacketId, claimerId))
                .thenReturn(Optional.of(existingClaim));
        mockLockAcquired("red-packet-claim:" + redPacketId);

        VipRedPacketService service = new VipRedPacketService(
                redPacketRepository, claimRepository, userRepository, walletService, redissonClient);

        // Act & Assert
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.claimRedPacket(redPacketId, claimerId));

        assertTrue(ex.getMessage().contains("已领取"), "异常消息应包含'已领取'，实际: " + ex.getMessage());
        // 验证未进入扣减与充值分支
        verify(redPacketRepository, never()).decrementRemaining(anyLong(), anyInt());
        verify(walletService, never()).recharge(anyLong(), anyLong(), anyString(), anyString(), anyString());
    }

    /**
     * 测试 5：并发领取 1 份红包 → 仅 1 次成功，99 次快速失败。
     *
     * <p>验证 Task 14（P1.12）：Redisson 锁 + 原子扣减多重保障下的并发安全：</p>
     * <ul>
     *   <li>100 个用户并发领取 1 份红包</li>
     *   <li>仅 1 个用户成功领取（CAS 原子扣减保证不超发）</li>
     *   <li>其余 99 个用户快速失败（红包已被领完）</li>
     * </ul>
     *
     * <p>测试策略：mock Redisson 锁 tryLock 返回 true（所有线程都能进入临界区），
     * 串行化由 decrementRemaining 的 AtomicInteger CAS 模拟保证。
     * 仅 1 个线程 CAS 成功（remainingCount 1→0），其余 99 个线程 CAS 失败后快速失败。</p>
     */
    @Test
    @DisplayName("测试 5：并发领取 1 份红包 → 仅 1 次成功，99 次快速失败")
    void claimRedPacket_concurrent_singleShare_onlyOneSucceeds() throws InterruptedException {
        // Arrange：1 份普通红包，总金额 100 分
        Long redPacketId = 20L;
        Long senderId = 300L;
        int totalAmount = 100;
        int totalCount = 1;
        int concurrency = 100;

        VipRedPacket packet = newPacket(redPacketId, senderId, totalAmount, totalCount, "PENDING");
        AtomicInteger remainingCount = new AtomicInteger(totalCount);
        AtomicInteger remainingAmount = new AtomicInteger(totalAmount);

        when(redPacketRepository.findByIdForUpdate(redPacketId)).thenReturn(Optional.of(packet));
        when(redPacketRepository.decrementRemaining(eq(redPacketId), anyInt()))
                .thenAnswer(inv -> {
                    int amount = inv.getArgument(1);
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
        lenient().when(redPacketRepository.markDepletedIfEmpty(redPacketId)).thenReturn(1);
        when(claimRepository.findByRedPacketIdAndClaimerId(eq(redPacketId), anyLong()))
                .thenReturn(Optional.empty());
        when(claimRepository.save(any(VipRedPacketClaim.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(walletService.recharge(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(100L);
        mockLockAcquired("red-packet-claim:" + redPacketId);

        VipRedPacketService service = new VipRedPacketService(
                redPacketRepository, claimRepository, userRepository, walletService, redissonClient);

        // Act：100 个用户并发领取
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(concurrency);
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);

        for (int i = 0; i < concurrency; i++) {
            final long claimerId = 1000L + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        service.claimRedPacket(redPacketId, claimerId);
                        successCount.incrementAndGet();
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

        // Assert
        assertTrue(finished, "所有并发线程应在超时前完成");
        assertEquals(1, successCount.get(),
                "仅 1 个用户应成功领取 1 份红包，实际: " + successCount.get());
        assertEquals(concurrency - 1, failureCount.get(),
                "其余 99 个用户应快速失败，实际: " + failureCount.get());
    }
}
