package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatSessionRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.access.AccessDeniedException;

/** TempChatMediaService 单元测试（2026-10-28 强匿名 B）。 */
class TempChatMediaServiceTest {

    @Mock private TempChatSessionRepository sessionRepository;

    private TempChatMediaService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new TempChatMediaService(sessionRepository, 24);
    }

    private TempChatSession session(SessionPhase phase, LocalDateTime closesAt) {
        TempChatSession s = new TempChatSession();
        s.setId(5L);
        s.setSessionUid("session-a-b");
        s.setUserAId(1L);
        s.setUserBId(2L);
        s.setPhase(phase);
        s.setClosesAt(closesAt);
        return s;
    }

    @Test
    void requireUploadable_allowsParticipantInActiveSession() {
        TempChatSession active = session(SessionPhase.active, LocalDateTime.now().plusHours(2));
        when(sessionRepository.findBySessionUid("session-a-b")).thenReturn(Optional.of(active));

        assertEquals(active, service.requireUploadable("session-a-b", 2L));
    }

    @Test
    void requireUploadable_deniesOutsider() {
        when(sessionRepository.findBySessionUid("session-a-b"))
                .thenReturn(Optional.of(session(SessionPhase.active, LocalDateTime.now().plusHours(2))));

        assertThrows(AccessDeniedException.class,
                () -> service.requireUploadable("session-a-b", 3L));
        assertFalse(service.canRead("session-a-b", 3L));
    }

    @Test
    void requireUploadable_deniesClosedSession() {
        when(sessionRepository.findBySessionUid("session-a-b"))
                .thenReturn(Optional.of(session(SessionPhase.closed, LocalDateTime.now().plusHours(2))));

        assertThrows(AccessDeniedException.class,
                () -> service.requireUploadable("session-a-b", 1L));
    }

    @Test
    void requireReadable_allowsClosedWithinGraceButRejectsExpired() {
        TempChatSession closedRecently = session(SessionPhase.closed, LocalDateTime.now().minusHours(1));
        when(sessionRepository.findBySessionUid("session-a-b")).thenReturn(Optional.of(closedRecently));
        assertTrue(service.canRead("session-a-b", 1L));

        TempChatSession expiredLongAgo = session(SessionPhase.closed, LocalDateTime.now().minusHours(25));
        when(sessionRepository.findBySessionUid("session-a-b")).thenReturn(Optional.of(expiredLongAgo));
        assertFalse(service.canRead("session-a-b", 1L));
    }

    @Test
    void retentionDeadline_isClosesAtPlusGrace() {
        LocalDateTime closesAt = LocalDateTime.now().plusHours(3);
        assertEquals(closesAt.plusHours(24), service.retentionDeadline(session(SessionPhase.active, closesAt)));
    }
}
