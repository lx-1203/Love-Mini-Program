package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleReply;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 圈子回复 Repository。
 * 提供基于话题的查询方法。
 */
public interface CircleReplyRepository extends JpaRepository<CircleReply, Long> {

    /**
     * 根据话题 ID 查询回复列表，按创建时间倒序。
     *
     * @param topicId 话题 ID
     * @return 回复列表
     */
    List<CircleReply> findByTopicIdOrderByCreatedAtDesc(Long topicId);

    /**
     * Task 2.2.4：根据话题 ID 查询回复列表，并通过 @EntityGraph 一次性预加载 topic 关联。
     * <p>{@link CircleReply#getTopic()} 是 LAZY 加载，
     * 调用方在 View 转换层访问 {@code reply.getTopic().getId()} 等字段时
     * 会为每条回复触发一次 SELECT topic 查询（N+1 问题）。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 topic，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param topicId 话题 ID
     * @return 回复列表（topic 已被预加载）
     */
    @EntityGraph(attributePaths = "topic")
    @Query("SELECT r FROM CircleReply r WHERE r.topic.id = :topicId ORDER BY r.createdAt DESC")
    List<CircleReply> findWithTopicByTopicIdOrderByCreatedAtDesc(@Param("topicId") Long topicId);
}
