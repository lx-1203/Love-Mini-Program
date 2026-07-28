package com.campuslove.api.repository;

import com.campuslove.api.entity.TempChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * Task 2.2.4：根据会话 ID 查询消息列表（正序），并通过 @EntityGraph 一次性预加载 session 关联。
     * <p>{@link TempChatMessage#getSession()} 是 LAZY 加载，
     * 调用方在 View 转换层访问 {@code message.getSession().getId()} 等字段时
     * 会为每条消息触发一次 SELECT session 查询（N+1 问题）。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 session，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param sessionId 会话 ID
     * @return 消息列表（session 已被预加载）
     */
    @EntityGraph(attributePaths = "session")
    @Query("SELECT m FROM TempChatMessage m WHERE m.session.id = :sessionId ORDER BY m.createdAt ASC")
    List<TempChatMessage> findWithSessionBySessionIdOrderByCreatedAtAsc(@Param("sessionId") Long sessionId);

    /**
     * 统计指定会话中的消息数量。
     *
     * @param sessionId 会话 ID
     * @return 消息数量
     */
    long countBySessionId(Long sessionId);
}
