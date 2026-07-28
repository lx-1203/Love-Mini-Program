package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.ChatConfig;
import com.campuslove.api.config.SecurityUtils;
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
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

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
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private TempChatViewMapper viewMapper;

    private TempChatSessionService sessionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sessionService = new TempChatSessionService(
                chatConfig, sessionRepository, messageRepository, contactExchangeRepository,
                userRepository, userBasicProfileRepository, userCampusProfileRepository,
                userScheduleProfileRepository, recommendationService, messagingTemplate, viewMapper);
        when(chatConfig.getSessionExpireHours()).thenReturn(24);
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
