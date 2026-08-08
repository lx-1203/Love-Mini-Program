package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 临时聊天控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link TempChatController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：构造函数注入 tempChatService</li>
 *   <li>场景 2：createSession 委托 service.createSession</li>
 *   <li>场景 3：getSession 委托 service.getSession</li>
 *   <li>场景 4：sendMessage 委托 service.sendMessage</li>
 *   <li>场景 5：respondToContactExchange 委托 service</li>
 *   <li>场景 6：endSession 委托 service.endSession</li>
 *   <li>场景 7：pinSession/unpinSession/markSessionRead 委托 service</li>
 *   <li>场景 8：recallMessage 委托 service.recallMessage</li>
 * </ul>
 *
 * <p>TempChatController 不依赖 SecurityUtils，所有方法均为纯委托，
 * 完整覆盖 controller→service 的调用契约。</p>
 */
class TempChatControllerTest {

    @Mock private TempChatService tempChatService;

    private TempChatController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new TempChatController(tempChatService);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new TempChatController(tempChatService));
    }

    @Test
    void createSession_shouldDelegateToService() {
        // Arrange
        CreateTempChatSessionRequest req = new CreateTempChatSessionRequest("person-1", "match-1", null);
        TempChatSessionView view = buildSessionView("session-1", "person-1");
        when(tempChatService.createSession(eq("person-1"), eq("match-1"), isNull())).thenReturn(view);

        // Act
        TempChatSessionView result = controller.createSession(req);

        // Assert
        assertSame(view, result);
        verify(tempChatService).createSession(eq("person-1"), eq("match-1"), isNull());
    }

    @Test
    void getSession_shouldDelegateToService() {
        // Arrange
        TempChatSessionView view = buildSessionView("session-2", "person-2");
        when(tempChatService.getSession("session-2")).thenReturn(view);

        // Act
        TempChatSessionView result = controller.getSession("session-2");

        // Assert
        assertSame(view, result);
        verify(tempChatService).getSession("session-2");
    }

    @Test
    void sendMessage_shouldDelegateToServiceWithRequest() {
        // Arrange
        ChatMessageRequest msgReq = new ChatMessageRequest(
                "Alice", "text", "你好", null, null);
        TempChatSessionView view = buildSessionView("session-3", "person-3");
        when(tempChatService.sendMessage(eq("session-3"), any(ChatMessageRequest.class)))
                .thenReturn(view);

        // Act
        TempChatSessionView result = controller.sendMessage("session-3", msgReq);

        // Assert
        assertSame(view, result);
        verify(tempChatService).sendMessage(eq("session-3"), eq(msgReq));
    }

    @Test
    void respondToContactExchange_shouldDelegateToService() {
        // Arrange
        ContactExchangeDecisionRequest req = new ContactExchangeDecisionRequest("Alice", "ACCEPT");
        TempChatSessionView view = buildSessionView("session-4", "person-4");
        when(tempChatService.respondToContactExchange(eq("session-4"), eq(req))).thenReturn(view);

        // Act
        TempChatSessionView result = controller.respondToContactExchange("session-4", req);

        // Assert
        assertSame(view, result);
        verify(tempChatService).respondToContactExchange(eq("session-4"), eq(req));
    }

    @Test
    void endSession_shouldDelegateToService() {
        // Arrange
        TempChatSessionView view = buildSessionView("session-5", "person-5");
        when(tempChatService.endSession("session-5")).thenReturn(view);

        // Act
        TempChatSessionView result = controller.endSession("session-5");

        // Assert
        assertSame(view, result);
        verify(tempChatService).endSession("session-5");
    }

    @Test
    void pinSession_shouldDelegateAndReturnSummary() {
        // Arrange
        ChatSessionSummaryView summary = new ChatSessionSummaryView(
                "session-6", "person-6", "小明", "签名", "今晚 22:00 前",
                "破冰期", "2026-07-27T22:00:00", null, "你好", "2026-07-26T10:00:00",
                "NONE", true, 0);
        when(tempChatService.pinSession("session-6")).thenReturn(summary);

        // Act
        ChatSessionSummaryView result = controller.pinSession("session-6");

        // Assert
        assertSame(summary, result);
        verify(tempChatService).pinSession("session-6");
    }

    @Test
    void unpinSession_shouldDelegateAndReturnSummary() {
        // Arrange
        ChatSessionSummaryView summary = new ChatSessionSummaryView(
                "session-7", "person-7", "小红", "签名", "今晚 22:00 前",
                "破冰期", "2026-07-27T22:00:00", null, "你好", "2026-07-26T10:00:00",
                "NONE", false, 0);
        when(tempChatService.unpinSession("session-7")).thenReturn(summary);

        // Act
        ChatSessionSummaryView result = controller.unpinSession("session-7");

        // Assert
        assertSame(summary, result);
        verify(tempChatService).unpinSession("session-7");
    }

    @Test
    void markSessionRead_shouldDelegateAndReturnSummary() {
        // Arrange
        ChatSessionSummaryView summary = new ChatSessionSummaryView(
                "session-8", "person-8", "小张", "签名", "今晚 22:00 前",
                "破冰期", "2026-07-27T22:00:00", null, "你好", "2026-07-26T10:00:00",
                "NONE", false, 0);
        when(tempChatService.markSessionRead("session-8")).thenReturn(summary);

        // Act
        ChatSessionSummaryView result = controller.markSessionRead("session-8");

        // Assert
        assertSame(summary, result);
        verify(tempChatService).markSessionRead("session-8");
    }

    @Test
    void recallMessage_shouldDelegateWithBothIds() {
        // Arrange
        TempChatSessionView view = buildSessionView("session-9", "person-9");
        when(tempChatService.recallMessage(eq("session-9"), eq("msg-1"))).thenReturn(view);

        // Act
        TempChatSessionView result = controller.recallMessage("session-9", "msg-1");

        // Assert
        assertSame(view, result);
        verify(tempChatService).recallMessage(eq("session-9"), eq("msg-1"));
    }

    @Test
    void createSession_shouldHandleNullRecommendedPersonId() {
        // Arrange：仅 matchId 场景（hasEntryPoint 校验由 @Valid 触发）
        CreateTempChatSessionRequest req = new CreateTempChatSessionRequest(null, "match-only", null);
        TempChatSessionView view = buildSessionView("session-10", "person-10");
        when(tempChatService.createSession(eq(null), eq("match-only"), isNull())).thenReturn(view);

        // Act
        TempChatSessionView result = controller.createSession(req);

        // Assert
        assertNotNull(result);
        assertEquals("session-10", result.id());
    }

    /** 构造一个最小可用的会话视图，用于 mock 返回值。 */
    private TempChatSessionView buildSessionView(String id, String personId) {
        return new TempChatSessionView(
                id, personId, "对方昵称", "对方标题", "今晚 22:00 前",
                "ICE_BREAK", "2026-07-27T22:00:00", null,
                List.of(), new ContactExchangeStateView(null, "NONE"));
    }
}
