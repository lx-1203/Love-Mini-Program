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
        // 2026-08-23：mock 预置会话，使「最近聊天 / 正在升温 / 有人喜欢你 / 等待回复」可演示。
        long self = userId == null ? 1L : userId;
        return List.of(
            new ConversationView(1L, "conv-demo-1", self, 1001L, "林晓",
                "/static/assets/images/avatars/avatar-1.jpg",
                "今天天气不错，一起在学校里走走吗？",
                java.time.LocalDateTime.now().minusMinutes(8).toString(),
                2, "工业设计大三 · 摄影", false, "active", "private", false,
                new RelationshipInfo("active", 72, java.time.LocalDateTime.now().minusDays(2), 6,
                    java.util.List.of("摄影", "旅行"), 3, null)),
            new ConversationView(2L, "conv-demo-2", self, 1002L, "周沐",
                "/static/assets/images/avatars/avatar-2.jpg",
                "晚上有空一起看电影吗？《星际穿越》",
                java.time.LocalDateTime.now().minusHours(2).toString(),
                1, "计算机研二 · 电影", false, "active", "private", false,
                new RelationshipInfo("active", 55, java.time.LocalDateTime.now().minusDays(1), 3,
                    java.util.List.of("电影", "音乐"), 1, null)),
            new ConversationView(3L, "conv-demo-3", self, 1003L, "许诺",
                "/static/assets/images/avatars/avatar-3.jpg",
                "周末的组织确认啦，等你来~",
                java.time.LocalDateTime.now().minusDays(1).toString(),
                0, "艺术学院 · 音乐", true, "active", "private", false,
                new RelationshipInfo("active", 38, java.time.LocalDateTime.now().minusDays(3), 2,
                    java.util.List.of("音乐"), 0, null))
        );
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
            1L, conversationId, senderId, content, kind, false,
            java.time.LocalDateTime.now().toString(),
            null, durationSeconds
        );
    }

        @Override
    public List<MessageView> getMessages(Long conversationId, Long userId, Pageable pageable, String order) {
        long self = userId == null ? 1L : userId;
        if (conversationId != null && conversationId == 1L) {
            return List.of(
                new MessageView(1L, 1L, self, "你好呀，看到你也喜欢摄影~", "text", true, java.time.LocalDateTime.now().minusMinutes(20).toString(), null, null),
                new MessageView(2L, 1L, 1001L, "是呀，最近在学胶片。你也在北京吗？", "text", false, java.time.LocalDateTime.now().minusMinutes(12).toString(), null, null),
                new MessageView(3L, 1L, self, "在的，北京大学。周末去逛展吗？", "text", true, java.time.LocalDateTime.now().minusMinutes(6).toString(), null, null)
            );
        }
        if (conversationId != null && conversationId == 2L) {
            return List.of(
                new MessageView(4L, 2L, 1002L, "今晚《星际穿越》有重映，走起？", "text", false, java.time.LocalDateTime.now().minusHours(2).toString(), null, null)
            );
        }
        if (conversationId != null && conversationId == 3L) {
            return List.of(
                new MessageView(5L, 3L, 1003L, "周末音乐节，我这边有票~", "text", false, java.time.LocalDateTime.now().minusDays(1).toString(), null, null)
            );
        }
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
