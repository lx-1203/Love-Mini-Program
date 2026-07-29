package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.redisson.api.RedissonClient;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * TempChatCleanupService 单元测试（Task 4.2.3）。
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
