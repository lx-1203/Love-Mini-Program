package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.TempChatContactExchange;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * TempChatCleanupService 单元测试（Task 4.2.3）。
 *
 * <p>2026-10-31 追加：定时清理任务的<b>分布式锁释放点</b>必须在事务提交/回滚之后
 * （对齐 AutoRenewService 的 R4-00317）。判点用真实的
 * {@link AbstractPlatformTransactionManager} 子类驱动 {@link TransactionTemplate}
 * 并把 begin/commit/加锁/解锁/扫描按发生顺序记进同一条列表，于是
 * 「解锁早于提交」这种缺陷能被逐字证伪（修复前该列表是
 * tx-begin → lock → sweep → unlock → tx-commit）。</p>
 */
class TempChatCleanupServiceTest {

    @Mock private TempChatContactExchangeRepository contactExchangeRepository;
    @Mock private TempChatSessionService sessionService;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private TempChatSessionRepository sessionRepository;
    @Mock private RedissonClient redissonClient;

    private TempChatCleanupService cleanupService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(sessionService.getMessagingTemplate()).thenReturn(messagingTemplate);
        cleanupService = new TempChatCleanupService(
                contactExchangeRepository, sessionService, sessionRepository, redissonClient);
    }

    /**
     * 场景：resolveExchangeStatus rejected decision 应直接返回 rejected。
     */
    @Test
    void resolveExchangeStatus_rejectedDecision_returnsRejected() {
        String result = cleanupService.resolveExchangeStatus("idle", "self", "rejected");
        assertEquals("rejected", result);
    }

    /**
     * 场景：resolveExchangeStatus self actor + 空闲状态应返回 accepted-by-self。
     */
    @Test
    void resolveExchangeStatus_selfActorIdle_returnsAcceptedBySelf() {
        String result = cleanupService.resolveExchangeStatus("idle", "self", "accepted");
        assertEquals("accepted-by-self", result);
    }

    /**
     * 场景：resolveExchangeStatus self actor + accepted-by-peer 应返回 completed。
     */
    @Test
    void resolveExchangeStatus_selfActorPeerAccepted_returnsCompleted() {
        String result = cleanupService.resolveExchangeStatus("accepted-by-peer", "self", "accepted");
        assertEquals("completed", result);
    }

    /**
     * 场景：resolveExchangeStatus peer actor + 空闲状态应返回 accepted-by-peer。
     */
    @Test
    void resolveExchangeStatus_peerActorIdle_returnsAcceptedByPeer() {
        String result = cleanupService.resolveExchangeStatus("idle", "peer", "accepted");
        assertEquals("accepted-by-peer", result);
    }

    /**
     * 场景：resolveExchangeStatus peer actor + accepted-by-self 应返回 completed。
     */
    @Test
    void resolveExchangeStatus_peerActorSelfAccepted_returnsCompleted() {
        String result = cleanupService.resolveExchangeStatus("accepted-by-self", "peer", "accepted");
        assertEquals("completed", result);
    }

    /**
     * 场景：respondToContactExchange 在 closed 会话应直接返回，不更新 exchange。
     */
    @Test
    void respondToContactExchange_closedSession_doesNotUpdate() {
        TempChatSession session = createSession(SessionPhase.closed);
        when(sessionService.resolveSession("sid")).thenReturn(session);

        ContactExchangeDecisionRequest req = new ContactExchangeDecisionRequest("self", "accepted");
        TempChatSession result = cleanupService.respondToContactExchange("sid", req, 1L);

        assertEquals(session, result);
        verify(contactExchangeRepository, never()).save(any(TempChatContactExchange.class));
    }

    /**
     * 场景：respondToContactExchange 在 active 会话 + 无现有记录时创建新记录。
     */
    @Test
    void respondToContactExchange_activeSession_noExisting_createsNew() {
        TempChatSession session = createSession(SessionPhase.active);
        when(sessionService.resolveSession("sid")).thenReturn(session);
        when(contactExchangeRepository.findBySessionId(session.getId())).thenReturn(Optional.empty());
        ArgumentCaptor<TempChatContactExchange> captor = ArgumentCaptor.forClass(TempChatContactExchange.class);
        when(contactExchangeRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        ContactExchangeDecisionRequest req = new ContactExchangeDecisionRequest("self", "accepted");
        TempChatSession result = cleanupService.respondToContactExchange("sid", req, 1L);

        assertEquals(session, result);
        TempChatContactExchange saved = captor.getValue();
        assertEquals("accepted-by-self", saved.getStatus());
        assertEquals("self", saved.getProposer());
    }

    /**
     * 场景：respondToContactExchange completed 状态应触发 WebSocket 通知双方。
     */
    @Test
    void respondToContactExchange_completedStatus_sendsNotificationsToBoth() {
        TempChatSession session = createSession(SessionPhase.active);
        TempChatContactExchange existing = new TempChatContactExchange();
        existing.setId(1L);
        existing.setSession(session);
        existing.setStatus("accepted-by-peer");

        when(sessionService.resolveSession("sid")).thenReturn(session);
        when(contactExchangeRepository.findBySessionId(session.getId())).thenReturn(Optional.of(existing));

        ContactExchangeDecisionRequest req = new ContactExchangeDecisionRequest("self", "accepted");
        cleanupService.respondToContactExchange("sid", req, 1L);

        // 通知双方
        verify(messagingTemplate).convertAndSendToUser(
                org.mockito.ArgumentMatchers.eq("1"), anyString(), any(Map.class));
        verify(messagingTemplate).convertAndSendToUser(
                org.mockito.ArgumentMatchers.eq("2"), anyString(), any(Map.class));
    }

    /**
     * 场景：getContactExchangeView 无记录时返回 idle 状态。
     */
    @Test
    void getContactExchangeView_noRecord_returnsIdle() {
        TempChatSession session = createSession(SessionPhase.active);
        when(contactExchangeRepository.findBySessionId(session.getId())).thenReturn(Optional.empty());

        ContactExchangeStateView view = cleanupService.getContactExchangeView(session);

        assertNotNull(view);
        assertEquals("idle", view.status());
    }

    /**
     * 场景：getContactExchangeStatus 无记录时返回 "idle"。
     */
    @Test
    void getContactExchangeStatus_noRecord_returnsIdle() {
        TempChatSession session = createSession(SessionPhase.active);
        when(contactExchangeRepository.findBySessionId(session.getId())).thenReturn(Optional.empty());

        String status = cleanupService.getContactExchangeStatus(session);
        assertEquals("idle", status);
    }

    /* ==================== 2026-10-31：锁释放点与租期 ==================== */

    /** 与生产同一套事务机制，只把 begin/commit 记进事件列表。 */
    private static final class RecordingTxManager extends AbstractPlatformTransactionManager {
        private final List<String> events;

        RecordingTxManager(List<String> events) {
            this.events = events;
        }

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            events.add("tx-begin");
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            events.add("tx-commit");
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            events.add("tx-rollback");
        }
    }

    /** 打桩：锁可获取，并把加锁/解锁记进事件列表。 */
    private RLock recordingLock(List<String> events, boolean acquirable) throws InterruptedException {
        RLock lock = mock(RLock.class);
        when(redissonClient.getLock(anyString())).thenReturn(lock);
        doAnswer(inv -> {
            events.add("lock");
            return acquirable;
        }).when(lock).tryLock(anyLong(), any(TimeUnit.class));
        doAnswer(inv -> {
            events.add("unlock");
            return null;
        }).when(lock).unlock();
        when(lock.isHeldByCurrentThread()).thenReturn(acquirable);
        return lock;
    }

    /** 打桩：matching 阶段空、active 阶段一条过期会话，清理动作记进事件列表。 */
    private void stubOneExpiredSession(List<String> events) {
        TempChatSession expired = createSession(SessionPhase.active);
        expired.setClosesAt(LocalDateTime.now().minusHours(2));
        when(sessionRepository.findByPhaseAndClosesAtBefore(eq(SessionPhase.matching), any()))
                .thenReturn(List.of());
        when(sessionRepository.findByPhaseAndClosesAtBefore(eq(SessionPhase.active), any()))
                .thenReturn(List.of(expired));
        when(sessionService.markExpiredIfDue(expired)).thenAnswer(inv -> {
            events.add("sweep");
            return true;
        });
    }

    @Test
    @DisplayName("cleanupExpiredSessions：解锁必须发生在事务提交之后，不能留在 finally")
    void cleanupExpiredSessions_releasesLockOnlyAfterTransactionCompletion() throws Exception {
        List<String> events = Collections.synchronizedList(new ArrayList<>());
        RLock lock = recordingLock(events, true);
        stubOneExpiredSession(events);

        // 用真的事务管理器包住调用，复刻 @Transactional 代理的提交时机（本方法上的注解
        // 在单测里不生效，所以必须由外层 TransactionTemplate 提供活动事务）
        new TransactionTemplate(new RecordingTxManager(events))
                .executeWithoutResult(status -> cleanupService.cleanupExpiredSessions());

        assertEquals(List.of("tx-begin", "lock", "sweep", "tx-commit", "unlock"), events,
                "锁必须在事务提交后才释放：修复前 finally 先解锁，第二个 JVM 能在提交前拿到锁、"
                        + "读到未提交的行并把同一批会话再处理一次");
        verify(lock).unlock();
    }

    @Test
    @DisplayName("回滚路径同样不提前解锁（异常时 afterCompletion 仍会释放）")
    void cleanupExpiredSessions_releasesLockAfterRollback() throws Exception {
        List<String> events = Collections.synchronizedList(new ArrayList<>());
        RLock lock = recordingLock(events, true);
        TempChatSession expired = createSession(SessionPhase.active);
        expired.setClosesAt(LocalDateTime.now().minusHours(2));
        when(sessionRepository.findByPhaseAndClosesAtBefore(eq(SessionPhase.matching), any()))
                .thenReturn(List.of());
        when(sessionRepository.findByPhaseAndClosesAtBefore(eq(SessionPhase.active), any()))
                .thenReturn(List.of(expired));
        when(sessionService.markExpiredIfDue(expired)).thenAnswer(inv -> {
            events.add("sweep");
            throw new IllegalStateException("boom");
        });

        TransactionTemplate tx = new TransactionTemplate(new RecordingTxManager(events));
        // markExpiredIfDue 抛的是 RuntimeException：会被方法内的逐条 catch 吃掉，
        // 这里显式让它穿出（模拟 DataAccessException 之外的致命失败），断言锁仍能释放
        try {
            tx.executeWithoutResult(status -> {
                cleanupService.cleanupExpiredSessions();
                throw new IllegalStateException("force-rollback");
            });
        } catch (IllegalStateException expected) {
            // 事务回滚
        }

        assertEquals(List.of("tx-begin", "lock", "sweep", "tx-rollback", "unlock"), events,
                "回滚也必须走 afterCompletion 解锁，否则锁要等看门狗停掉才过期（约 30s），"
                        + "期间没有任何实例能清理");
        verify(lock).unlock();
    }

    @Test
    @DisplayName("无活动事务（本地直跑/单测直连）：退化为方法返回时立即解锁")
    void cleanupExpiredSessions_withoutTransaction_unlocksImmediately() throws Exception {
        List<String> events = Collections.synchronizedList(new ArrayList<>());
        RLock lock = recordingLock(events, true);
        stubOneExpiredSession(events);

        org.junit.jupiter.api.Assertions.assertFalse(
                TransactionSynchronizationManager.isSynchronizationActive(),
                "本用例的前提就是没有活动事务");
        cleanupService.cleanupExpiredSessions();

        assertEquals(List.of("lock", "sweep", "unlock"), events,
                "注册不到事务同步时必须回退到立即释放，否则锁永不释放");
        verify(lock).unlock();
    }

    @Test
    @DisplayName("未获取到锁：跳过扫描，且绝不去解一把别人的锁")
    void cleanupExpiredSessions_lockNotAcquired_skipsWithoutUnlocking() throws Exception {
        List<String> events = Collections.synchronizedList(new ArrayList<>());
        RLock lock = recordingLock(events, false);

        cleanupService.cleanupExpiredSessions();

        assertEquals(List.of("lock"), events, "抢不到锁就整轮跳过");
        verify(sessionRepository, never()).findByPhaseAndClosesAtBefore(any(), any());
        verify(sessionService, never()).markExpiredIfDue(any());
        verify(lock, never()).unlock();
    }

    @Test
    @DisplayName("租期：不传固定 30s leaseTime，交给 Redisson 看门狗续期")
    void cleanupExpiredSessions_acquiresLockWithoutFixedLease() throws Exception {
        List<String> events = Collections.synchronizedList(new ArrayList<>());
        RLock lock = recordingLock(events, true);
        stubOneExpiredSession(events);

        cleanupService.cleanupExpiredSessions();

        // 显式 tryLock(0, unit)（Lock 接口重载 → Redisson 内部 leaseTime=-1 → 看门狗）
        verify(lock).tryLock(0L, TimeUnit.SECONDS);
        verify(lock, never()).tryLock(anyLong(), anyLong(), any(TimeUnit.class));
    }

    private TempChatSession createSession(SessionPhase phase) {
        TempChatSession session = new TempChatSession();
        session.setId(1L);
        session.setSessionUid("uid-1");
        session.setUserAId(1L);
        session.setUserBId(2L);
        session.setPhase(phase);
        session.setClosesAt(LocalDateTime.now().plusHours(24));
        return session;
    }
}
