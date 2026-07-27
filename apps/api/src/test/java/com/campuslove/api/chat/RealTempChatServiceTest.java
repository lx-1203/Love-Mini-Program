package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * RealTempChatService 单元测试（Task 4.2.3 验证）。
 *
 * <p>验证 RealTempChatService 在 Task 4.2.3 重构后正确委托 3 个组件：</p>
 * <ul>
 *   <li>{@link TempChatSessionService}：会话生命周期（创建/列表/详情/结束/置顶/已读/视图转换）</li>
 *   <li>{@link TempChatMessageService}：消息发送与撤回</li>
 *   <li>{@link TempChatCleanupService}：联系交换状态机与会话过期清理</li>
 * </ul>
 *
 * <p>测试策略：使用内部构造器 {@code RealTempChatService(session, message, cleanup)}
 * 直接注入 mocked 组件，仅验证委托关系（调用次数 + 返回值透传），
 * 不验证业务逻辑（由各组件自身的单元测试覆盖）。</p>
 *
 * <p>sendMessage / recallMessage / respondToContactExchange 涉及
 * {@link com.campuslove.api.config.SecurityUtils#getCurrentUserId()} 静态方法调用，
 * 由 {@link TempChatSessionServiceTest} 等组件测试覆盖端到端流程，
 * 本测试仅覆盖无 SecurityUtils 依赖的 8 个委托方法。</p>
 */
class RealTempChatServiceTest {

    @Mock private TempChatSessionService sessionService;
    @Mock private TempChatMessageService messageService;
    @Mock private TempChatCleanupService cleanupService;

    private RealTempChatService realService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // 使用内部构造器直接注入 mocked 组件，避免构造 10 个 repository/config 依赖
        realService = new RealTempChatService(sessionService, messageService, cleanupService);
    }

    /**
     * 场景：getOverview() 应委托 sessionService.getOverview()。
     */
    @Test
    void getOverview_delegatesToSessionService() {
        ChatOverviewView expected = new ChatOverviewView(
                List.of(), "还没有临时会话时，继续从推荐的人进入。", List.of());
        when(sessionService.getOverview()).thenReturn(expected);

        ChatOverviewView result = realService.getOverview();

        assertSame(expected, result);
        verify(sessionService, times(1)).getOverview();
    }

    /**
     * 场景：listSessions() 应委托 sessionService.listSessions()。
     */
    @Test
    void listSessions_delegatesToSessionService() {
        List<ChatSessionSummaryView> expected = List.of(
                buildSummary("session-1", "rp-1", "Alice"));
        when(sessionService.listSessions()).thenReturn(expected);

        List<ChatSessionSummaryView> result = realService.listSessions();

        assertSame(expected, result);
        verify(sessionService, times(1)).listSessions();
    }

    /**
     * 场景：createSession(recommendedPersonId, matchId) 应委托 sessionService.createSession。
     */
    @Test
    void createSession_delegatesToSessionService() {
        String recommendedPersonId = "rp-1";
        String matchId = "match-1";
        TempChatSessionView expected = buildSessionView("session-1", "rp-1", "Alice");
        when(sessionService.createSession(recommendedPersonId, matchId)).thenReturn(expected);

        TempChatSessionView result = realService.createSession(recommendedPersonId, matchId);

        assertSame(expected, result);
        verify(sessionService, times(1)).createSession(recommendedPersonId, matchId);
    }

    /**
     * 场景：getSession(id) 应委托 sessionService.getSession(id)。
     */
    @Test
    void getSession_delegatesToSessionService() {
        String sessionId = "session-1";
        TempChatSessionView expected = buildSessionView(sessionId, "rp-1", "Alice");
        when(sessionService.getSession(sessionId)).thenReturn(expected);

        TempChatSessionView result = realService.getSession(sessionId);

        assertSame(expected, result);
        verify(sessionService, times(1)).getSession(sessionId);
    }

    /**
     * 场景：endSession(id) 应委托 sessionService.endSession(id)。
     */
    @Test
    void endSession_delegatesToSessionService() {
        String sessionId = "session-1";
        TempChatSessionView expected = buildSessionView(sessionId, "rp-1", "Alice");
        when(sessionService.endSession(sessionId)).thenReturn(expected);

        TempChatSessionView result = realService.endSession(sessionId);

        assertSame(expected, result);
        verify(sessionService, times(1)).endSession(sessionId);
    }

    /**
     * 场景：pinSession(id) 应委托 sessionService.pinSession(id)。
     */
    @Test
    void pinSession_delegatesToSessionService() {
        String sessionId = "session-1";
        ChatSessionSummaryView expected = buildSummary(sessionId, "rp-1", "Alice");
        when(sessionService.pinSession(sessionId)).thenReturn(expected);

        ChatSessionSummaryView result = realService.pinSession(sessionId);

        assertSame(expected, result);
        verify(sessionService, times(1)).pinSession(sessionId);
    }

    /**
     * 场景：unpinSession(id) 应委托 sessionService.unpinSession(id)。
     */
    @Test
    void unpinSession_delegatesToSessionService() {
        String sessionId = "session-1";
        ChatSessionSummaryView expected = buildSummary(sessionId, "rp-1", "Alice");
        when(sessionService.unpinSession(sessionId)).thenReturn(expected);

        ChatSessionSummaryView result = realService.unpinSession(sessionId);

        assertSame(expected, result);
        verify(sessionService, times(1)).unpinSession(sessionId);
    }

    /**
     * 场景：markSessionRead(id) 应委托 sessionService.markSessionRead(id)。
     */
    @Test
    void markSessionRead_delegatesToSessionService() {
        String sessionId = "session-1";
        ChatSessionSummaryView expected = buildSummary(sessionId, "rp-1", "Alice");
        when(sessionService.markSessionRead(sessionId)).thenReturn(expected);

        ChatSessionSummaryView result = realService.markSessionRead(sessionId);

        assertSame(expected, result);
        verify(sessionService, times(1)).markSessionRead(sessionId);
    }

    // ---- 工具方法 ----

    /** 构造测试用 ChatSessionSummaryView（13 个字段全填）。 */
    private ChatSessionSummaryView buildSummary(String id, String rpId, String partnerName) {
        return new ChatSessionSummaryView(
                id, rpId, partnerName, "headline", "今晚 22:00 前",
                "active", "2026-07-28T22:00:00", null,
                "你好", "2026-07-27T10:00:00", "idle",
                false, 0);
    }

    /** 构造测试用 TempChatSessionView（10 个字段全填）。 */
    private TempChatSessionView buildSessionView(String id, String rpId, String partnerName) {
        return new TempChatSessionView(
                id, rpId, partnerName, "headline", "今晚 22:00 前",
                "active", "2026-07-28T22:00:00", null,
                List.of(), new ContactExchangeStateView(null, "idle"));
    }
}
