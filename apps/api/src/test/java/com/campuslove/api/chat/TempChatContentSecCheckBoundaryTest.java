package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.ContentSecurityChecker;
import com.campuslove.api.config.ContentSecurityVerdict;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatMessageRepository;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * S2-1（2026-10-30）临时会话发消息的内容安全外呼与 DB 事务边界。
 *
 * <p><b>缺陷</b>：{@code TempChatMessageService.sendMessage} 挂着方法级
 * {@code @Transactional}，中间的 {@code rejectIfRisky} 会外呼微信 msgSecCheck。
 * 聊天是这条服务里 QPS 最高的写路径之一：微信一慢，发消息就占着 Hikari 连接和
 * {@code temp_chat_sessions} 行锁等 HTTP 返回，连接池被抽干后整个 API 一起变慢。</p>
 *
 * <p><b>另外两件必须守住的事</b>（都是这次拆事务可能碰坏的）：</p>
 * <ul>
 *   <li>{@code matching → active} 的阶段流转原先靠「同一个事务里的托管实体」被
 *       {@code saveSession} 落库。拆段后 session 在进入落库段时是游离态，
 *       阶段变更必须仍然被持久化（否则首条消息后会话永远停在 matching）。</li>
 *   <li>消息插入与会话预览/未读数更新必须留在同一个事务里，少一边就是「消息在、
 *       未读数不对」。WebSocket 推送则改到提交之后——原先是提交前推送，
 *       接收端可能先收到推送、回查却读不到那条消息。</li>
 * </ul>
 *
 * <p>可证伪性：把 {@code @Transactional} 加回 sendMessage（反射用例红）；把
 * {@code rejectIfRisky} 挪进落库事务（事件序列与 tx 标志双红）；把阶段变更留在
 * 事务外赋值（matching 用例红）。</p>
 */
@DisplayName("TempChatMessageService - 内容安全外呼与事务边界")
class TempChatContentSecCheckBoundaryTest {

    private static final long USER_A_ID = 1L;
    private static final long USER_B_ID = 2L;

    /** 真事务机制 + 挂起能力（口径同 ContentSecCheckTransactionBoundaryTest）。 */
    private static final class RecordingTxManager extends AbstractPlatformTransactionManager {
        private final List<String> events;
        private int depth;

        RecordingTxManager(List<String> events) {
            this.events = events;
        }

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected boolean isExistingTransaction(Object transaction) {
            return depth > 0;
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            depth++;
            events.add("tx-begin");
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            depth--;
            events.add("tx-commit");
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            depth--;
            events.add("tx-rollback");
        }

        @Override
        protected Object doSuspend(Object transaction) {
            depth--;
            events.add("tx-suspend");
            return "suspended";
        }

        @Override
        protected void doResume(Object transaction, Object suspendedResources) {
            depth++;
            events.add("tx-resume");
        }
    }

    private List<String> events;
    private final List<Boolean> checkInsideTransaction = new ArrayList<>();
    private final List<Boolean> writeInsideTransaction = new ArrayList<>();
    private TempChatMessageRepository messageRepository;
    private TempChatSessionService sessionService;
    private SimpMessagingTemplate messagingTemplate;
    private SensitiveWordFilter sensitiveWordFilter;
    private RecordingTxManager txManager;
    private TempChatMessageService service;
    private String verdictSuggest;

