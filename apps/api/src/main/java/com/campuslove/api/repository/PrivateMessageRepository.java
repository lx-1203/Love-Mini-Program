package com.campuslove.api.repository;

import com.campuslove.api.entity.PrivateMessage;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
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
     * Task 2.2.4：根据会话 ID 分页查询消息，并通过 @EntityGraph 一次性预加载 conversation 关联。
     * <p>{@link PrivateMessage#getConversation()} 是 LAZY 加载，
     * 调用方在 View 转换层访问 {@code message.getConversation().getId()} 等字段时
     * 会为每条消息触发一次 SELECT conversation 查询（N+1 问题）。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 conversation，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param conversationId 会话 ID
     * @param pageable       分页参数
     * @return 分页消息列表（conversation 已被预加载）
     */
    @EntityGraph(attributePaths = "conversation")
    @Query("SELECT m FROM PrivateMessage m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt DESC")
    Page<PrivateMessage> findWithConversationByConversationIdOrderByCreatedAtDesc(
            @Param("conversationId") Long conversationId, Pageable pageable);

    /**
     * Task 2.2.4：根据会话 ID 查询消息列表（正序），并通过 @EntityGraph 一次性预加载 conversation 关联。
     * <p>用于聊天历史消息渲染场景，避免在循环中访问 conversation 字段时触发 N+1 查询。</p>
     *
     * @param conversationId 会话 ID
     * @return 消息列表（conversation 已被预加载）
     */
    @EntityGraph(attributePaths = "conversation")
    @Query("SELECT m FROM PrivateMessage m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt ASC")
    List<PrivateMessage> findWithConversationByConversationIdOrderByCreatedAtAsc(
            @Param("conversationId") Long conversationId);

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
