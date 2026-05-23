package com.campuslove.api.repository;

import com.campuslove.api.entity.TempChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 临时聊天消息 Repository。
 * 提供基于会话的查询方法。
 */
public interface TempChatMessageRepository extends JpaRepository<TempChatMessage, Long> {

    /**
     * 根据会话 ID 查询消息列表，按创建时间正序排列。
     *
     * @param sessionId 会话 ID
     * @return 消息列表
     */
    List<TempChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    /**
     * 根据会话 ID 查询消息列表，按创建时间倒序排列。
     *
     * @param sessionId 会话 ID
     * @return 消息列表
     */
    List<TempChatMessage> findBySessionIdOrderByCreatedAtDesc(Long sessionId);

    /**
     * 统计指定会话中的消息数量。
     *
     * @param sessionId 会话 ID
     * @return 消息数量
     */
    long countBySessionId(Long sessionId);
}
