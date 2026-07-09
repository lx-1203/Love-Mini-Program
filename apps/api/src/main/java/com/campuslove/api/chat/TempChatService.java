package com.campuslove.api.chat;

import java.util.List;

/**
 * 临时聊天服务接口。
 * 提供临时聊天会话的创建、消息发送、联系交换、结束会话等功能。
 */
public interface TempChatService {

    /**
     * 获取聊天概览，包含会话列表和推荐的人。
     */
    ChatOverviewView getOverview();

    /**
     * 获取会话列表。
     */
    List<ChatSessionSummaryView> listSessions();

    /**
     * 创建临时聊天会话。
     */
    TempChatSessionView createSession(String recommendedPersonId, String matchId);

    /**
     * 获取指定会话详情。
     */
    TempChatSessionView getSession(String id);

    /**
     * 在指定会话中发送消息。
     */
    TempChatSessionView sendMessage(String id, ChatMessageRequest request);

    /**
     * 响应联系交换请求。
     */
    TempChatSessionView respondToContactExchange(String id, ContactExchangeDecisionRequest request);

    /**
     * 结束指定会话。
     */
    TempChatSessionView endSession(String id);

    /**
     * 置顶指定会话。
     */
    ChatSessionSummaryView pinSession(String id);

    /**
     * 取消置顶指定会话。
     */
    ChatSessionSummaryView unpinSession(String id);

    /**
     * 标记指定会话为已读。
     */
    ChatSessionSummaryView markSessionRead(String id);

    /**
     * 撤回指定会话中的某条消息。
     * 仅发送者本人可在发送后 2 分钟内撤回。
     */
    TempChatSessionView recallMessage(String sessionId, String messageId);
}
