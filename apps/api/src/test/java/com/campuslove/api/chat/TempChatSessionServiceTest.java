package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.ChatConfig;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.SmartTransactionObject;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * TempChatSessionService 单元测试（Task 4.2.3）。
 */
class TempChatSessionServiceTest {

    @Mock private ChatConfig chatConfig;
    @Mock private TempChatSessionRepository sessionRepository;
    @Mock private TempChatMessageRepository messageRepository;
    @Mock private TempChatContactExchangeRepository contactExchangeRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private com.campuslove.api.discover.RecommendationService recommendationService;
    @Mock private com.campuslove.api.repository.HeartSignalRepository heartSignalRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private TempChatViewMapper viewMapper;

    /** 真实 spring-tx 语义的内存事务管理器（见 {@link InMemoryTxManager}）。 */
    private InMemoryTxManager txManager;

    private TempChatSessionService sessionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        txManager = new InMemoryTxManager();
        sessionService = new TempChatSessionService(
                chatConfig, sessionRepository, messageRepository, contactExchangeRepository,
                userRepository, userBasicProfileRepository, userCampusProfileRepository,
                userScheduleProfileRepository, recommendationService, heartSignalRepository,
                messagingTemplate, viewMapper, txManager);
        when(chatConfig.getSessionExpireHours()).thenReturn(24);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /**
     * 场景（R17 回归修复）：并发同插命中 active-pair 唯一键——即便调用方带事务，写事务整体回滚后
     * 在新事务里回读赢家幂等返回，调用方事务正常提交（无 UnexpectedRollbackException）；
     * 不推送 session_created、不建联系交换记录。
     */
    @Test
    void createSession_duplicateKey_returnsWinnerAndCallerTxCommits() {
        // 对照（工装忠实性）：R17 原写法——同一事务内 catch 参与型边界的失败后继续——提交期必炸
        DataIntegrityViolationException probe = new DataIntegrityViolationException("probe");
        assertThrows(UnexpectedRollbackException.class, () -> new TransactionTemplate(txManager)
                .executeWithoutResult(status -> {
                    try {
                        failAsParticipant(probe);
                    } catch (DataIntegrityViolationException swallowed) {
                        // 原写法：catch 后继续回读并返回
                    }
                }));
        txManager.commits = 0;
        txManager.rollbacks = 0;

        TempChatSession winner = createSession(SessionPhase.matching);
        TempChatSessionView winnerView = mock(TempChatSessionView.class);
        stubConcurrentInsertConflict(Optional.of(winner));
        when(viewMapper.toSessionView(eq(winner), eq(1L), anyBoolean())).thenReturn(winnerView);

        TempChatSessionView result = new TransactionTemplate(txManager)
                .execute(status -> sessionService.createSession(null, null, "5"));

        assertSame(winnerView, result);
        assertEquals(1, txManager.rollbacks);   // 仅写段物理回滚
        assertEquals(3, txManager.commits);     // 对端解析 + 新事务回读 + 调用方事务
        verify(contactExchangeRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSendToUser(any(), any(), any());
    }

    /**
     * 场景（R17 回归修复）：唯一键冲突后新事务回读仍不命中——重抛原异常（409），不吞错。
     */
    @Test
    void createSession_duplicateKeyAndWinnerMissing_rethrowsOriginal() {
        DataIntegrityViolationException dup = stubConcurrentInsertConflict(Optional.empty());

        DataIntegrityViolationException thrown = assertThrows(DataIntegrityViolationException.class,
                () -> sessionService.createSession(null, null, "5"));

        assertSame(dup, thrown);
        assertEquals(2, txManager.rollbacks);   // 写段 + 回读段
    }

    /**
     * 当前用户 1 经已接受的心动信号 5 解析对端 2；首查无活跃会话，插入撞唯一键（按
     * SimpleJpaRepository.save 的 @Transactional 参与型边界失败），回读返回 {@code readBack}。
     */
    private DataIntegrityViolationException stubConcurrentInsertConflict(Optional<TempChatSession> readBack) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of()));
        HeartSignal signal = new HeartSignal();
        signal.setUserAId(1L);
        signal.setUserBId(2L);
        signal.setStatus(HeartSignal.SignalStatus.accepted);
        when(heartSignalRepository.findById(5L)).thenReturn(Optional.of(signal));
        when(sessionRepository.findActiveByUserPair(1L, 2L, TempChatSessionService.INACTIVE_PHASES))
                .thenReturn(Optional.empty(), readBack);
        DataIntegrityViolationException dup =
                new DataIntegrityViolationException("Duplicate entry for key 'uk_temp_chat_active_pair'");
        when(sessionRepository.save(any(TempChatSession.class))).thenAnswer(inv -> failAsParticipant(dup));
        return dup;
    }

    /** 模拟仓储 @Transactional(REQUIRED) 边界内抛异常：参与外层事务时由 spring-tx 标记 rollback-only。 */
    private Object failAsParticipant(DataIntegrityViolationException dup) {
        return new TransactionTemplate(txManager).execute(status -> {
            throw dup;
        });
    }

    /**
     * 最小内存事务管理器：继承真实 {@link AbstractPlatformTransactionManager}（不覆写任何默认值，
     * globalRollbackOnParticipationFailure=true），参与失败标记 rollback-only、提交期
     * UnexpectedRollbackException、REQUIRES_NEW 挂起/恢复均走 spring-tx 原生逻辑；资源绑定按
     * DataSourceTransactionManager 同构契约以线程本地变量实现。
     */
    static final class InMemoryTxManager extends AbstractPlatformTransactionManager {
        int commits;
        int rollbacks;
        private final ThreadLocal<PhysicalTx> bound = new ThreadLocal<>();

        static final class PhysicalTx {
            boolean rollbackOnly;
        }

        static final class TxObject implements SmartTransactionObject {
            PhysicalTx tx;

            @Override
            public boolean isRollbackOnly() {
                return tx != null && tx.rollbackOnly;
            }

            @Override
            public void flush() {
            }
        }

        @Override
        protected Object doGetTransaction() {
            TxObject txObject = new TxObject();
            txObject.tx = bound.get();
            return txObject;
        }

        @Override
        protected boolean isExistingTransaction(Object transaction) {
            return ((TxObject) transaction).tx != null;
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            PhysicalTx tx = new PhysicalTx();
            ((TxObject) transaction).tx = tx;
            bound.set(tx);
        }

        @Override
        protected Object doSuspend(Object transaction) {
            ((TxObject) transaction).tx = null;
            PhysicalTx suspended = bound.get();
            bound.remove();
            return suspended;
        }

        @Override
        protected void doResume(Object transaction, Object suspendedResources) {
            bound.set((PhysicalTx) suspendedResources);
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            commits++;
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            rollbacks++;
        }

        @Override
        protected void doSetRollbackOnly(DefaultTransactionStatus status) {
            ((TxObject) status.getTransaction()).tx.rollbackOnly = true;
        }

        @Override
        protected void doCleanupAfterCompletion(Object transaction) {
            bound.remove();
        }
    }

    /**
     * 场景：resolveSession null/blank id 应抛 IllegalArgumentException。
     */
    @Test
    void resolveSession_nullId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.resolveSession(null));
        assertEquals("会话 ID 不能为空", ex.getMessage());
    }

    /**
     * 场景：resolveSession 空白字符串应抛 IllegalArgumentException。
     */
    @Test
    void resolveSession_blankId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.resolveSession("  "));
        assertEquals("会话 ID 不能为空", ex.getMessage());
    }

    /**
     * 场景：resolveSession 找不到会话应抛异常。
     */
    @Test
    void resolveSession_notFound_throwsException() {
        when(sessionRepository.findBySessionUid("missing")).thenReturn(Optional.empty());
        when(sessionRepository.findById(99L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionService.resolveSession("missing"));
        assertEquals("会话不存在: missing", ex.getMessage());
    }

    /**
     * 场景：resolveSession 通过 sessionUid 找到会话。
     */
    @Test
    void resolveSession_bySessionUid_returnsSession() {
        TempChatSession session = createSession(SessionPhase.active);
        when(sessionRepository.findBySessionUid("uid-1")).thenReturn(Optional.of(session));

        TempChatSession result = sessionService.resolveSession("uid-1");
        assertEquals(session, result);
    }

    /**
     * 场景：resolveSession 通过数据库 ID 回退查找。
     */
    @Test
    void resolveSession_byDbId_fallsBack() {
        TempChatSession session = createSession(SessionPhase.active);
        when(sessionRepository.findBySessionUid("100")).thenReturn(Optional.empty());
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));

        TempChatSession result = sessionService.resolveSession("100");
        assertEquals(session, result);
    }

    /**
     * 场景：isSessionExpired 当 closesAt 已过时应返回 true。
     */
    @Test
    void isSessionExpired_pastClosesAt_returnsTrue() {
        TempChatSession session = new TempChatSession();
        session.setClosesAt(LocalDateTime.now().minusHours(1));
        assertTrue(sessionService.isSessionExpired(session));
    }

    /**
     * 场景：isSessionExpired 当 closesAt 未到时应返回 false。
     */
    @Test
    void isSessionExpired_futureClosesAt_returnsFalse() {
        TempChatSession session = new TempChatSession();
        session.setClosesAt(LocalDateTime.now().plusHours(1));
        assertFalse(sessionService.isSessionExpired(session));
    }

    /**
     * 场景：isSessionExpired 当 closesAt 为 null 应返回 false。
     */
    @Test
    void isSessionExpired_nullClosesAt_returnsFalse() {
        TempChatSession session = new TempChatSession();
        session.setClosesAt(null);
        assertFalse(sessionService.isSessionExpired(session));
    }

    /**
     * 场景：markExpiredIfDue 已过期但未标记应更新状态并持久化。
     */
    @Test
    void markExpiredIfDue_pastClosesAt_updatesAndSaves() {
        TempChatSession session = createSession(SessionPhase.active);
        session.setClosesAt(LocalDateTime.now().minusHours(1));
        when(sessionRepository.save(any(TempChatSession.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean result = sessionService.markExpiredIfDue(session);

        assertTrue(result);
        assertEquals(SessionPhase.expired, session.getPhase());
        assertEquals("expired", session.getClosedReason());
        verify(sessionRepository).save(session);
    }

    /**
     * 场景：markExpiredIfDue 已标记为 expired 不重复更新。
     */
    @Test
    void markExpiredIfDue_alreadyExpired_doesNotSave() {
        TempChatSession session = createSession(SessionPhase.expired);
        session.setClosesAt(LocalDateTime.now().minusHours(1));

        boolean result = sessionService.markExpiredIfDue(session);

        assertTrue(result);
        verify(sessionRepository, never()).save(any(TempChatSession.class));
    }

    /**
     * 场景：markExpiredIfDue 未过期应返回 false。
     */
    @Test
    void markExpiredIfDue_notExpired_returnsFalse() {
        TempChatSession session = createSession(SessionPhase.active);
        session.setClosesAt(LocalDateTime.now().plusHours(1));

        boolean result = sessionService.markExpiredIfDue(session);

        assertFalse(result);
    }

    private TempChatSession createSession(SessionPhase phase) {
        TempChatSession session = new TempChatSession();
        session.setId(1L);
        session.setSessionUid("uid-1");
        session.setUserAId(1L);
        session.setUserBId(2L);
        session.setPhase(phase);
        session.setUserAUnreadCount(0);
        session.setUserBUnreadCount(0);
        session.setClosesAt(LocalDateTime.now().plusHours(24));
        return session;
    }
}
