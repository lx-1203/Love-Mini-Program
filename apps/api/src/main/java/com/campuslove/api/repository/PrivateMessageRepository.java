package com.campuslove.api.repository;

import com.campuslove.api.entity.PrivateMessage;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 私信消息 Repository。
 * 提供基于会话的查询方法。
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
}
