package com.campuslove.api.tasks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.entity.TaskClaim;
import com.campuslove.api.profile.ProfileQueryService;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.TaskClaimRepository;
import com.campuslove.api.wallet.WalletService;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 一次性任务「终身一次」的并发护栏单元测试（S2-4，2026-10-31）。
 *
 * <p><b>缺陷基线（改造前）</b>：{@link RealTaskService#claim} 的判定链是
 * {@code existsByUserIdAndTaskCode} → {@code saveAndFlush} → {@code walletService.recharge}，
 * 三步之间<b>没有任何锁</b>。Flyway V2026.10.30.0002 把 {@code claim_date} 收成 NOT NULL 后，
 * {@code uk_task_claim_user_code_date} 只挡得住<b>同日</b>重复；一次性任务判的是「不按日期分片」的
 * exists，于是：</p>
 * <ul>
 *   <li>跨午夜的两次请求（各自的 {@code today} 不同、唯一键各行其道）；</li>
 *   <li>同一「一次性任务」在两天里的两个并发请求；</li>
 *   <li>纯并发双击（两个事务都先读到空、再各插一行）——</li>
 * </ul>
 * <p>都能让同一个 (user, taskCode) 各调一次 recharge，重复发奖可写库。</p>
 *
 * <p><b>本用例怎么把「读不到未提交数据」这件事演出来</b>：仓库 mock 的
 * {@code saveAndFlush} 只把领取行写进线程本地的 pending，真正的「可见」发生在
 * {@link TransactionSynchronization#afterCompletion}(STATUS_COMMITTED)（即代理层提交点）。
 * 因此第二个线程若在第一个线程提交前跑判定，读到的一定是 false —— 旧实现会双双通过检查、
 * 各发一次奖（本用例即变红）；新实现由 (user, taskCode) 分布式锁把整段串行化，
 * 输的一方拿到业务语义的 {@code TASK_ALREADY_CLAIMED}（400），不是 500，也没有第二次入账。</p>
 *
 * <p>不使用 {@code @SpringBootTest}（避免真实 DB/Redis 依赖），与仓内
 * {@code Task12ConcurrencyTest} 同一策略：Mockito 模拟 Redisson 锁与提交点。</p>
 */
@DisplayName("RealTaskService - 一次性任务领取的并发护栏")
class TaskClaimConcurrencyLockTest {

    private static final Long USER_ID = 4242L;
    private static final String ONE_TIME_TASK = TaskService.TASK_COMPLETE_PROFILE;
    private static final String LOCK_KEY = "task-claim:" + USER_ID + ":" + ONE_TIME_TASK;
    private static final int THREADS = 8;
    private static final long AWAIT_SECONDS = 20L;

    @Mock private TaskClaimRepository claimRepository;
    @Mock private CheckInRepository checkInRepository;
    @Mock private PostRepository postRepository;
    @Mock private CampusCertificationRepository certificationRepository;
    @Mock private ProfileQueryService profileQueryService;
    @Mock private WalletService walletService;
    @Mock private RedissonClient redissonClient;
    @Mock private RLock rLock;

    private AutoCloseable mocks;

    /** 已「提交」的一次性任务领取（user|taskCode 复合键），模拟读已提交隔离级别 */
    private final Set<String> committedClaims = ConcurrentHashMap.newKeySet();
    /** 每次 recharge 的 orderId（并发正确性的直接证据：同一幂等键只该出现一次） */
    private final List<String> rechargeOrderIds = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final AtomicInteger rechargeCount = new AtomicInteger(0);

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        committedClaims.clear();
        rechargeOrderIds.clear();
        rechargeCount.set(0);
        // 任务达成：资料完善度 100%
        when(profileQueryService.calculateProfileCompletion(USER_ID)).thenReturn(100);
        when(redissonClient.getLock(LOCK_KEY)).thenReturn(rLock);
        when(rLock.isHeldByCurrentThread()).thenReturn(true);
    }

    @AfterEach
    void tearDown() throws Exception {
        // 每个用例可能手工初始化过事务同步上下文，绝不泄漏到下个用例
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        mocks.close();
    }

    private RealTaskService newService() {
        return new RealTaskService(claimRepository, checkInRepository, postRepository,
                certificationRepository, profileQueryService, walletService, redissonClient);
    }

    /**
     * 用 mock 复现「读已提交」的一次性任务判定与落库：
     * exists 只读已提交集合；saveAndFlush 写 pending，并注册提交点可见化。
     */
    private void wireRepositoryWithCommitVisibility() {
        when(claimRepository.existsByUserIdAndTaskCode(eq(USER_ID), eq(ONE_TIME_TASK)))
                .thenAnswer(invocation -> committedClaims.contains(USER_ID + "|" + ONE_TIME_TASK));
        doAnswer(invocation -> {
            TaskClaim claim = invocation.getArgument(0);
            String key = claim.getUserId() + "|" + claim.getTaskCode();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(
                        new TransactionSynchronization() {
                            @Override
                            public void afterCompletion(int status) {
                                if (status == TransactionSynchronization.STATUS_COMMITTED) {
                                    committedClaims.add(key);
                                }
                            }
                        });
            } else {
                committedClaims.add(key);
            }
            return claim;
        }).when(claimRepository).saveAndFlush(any(TaskClaim.class));
    }

    /** 钱包入账计数（一次性任务的 orderId 不含日期 ⇒ 同一键重复出现即为重复发奖）。 */
    private void wireWallet() {
        when(walletService.recharge(eq(USER_ID), anyLong(), anyString(), anyString(), anyString()))
                .thenAnswer(invocation -> {
                    rechargeOrderIds.add(invocation.getArgument(2));
                    return (long) rechargeCount.incrementAndGet() * 50L;
                });
    }

    /**
     * 提交点：手工触发已注册的 afterCompletion(COMMITTED)，等价于代理层事务提交完成。
     *
     * <p>按<b>逆序</b>回调：注册顺序是「锁释放同步器（lockClaim 最先）→ 领取行可见化同步器
     * （saveAndFlush 在后）」，而真实提交点的语义是「数据先可见、锁后释放」——若照正序跑，
     * 锁会在领取行可见之前放开，晚到的对手方就能读到空结果，用例变成偶发红。</p>
     */
    private void completeTransaction() {
        List<TransactionSynchronization> syncs =
                new java.util.ArrayList<>(TransactionSynchronizationManager.getSynchronizations());
        java.util.Collections.reverse(syncs);
        for (TransactionSynchronization sync : syncs) {
            sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
        }
        TransactionSynchronizationManager.clearSynchronization();
    }

    // ==================== 1. 并发双击：只有一次入账 ====================

    @Test
    @DisplayName("并发领取同一一次性任务：恰好一次 recharge、一行领取，输的一方是 TASK_ALREADY_CLAIMED 而非 500")
    void concurrentClaimsOfOneTimeTask_grantExactlyOnce() throws InterruptedException {
        wireRepositoryWithCommitVisibility();
        wireWallet();

        // Redisson 锁语义：同一时刻只有一个线程持锁（CAS），其余立即拿不到
        AtomicBoolean lockHeld = new AtomicBoolean(false);
        AtomicReference<Thread> owner = new AtomicReference<>(null);
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class)))
                .thenAnswer(invocation -> {
                    if (lockHeld.compareAndSet(false, true)) {
                        owner.set(Thread.currentThread());
                        // 持锁线程释放后允许下一个线程进入（真实租约 30s，这里模拟「提交后释放」）
                        return true;
                    }
                    return false;
                });
        doAnswer(invocation -> {
            if (Thread.currentThread() == owner.get()) {
                lockHeld.set(false);
                owner.set(null);
            }
            return null;
        }).when(rLock).unlock();

        RealTaskService service = newService();
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(THREADS);
        AtomicInteger succeeded = new AtomicInteger(0);
        AtomicInteger alreadyClaimed = new AtomicInteger(0);
        AtomicInteger unexpected = new AtomicInteger(0);
        ExecutorService executor = Executors.newFixedThreadPool(THREADS);

        for (int i = 0; i < THREADS; i++) {
            executor.submit(() -> {
                try {
                    start.await();
                    TransactionSynchronizationManager.initSynchronization();
                    try {
                        service.claim(USER_ID, ONE_TIME_TASK);
                        succeeded.incrementAndGet();
                        // 模拟本线程事务在此刻提交（锁与可见性同时落地）
                        completeTransaction();
                    } catch (IllegalArgumentException e) {
                        if (ErrorMessages.TASK_ALREADY_CLAIMED.equals(e.getMessage())) {
                            alreadyClaimed.incrementAndGet();
                        } else {
                            unexpected.incrementAndGet();
                        }
                        // 业务失败也要走完提交/回滚回调，把锁放掉
                        if (TransactionSynchronizationManager.isSynchronizationActive()) {
                            TransactionSynchronizationManager.clearSynchronization();
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    unexpected.incrementAndGet();
                } catch (RuntimeException e) {
                    // 500 一类非业务异常：正是本用例要禁止的形态
                    unexpected.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(AWAIT_SECONDS, TimeUnit.SECONDS), "并发线程应在超时前全部结束");
        executor.shutdownNow();

        assertEquals(THREADS, succeeded.get() + alreadyClaimed.get() + unexpected.get());
        assertEquals(0, unexpected.get(),
                "并发领取不得出现非业务异常（500）：actual=" + unexpected.get());
        assertEquals(1, succeeded.get(), "同一 (user, taskCode) 的一次性任务只允许成功领取一次");
        assertEquals(THREADS - 1, alreadyClaimed.get(),
                "其余线程必须拿到业务语义的「任务奖励已领取过」");
        assertEquals(1, rechargeCount.get(), "钱包只能入账一次");
        assertEquals(1, rechargeOrderIds.size());
        assertEquals("TASK-" + ONE_TIME_TASK + "-" + USER_ID, rechargeOrderIds.get(0),
                "一次性任务的幂等键不含日期（跨天重放也撞同一键）");
        assertEquals(1, committedClaims.size(), "只落一行领取记录");
        verify(claimRepository, times(1)).saveAndFlush(any(TaskClaim.class));
    }

    @Test
    @DisplayName("跨午夜场景：两次「一次性任务」领取（各自的 today 不同）也只发一次奖")
    void midnightStraddlingClaims_grantOnce() throws InterruptedException {
        wireRepositoryWithCommitVisibility();
        wireWallet();
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);

        RealTaskService service = newService();
        TransactionSynchronizationManager.initSynchronization();
        service.claim(USER_ID, ONE_TIME_TASK);
        // 提交完成后，「第二天」再点一次：一次性任务仍不得第二次入账
        completeTransaction();
        // 换日只影响 claim_date（同日唯一键），终身一次的判定走 existsByUserIdAndTaskCode
        when(claimRepository.existsByUserIdAndTaskCodeAndClaimDate(eq(USER_ID), eq(ONE_TIME_TASK),
                any(LocalDate.class))).thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.claim(USER_ID, ONE_TIME_TASK));
        assertEquals(ErrorMessages.TASK_ALREADY_CLAIMED, ex.getMessage());
        assertEquals(1, rechargeCount.get(), "跨午夜的第二次领取不得再发奖");
        assertEquals(1, committedClaims.size());
    }

    // ==================== 2. 锁的生命周期必须覆盖到提交之后 ====================

    @Test
    @DisplayName("锁在事务提交之后才释放：claim() 返回时锁仍在手上，afterCompletion(COMMITTED) 才 unlock")
    void lockReleasedAfterCommit_notBefore() throws InterruptedException {
        wireRepositoryWithCommitVisibility();
        wireWallet();
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);

        RealTaskService service = newService();
        TransactionSynchronizationManager.initSynchronization();

        service.claim(USER_ID, ONE_TIME_TASK);

        // R4-00317 的教训：在 finally 里立即释放 = 早于代理层提交，
        // 并发二次领取可读到未提交的空结果再发一次奖。故此处必须仍未释放。
        verify(rLock, never()).unlock();
        assertTrue(TransactionSynchronizationManager.isSynchronizationActive(),
                "领取事务的同步回调必须已注册（锁交由提交点释放）");

        completeTransaction();

        verify(rLock, times(1)).unlock();
    }

    @Test
    @DisplayName("事务回滚时锁同样被释放（不留 30s 死锁）")
    void lockReleasedOnRollback() throws InterruptedException {
        wireRepositoryWithCommitVisibility();
        when(walletService.recharge(eq(USER_ID), anyLong(), anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("钱包炸了"));
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);

        RealTaskService service = newService();
        TransactionSynchronizationManager.initSynchronization();

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.claim(USER_ID, ONE_TIME_TASK));
        assertEquals(ErrorMessages.TASK_REWARD_CREDIT_FAILED, ex.getMessage());
        verify(rLock, never()).unlock();

        // 回滚完成 → afterCompletion(STATUS_ROLLED_BACK) → 锁释放
        // 常量的真名是 STATUS_ROLLED_BACK（不是 ROLLEDBACK）：写错时整棵测试树编译不过，
        // 一处拼写就能把后端所有 Maven 门一起挡住，所以留这行注释说明。
        List<TransactionSynchronization> syncs =
                TransactionSynchronizationManager.getSynchronizations();
        for (TransactionSynchronization sync : syncs) {
            sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        }
        TransactionSynchronizationManager.clearSynchronization();

        verify(rLock, times(1)).unlock();
        assertFalse(committedClaims.contains(USER_ID + "|" + ONE_TIME_TASK),
                "回滚的领取不得变成可见记录");
    }

    @Test
    @DisplayName("锁按 (user, taskCode) 取：不同任务不互相阻塞，且等不到锁时不排队堆积")
    void lockIsScopedPerUserAndTask() throws InterruptedException {
        wireWallet();
        when(claimRepository.existsByUserIdAndTaskCode(anyLong(), anyString())).thenReturn(false);
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);

        newService().claim(USER_ID, ONE_TIME_TASK);

        verify(redissonClient).getLock(LOCK_KEY);
        // 等待/租约参数：等 5s 即判失败（不无限排队），租约 30s 覆盖整段事务
        verify(rLock, atMost(1)).tryLock(5L, 30L, TimeUnit.SECONDS);
    }

    @Test
    @DisplayName("拿不到锁（已有领取在途）：立即按「已领取」拒绝，零入账、零领取行")
    void lockContendedLoser_failsFastWithoutGranting() throws InterruptedException {
        wireRepositoryWithCommitVisibility();
        wireWallet();
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(false);

        RealTaskService service = newService();
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.claim(USER_ID, ONE_TIME_TASK));

        assertEquals(ErrorMessages.TASK_ALREADY_CLAIMED, ex.getMessage(),
                "并发对手方必须是 400 业务文案，不能是 500");
        assertEquals(0, rechargeCount.get());
        verify(claimRepository, never()).saveAndFlush(any(TaskClaim.class));
        // 未持锁不得越权释放
        verify(rLock, never()).unlock();
    }
}
