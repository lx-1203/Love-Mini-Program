package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatMessageRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * TempChatMessageService 单元测试（Task 4.2.3）。
 */
class TempChatMessageServiceTest {

    @Mock private TempChatMessageRepository messageRepository;
    @Mock private TempChatSessionService sessionService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    private TempChatMessageService messageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(sessionService.getMessagingTemplate()).thenReturn(messagingTemplate);
        messageService = new TempChatMessageService(messageRepository, sessionService);
    }

    /**
     * 场景：buildMessagePreview 对 voice 类型应返回固定文本。
     */
    @Test
    void buildMessagePreview_voice_returnsFixedPreview() {
        assertEquals("语音消息", TempChatMessageService.buildMessagePreview("voice", "abc"));
    }

    /**
     * 场景：buildMessagePreview 对 emoji 类型应返回固定文本。
     */
    @Test
    void buildMessagePreview_emoji_returnsFixedPreview() {
        assertEquals("表情消息", TempChatMessageService.buildMessagePreview("emoji", "[哈哈]"));
    }

    /**
     * 场景：buildMessagePreview null kind 时应返回原 body。
     */
    @Test
    void buildMessagePreview_nullKind_returnsBody() {
        assertEquals("hello", TempChatMessageService.buildMessagePreview(null, "hello"));
    }

    /**
     * 场景：buildMessagePreview 长文本应截断到 50 字符 + "..."。
     */
    @Test
    void buildMessagePreview_longText_truncatesToFiftyChars() {
        String longText = "a".repeat(100);
        String preview = TempChatMessageService.buildMessagePreview("text", longText);
        assertEquals(50 + 3, preview.length(), "应截断到 50 字符 + 省略号");
        assertTrue(preview.endsWith("..."));
    }

    /**
     * 场景：sendMessage 在 closed 会话中应跳过创建。
     */
    @Test
    void sendMessage_closedSession_doesNotSaveMessage() {
        TempChatSession session = createSession(SessionPhase.closed);
        when(sessionService.resolveSession("sid")).thenReturn(session);
        when(sessionService.isSessionExpired(session)).thenReturn(false);

        ChatMessageRequest req = new ChatMessageRequest("self", "text", "hello", null, null);
        TempChatSession result = messageService.sendMessage("sid", req, 1L);

        assertEquals(session, result, "应原样返回会话");
        verify(messageRepository, org.mockito.Mockito.never()).save(any(TempChatMessage.class));
    }

    /**
     * 场景：sendMessage 在 matching 阶段应自动转为 active。
     */
    @Test
    void sendMessage_matchingPhase_transitionsToActive() {
        TempChatSession session = createSession(SessionPhase.matching);
        when(sessionService.resolveSession("sid")).thenReturn(session);
        when(sessionService.isSessionExpired(session)).thenReturn(false);
        when(sessionService.toMessageView(any())).thenReturn(mock(ChatMessageView.class));
        ArgumentCaptor<TempChatMessage> captor = ArgumentCaptor.forClass(TempChatMessage.class);
        when(messageRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        ChatMessageRequest req = new ChatMessageRequest("self", "text", "hello", null, null);
        messageService.sendMessage("sid", req, 1L);

        assertEquals(SessionPhase.active, session.getPhase(), "matching 应自动转为 active");
        TempChatMessage saved = captor.getValue();
        assertEquals("self", saved.getSender());
        assertEquals("hello", saved.getBody());
        assertEquals("sent", saved.getDeliveryStatus());
    }

    /**
     * 场景：sendMessage peer 消息应增加 userA 未读计数。
     */
    @Test
    void sendMessage_peerMessage_incrementsUserAUnread() {
        TempChatSession session = createSession(SessionPhase.active);
        session.setUserAUnreadCount(2);
        when(sessionService.resolveSession("sid")).thenReturn(session);
        when(sessionService.isSessionExpired(session)).thenReturn(false);
        when(sessionService.toMessageView(any())).thenReturn(mock(ChatMessageView.class));

        ChatMessageRequest req = new ChatMessageRequest("peer", "text", "hi", null, null);
        messageService.sendMessage("sid", req, 1L);

        assertEquals(3, session.getUserAUnreadCount(), "peer 消息应增加 userA 未读计数");
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
