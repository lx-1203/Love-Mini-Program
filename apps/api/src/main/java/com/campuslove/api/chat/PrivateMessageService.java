package com.campuslove.api.chat;

import java.util.List;
import org.springframework.data.domain.Pageable;

/**
 * 私信服务接口。
 * 提供私信会话管理、消息发送、消息读取等功能。
 */
public interface PrivateMessageService {

    /**
     * 获取用户的会话列表。
     *
     * @param userId 用户 ID
     * @return 会话视图列表
     */
    List<ConversationView> getConversations(Long userId);

    /**
     * 创建或获取两个用户之间的会话。
     * 如果已存在会话，则返回已有会话；否则创建新会话。
     *
     * @param userAId 用户 A ID
     * @param userBId 用户 B ID
     * @return 会话视图
     */
    ConversationView createOrGetConversation(Long userAId, Long userBId);

    /**
     * 在指定会话中发送消息。
     *
     * @param conversationId 会话 ID
     * @param senderId       发送者 ID
     * @param content        消息内容
     * @param kind           消息类型 (text/image/voice 等)
     * @return 消息视图
     */
    MessageView sendMessage(Long conversationId, Long senderId, String content, String kind);

    /**
     * 获取指定会话的消息列表（分页），同时标记消息为已读。
     *
     * @param conversationId 会话 ID
     * @param userId         当前用户 ID（用于标记已读）
     * @param pageable       分页参数
     * @return 消息视图列表
     */
    List<MessageView> getMessages(Long conversationId, Long userId, Pageable pageable);

    /**
     * 标记指定会话中所有未读消息为已读。
     *
     * @param conversationId 会话 ID
     * @param userId         当前用户 ID
     */
    void markAsRead(Long conversationId, Long userId);
}
