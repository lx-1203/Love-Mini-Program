package com.campuslove.api.repository;

import com.campuslove.api.entity.PrivateMessage;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * 私信消息 Repository。
 * 提供基于会话的查询和批量更新方法。
 */
public interface PrivateMessageRepository extends JpaRepository<PrivateMessage, Long> {

    /**
     * 根据会话 ID 查询消息列表，按创建时间正序。
     *
     * @param conversationId 会话 ID
     * @return 消息列表
     */
    List<PrivateMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    /**
     * 根据会话 ID 查询消息列表，按创建时间倒序分页。
     *
     * @param conversationId 会话 ID
     * @param pageable       分页参数
     * @return 分页消息列表
     */
    Page<PrivateMessage> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    /**
     * 统计指定会话中指定发送者未读消息数量。
     *
     * @param conversationId 会话 ID
     * @param senderId       发送者 ID（排除自己的消息）
     * @param isRead         是否已读
     * @return 未读消息数量
     */
    long countByConversationIdAndSenderIdNotAndIsRead(Long conversationId, Long senderId, boolean isRead);

    /**
     * 批量标记会话中对方发送的未读消息为已读。
     * 使用 @Modifying 批量更新，避免逐条 save 的性能问题。
     *
     * @param conversationId 会话 ID
     * @param currentUserId  当前用户 ID（排除自己发送的消息）
     * @return 更新的记录数
     */
    @Modifying
    @Transactional
    @Query("UPDATE PrivateMessage m SET m.isRead = true WHERE m.conversation.id = :conversationId AND m.sender.id <> :currentUserId AND m.isRead = false")
    int markAsReadByConversationAndSenderNot(@Param("conversationId") Long conversationId, @Param("currentUserId") Long currentUserId);
}