    @BeforeEach
    void setUp() {
        events = new ArrayList<>();
        checkInsideTransaction.clear();
        writeInsideTransaction.clear();
        messageRepository = mock(TempChatMessageRepository.class);
        sessionService = mock(TempChatSessionService.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        sensitiveWordFilter = mock(SensitiveWordFilter.class);
        verdictSuggest = "pass";

        ContentSecurityChecker checker = (content, userId, scene) -> {
            checkInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            events.add("check");
            return new ContentSecurityVerdict(verdictSuggest, "selftest", "local");
        };

        when(messageRepository.save(any(TempChatMessage.class))).thenAnswer(inv -> {
            TempChatMessage m = inv.getArgument(0);
            m.setId(7001L);
            writeInsideTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-message");
            return m;
        });
        when(sessionService.saveSession(any(TempChatSession.class))).thenAnswer(inv -> {
            events.add("save-session");
            return inv.getArgument(0);
        });
        when(sensitiveWordFilter.filterWithLog(any(), any(), any()))
                .thenAnswer(inv -> inv.getArgument(0));
        when(sessionService.getMessagingTemplate()).thenReturn(messagingTemplate);
        org.mockito.Mockito.doAnswer(inv -> {
            events.add("push");
            return null;
        }).when(messagingTemplate).convertAndSendToUser(anyString(), anyString(), any());

        txManager = new RecordingTxManager(events);
        service = new TempChatMessageService(messageRepository, sessionService,
                sensitiveWordFilter, txManager);
        ReflectionTestUtils.setField(service, "contentSecurityChecker", checker);
    }

    private TempChatSession givenSession(SessionPhase phase) {
        TempChatSession session = new TempChatSession();
        session.setId(1L);
        session.setSessionUid("sid");
        session.setUserAId(USER_A_ID);
        session.setUserBId(USER_B_ID);
        session.setPhase(phase);
        session.setUserAUnreadCount(0);
        session.setUserBUnreadCount(0);
        session.setClosesAt(LocalDateTime.now().plusHours(24));
        when(sessionService.resolveSession("sid")).thenReturn(session);
        when(sessionService.isSessionExpired(session)).thenReturn(false);
        when(sessionService.toMessageView(any(TempChatMessage.class), anyBoolean())).thenReturn(null);
        return session;
    }

    private void send() {
        service.sendMessage("sid", new ChatMessageRequest("self", "text", "你好呀", null, null), USER_A_ID);
    }

    @Test
    @DisplayName("外呼在事务之外；消息与会话更新在同一个事务内；推送在提交之后")
    void checkRunsOutsideAndWritesShareOneTransaction() {
        givenSession(SessionPhase.active);

        send();

        assertEquals(List.of("check", "tx-begin", "save-message", "save-session", "tx-commit", "push"),
                events, "发消息的事件序列不符，实际: " + events);
        assertFalse(checkInsideTransaction.isEmpty(), "桩检查器没被调用，本门空转");
        assertTrue(checkInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "调微信 msgSecCheck 时线程上不允许有活动事务，实际: " + checkInsideTransaction);
        // 正控：两处写库都必须观察到活动事务，否则上面的 false 只是「根本没有事务」。
        assertEquals(List.of(Boolean.TRUE), List.copyOf(writeInsideTransaction),
                "消息插入必须在活动事务内（会话更新与它同一个事务），实际: " + writeInsideTransaction);
        assertEquals(1, events.stream().filter("tx-commit"::equals).count(),
                "消息与会话必须一次原子提交，不允许拆成两个事务");
    }

    @Test
    @DisplayName("matching 阶段的首条消息：阶段流转仍随落库段一起持久化")
    void phaseTransitionStillPersists() {
        TempChatSession session = givenSession(SessionPhase.matching);

        send();

        ArgumentCaptor<TempChatSession> saved = ArgumentCaptor.forClass(TempChatSession.class);
        verify(sessionService).saveSession(saved.capture());
        assertEquals(SessionPhase.active, saved.getValue().getPhase(),
                "拆事务后 session 是游离态，阶段变更必须仍被 saveSession 落库，否则会话永远停在 matching");
        assertTrue(events.indexOf("save-session") > events.indexOf("tx-begin")
                        && events.indexOf("save-session") < events.indexOf("tx-commit"),
                "会话更新必须落在落库事务内，实际序列: " + events);
        assertEquals(1, saved.getValue().getUserBUnreadCount(),
                "userA 发送应累加 userB 未读数，且与消息插入同一事务");
    }

    @Test
    @DisplayName("命中高风险：不开事务、不落库、不推送")
    void riskyContentNeverTouchesDatabase() {
        givenSession(SessionPhase.active);
        verdictSuggest = "risky";

        assertThrows(IllegalArgumentException.class, this::send);

        assertFalse(events.contains("tx-begin"), "被拒绝的消息不允许开启事务");
        assertFalse(events.contains("push"), "被拒绝的消息不允许推送");
        assertEquals(List.of("check"), events, "命中即拒绝，不应继续任何写路径，实际: " + events);
        verify(messageRepository, never()).save(any(TempChatMessage.class));
    }

    @Test
    @DisplayName("调用方带外层事务时：外呼期间外层事务被挂起")
    void outerTransactionIsSuspendedAroundContentCheck() {
        givenSession(SessionPhase.active);
        // RealTempChatService.sendMessage 是 @Transactional 的，事务从那里就开了。
        // 只用 REQUIRED 模板的话内层会加入外层事务，外呼照样在事务内——必须挂起。
        TransactionTemplate outer = new TransactionTemplate(txManager);

        outer.execute(status -> {
            send();
            return null;
        });

        assertTrue(checkInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "即使调用方开了事务，调微信那一刻也不允许有活动事务，实际: " + checkInsideTransaction);
        assertTrue(writeInsideTransaction.stream().allMatch(Boolean::booleanValue),
                "落库必须在事务内，实际: " + writeInsideTransaction);
        int suspendAt = events.indexOf("tx-suspend");
        int checkAt = events.indexOf("check");
        int resumeAt = events.indexOf("tx-resume");
        assertTrue(suspendAt >= 0 && checkAt > suspendAt && resumeAt > checkAt,
                "外呼必须夹在 suspend 与 resume 之间，实际序列: " + events);
    }

    @Test
    @DisplayName("sendMessage 不得再声明 @Transactional")
    void sendMessageMustNotBeAnnotatedTransactional() {
        for (Method method : TempChatMessageService.class.getDeclaredMethods()) {
            if ("sendMessage".equals(method.getName())) {
                assertFalse(method.isAnnotationPresent(Transactional.class),
                        "sendMessage 重新带上 @Transactional 会把微信外呼圈回事务里");
            }
        }
        assertFalse(TempChatMessageService.class.isAnnotationPresent(Transactional.class),
                "类级 @Transactional 会让所有方法回到事务内");
    }
}
