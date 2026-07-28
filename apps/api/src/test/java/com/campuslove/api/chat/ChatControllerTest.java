package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 聊天页概况控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link ChatController} 的核心场景：</p>
 * <ul>
 *   <li>GET /api/v1/chat/overview → 委托 tempChatService.getOverview</li>
 *   <li>空会话列表场景：返回 emptyStateLead 文案</li>
 *   <li>含会话列表场景：返回正确的 ChatOverviewView 结构</li>
 * </ul>
 */
class ChatControllerTest {

    @Mock private TempChatService tempChatService;

    private ChatController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ChatController(tempChatService);
    }

    @Test
    void getOverview_shouldDelegateToServiceAndReturnView() {
        // Arrange
        ChatOverviewView expected = new ChatOverviewView(
                List.of(),
                "还没有聊天，先去匹配心仪的人吧",
                List.of());
        when(tempChatService.getOverview()).thenReturn(expected);

        // Act
        ChatOverviewView result = controller.getOverview();

        // Assert
        assertNotNull(result);
        assertSame(expected, result, "应原样返回 service 结果");
        verify(tempChatService).getOverview();
    }

    @Test
    void getOverview_shouldReturnEmptySessionsWhenNoChat() {
        // Arrange：空会话场景
        ChatOverviewView emptyView = new ChatOverviewView(
                List.of(),
                "还没有聊天，先去匹配心仪的人吧",
                List.of());
        when(tempChatService.getOverview()).thenReturn(emptyView);

        // Act
        ChatOverviewView result = controller.getOverview();

        // Assert
        assertEquals(0, result.sessions().size(), "无会话时 sessions 应为空");
        assertNotNull(result.emptyStateLead(), "空状态文案不应为 null");
    }

    @Test
    void getOverview_shouldReturnSessionsWithCorrectStructure() {
        // Arrange：含会话列表
        ChatSessionSummaryView session = new ChatSessionSummaryView(
                "session-1", "person-1", "小明", "签名", "今晚 22:00 前",
                "破冰期", "2026-07-27T22:00:00", null, "你好", "2026-07-26T10:00:00",
                "NONE", false, 1);
        RecommendedPersonCardView person = new RecommendedPersonCardView(
                "person-2", "小红", "X", "一句话签名", "同校 · 同专业", "今天有空");
        ChatOverviewView view = new ChatOverviewView(
                List.of(session), null, List.of(person));
        when(tempChatService.getOverview()).thenReturn(view);

        // Act
        ChatOverviewView result = controller.getOverview();

        // Assert
        assertEquals(1, result.sessions().size(), "应返回 1 个会话");
        assertEquals(1, result.recommendedPeople().size(), "应返回 1 个推荐人物");
        ChatSessionSummaryView firstSession = result.sessions().get(0);
        assertEquals("session-1", firstSession.id());
        assertEquals(1, firstSession.unreadCount(), "未读消息数应为 1");
    }

    @Test
    void constructor_shouldAcceptTempChatService() {
        // Arrange & Act & Assert
        assertNotNull(new ChatController(tempChatService));
    }
}
