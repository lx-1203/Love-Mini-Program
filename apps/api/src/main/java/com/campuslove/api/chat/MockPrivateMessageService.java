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
            "Mock用户", null, null, null, 0,
            null, false, "matching", "private", false
        );
    }

    @Override
    public MessageView sendMessage(Long conversationId, Long senderId, String content, String kind,
                                   Integer durationSeconds) {
        return new MessageView(
            1L, conversationId, senderId, content, kind, false, "2026-01-01T00:00:00",
            null, durationSeconds
        );
    }

    @Override
    public List<MessageView> getMessages(Long conversationId, Long userId, Pageable pageable, String order) {
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

    // ---- M-06/P0-07：删除会话 ----

    @Override
    public void deleteConversation(Long conversationId, Long userId) {
        // Mock 实现：无操作
    }

    // ---- 3-G：删除消息（软删） ----

    @Override
    public void softDeleteMessage(Long messageId, Long userId) {
        // Mock 实现：无操作（mock 模式消息不落库，无删除语义）
    }

    // ---- 2026-08-10 B1③：会话级免打扰 ----

    @Override
    public void setConversationMuted(Long conversationId, boolean muted, Long userId) {
        // Mock 实现：无操作（mock 模式会话不落库，前端本地维护 mute 状态）
    }
}
