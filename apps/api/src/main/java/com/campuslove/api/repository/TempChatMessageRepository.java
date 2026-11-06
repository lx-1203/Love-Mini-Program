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

    /** R16-3（N+1 治理 P3）：数据导出按会话集合一次批取（原逐会话查询随会话数线性增长）。 */
    java.util.List<TempChatMessage> findBySessionIdInOrderByCreatedAtAsc(java.util.Collection<Long> sessionIds);

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

    /** 删除指定会话的全部消息（保留期到期清理，2026-10-28）。 */
    long deleteBySessionId(Long sessionId);

    /**
     * R17（路线图 R10 收口）：按会话集合批删全部消息。
     *
     * <p>配套 TempChatCleanupService 保留期清理「逐会话 DELETE → 按块批删」改造（块级容错）。
     * 注意：这里用 {@code @Modifying} 批量 JPQL DELETE（单条 DELETE ... WHERE session_id IN）
     * 而非派生删除——派生删除是「先 SELECT 再逐行 remove」，N 行仍是 N 条 DELETE，达不到批删目的。</p>
     *
     * @param sessionIds 会话 ID 集合
     * @return 删除行数
     */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "DELETE FROM TempChatMessage m WHERE m.session.id IN :sessionIds")
    int deleteBySessionIdIn(@org.springframework.data.repository.query.Param("sessionIds")
                            java.util.Collection<Long> sessionIds);
}
