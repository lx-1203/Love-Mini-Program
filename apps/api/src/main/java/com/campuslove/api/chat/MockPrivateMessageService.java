package com.campuslove.api.chat;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 私信服务实现。
 * 在 mock profile 下激活，返回空列表。
 */
@Profile("mock")
@Service
public class MockPrivateMessageService implements PrivateMessageService {

    @Override
    public List<ConversationView> getConversations(Long userId) {
        return List.of();
    }

    @Override
    public ConversationView createOrGetConversation(Long userAId, Long userBId) {
        return new ConversationView(
            1L, "conv-1", userAId, userBId,
            "Mock用户", null, null, null, 0
        );
    }

    @Override
    public MessageView sendMessage(Long conversationId, Long senderId, String content, String kind) {
        return new MessageView(
            1L, conversationId, senderId, content, kind, false, "2026-01-01T00:00:00"
        );
    }

    @Override
    public List<MessageView> getMessages(Long conversationId, Long userId, Pageable pageable) {
        return List.of();
    }

    @Override
    public void markAsRead(Long conversationId, Long userId) {
        // Mock 实现：无操作
    }

    // ---- Phase 2 新增：会话置顶 ----

    @Override
    public void pinConversation(Long conversationId, boolean pinned, Long userId) {
        // Mock 实现：无操作
    }
}
