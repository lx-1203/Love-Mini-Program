package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleTopic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 圈子话题 Repository。
 * 提供基于圈子的分页查询方法，支持置顶优先排序。
 */
public interface CircleTopicRepository extends JpaRepository<CircleTopic, Long> {

    /**
     * 根据圈子 ID 查询话题，置顶优先，然后按创建时间倒序分页。
     *
     * @param circleId 圈子 ID
     * @param pageable 分页参数
     * @return 分页话题列表
     */
    Page<CircleTopic> findByCircleIdOrderByIsPinnedDescCreatedAtDesc(Long circleId, Pageable pageable);

    /**
     * Task 2.2.4：根据圈子 ID 查询话题，并通过 @EntityGraph 一次性预加载 circle 关联。
     * <p>{@link CircleTopic#getCircle()} 是 LAZY 加载，
     * 调用方在 View 转换层访问 {@code topic.getCircle().getId()} / {@code topic.getCircle().getName()} 等字段时
     * 会为每条话题触发一次 SELECT circle 查询（N+1 问题）。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 circle，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param circleId 圈子 ID
     * @param pageable 分页参数
     * @return 分页话题列表（circle 已被预加载）
     */
    @EntityGraph(attributePaths = "circle")
    @Query("SELECT t FROM CircleTopic t WHERE t.circle.id = :circleId ORDER BY t.isPinned DESC, t.createdAt DESC")
    Page<CircleTopic> findWithCircleByCircleIdOrderByIsPinnedDescCreatedAtDesc(
            @Param("circleId") Long circleId, Pageable pageable);

    /**
     * 根据圈子 ID 统计话题数量。
     *
     * @param circleId 圈子 ID
     * @return 话题数量
     */
    long countByCircleId(Long circleId);

    /**
     * 查询所有话题，按创建时间倒序排列。
     * 用于同校动态流中聚合最新话题。
     *
     * @param pageable 分页参数
     * @return 分页话题列表
     */
    Page<CircleTopic> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * 管理后台 - 某兴趣圈内话题分页查询（置顶优先，按创建时间倒序）。
     * <p>支持作者 ID 与关键字（标题/内容模糊）筛选，并通过 @EntityGraph
     * 一次性预加载 circle 关联，避免 N+1 查询。</p>
     *
     * @param circleId 所属圈子 ID（必填）
     * @param authorId 作者用户 ID 筛选，null 表示不筛选
     * @param keyword  标题/内容模糊关键字，可空
     * @param pageable 分页参数
     * @return 分页话题列表（circle 已被预加载）
     */
    @EntityGraph(attributePaths = "circle")
    @Query("""
            SELECT t FROM CircleTopic t
            WHERE t.circle.id = :circleId
              AND (:authorId IS NULL OR t.authorId = :authorId)
              AND (:keyword IS NULL OR :keyword = '' OR t.title LIKE CONCAT('%', :keyword, '%')
                   OR t.content LIKE CONCAT('%', :keyword, '%'))
            ORDER BY t.isPinned DESC, t.createdAt DESC
            """)
    Page<CircleTopic> searchForAdmin(
            @Param("circleId") Long circleId,
            @Param("authorId") Long authorId,
            @Param("keyword") String keyword,
            Pageable pageable);
}
