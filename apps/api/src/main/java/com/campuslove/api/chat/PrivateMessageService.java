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
     * @param conversationId  会话 ID
     * @param senderId        发送者 ID
     * @param content         消息内容
     * @param kind            消息类型 (text/image/voice 等)
     * @param durationSeconds 语音消息时长（秒），非语音消息传 null
     * @return 消息视图
     */
    MessageView sendMessage(Long conversationId, Long senderId, String content, String kind,
                            Integer durationSeconds);

    /**
     * 获取指定会话的消息列表（分页），同时标记消息为已读。
     *
     * @param conversationId 会话 ID
     * @param userId         当前用户 ID（用于标记已读）
     * @param pageable       分页参数
     * @param order          排序方向：desc（最新在前，默认）/ asc（最早在前，上拉加载更早历史）
     * @return 消息视图列表
     */
    List<MessageView> getMessages(Long conversationId, Long userId, Pageable pageable, String order);

    /**
     * 标记指定会话中所有未读消息为已读。
     *
     * @param conversationId 会话 ID
     * @param userId         当前用户 ID
     */
    void markAsRead(Long conversationId, Long userId);

    // ---- Phase 2 新增：会话置顶 ----

    /**
     * 设置会话置顶状态。
     *
     * @param conversationId 会话 ID
     * @param pinned         是否置顶
     * @param userId         当前用户 ID（用于验证）
     */
    void pinConversation(Long conversationId, boolean pinned, Long userId);

    // ---- M-06/P0-07：删除会话 ----

    /**
     * 删除会话及其全部消息（仅会话参与者可操作）。
     *
     * @param conversationId 会话 ID
     * @param userId         当前用户 ID（用于验证参与者身份）
     * @throws IllegalArgumentException 会话不存在或当前用户非会话参与者时抛出
     */
    void deleteConversation(Long conversationId, Long userId);

    // ---- 3-G：删除消息（软删，微信语义：仅删除者对自己隐藏，不删对方） ----

    /**
     * 软删单条消息（仅消息发送者本人可操作）。
     *
     * <p>微信语义：删除消息仅删除自己可见的那份，对方聊天记录不受影响。
     * 实现为 {@code deleted_for_sender} 标记置 1，查询侧对发送者本人隐藏。</p>
     *
     * <p>幂等：同一消息重复删除直接返回成功。</p>
     *
     * @param messageId 消息 ID
     * @param userId    当前用户 ID（用于校验消息属主）
     * @throws com.campuslove.api.common.ResourceNotFoundException 消息不存在或非发送者本人时抛出
     */
    void softDeleteMessage(Long messageId, Long userId);

    // ---- 2026-08-10 B1③：会话级免打扰 ----

    /**
     * 设置当前用户对指定会话的免打扰（mute）状态。
     *
     * <p>按用户侧独立存储（user_a_muted / user_b_muted），A 静音不影响 B 的接收；
     * 仅会话参与者可操作。</p>
     *
     * @param conversationId 会话 ID
     * @param muted          是否静音
     * @param userId         当前用户 ID（用于校验参与者身份并按侧写入）
     * @throws IllegalArgumentException 会话不存在或当前用户非会话参与者时抛出
     */
    void setConversationMuted(Long conversationId, boolean muted, Long userId);
}
