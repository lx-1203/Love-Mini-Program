package com.campuslove.api.repository;

import com.campuslove.api.entity.DailyAnswer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 每日一问回答 Repository。
 * 提供基于问题和用户的查询方法。
 */
public interface DailyAnswerRepository extends JpaRepository<DailyAnswer, Long> {

    /**
     * 根据问题 ID 查询回答列表，按创建时间倒序。
     *
     * @param questionId 问题 ID
     * @return 回答列表
     */
    java.util.List<DailyAnswer> findByQuestionIdOrderByCreatedAtDesc(Long questionId);

    /**
     * 根据问题 ID 分页查询回答列表，按创建时间倒序。
     *
     * @param questionId 问题 ID
     * @param pageable   分页参数
     * @return 回答分页列表
     */
    Page<DailyAnswer> findByQuestionIdOrderByCreatedAtDesc(Long questionId, Pageable pageable);

    /**
     * Task 2.2.4：根据问题 ID 分页查询回答列表，并通过 @EntityGraph 一次性预加载 question 关联。
     * <p>{@link DailyAnswer#getQuestion()} 是 LAZY 加载，
     * 调用方在 View 转换层访问 {@code answer.getQuestion().getId()} / {@code answer.getQuestion().getContent()} 等字段时
     * 会为每条回答触发一次 SELECT question 查询（N+1 问题）。
     * 此方法使用 @EntityGraph 在单条 SQL 中通过 LEFT OUTER JOIN 加载 question，
     * 将原本 N 条 SQL 压缩为 1 条。</p>
     *
     * @param questionId 问题 ID
     * @param pageable   分页参数
     * @return 回答分页列表（question 已被预加载）
     */
    @EntityGraph(attributePaths = "question")
    @Query("SELECT a FROM DailyAnswer a WHERE a.question.id = :questionId ORDER BY a.createdAt DESC")
    Page<DailyAnswer> findWithQuestionByQuestionIdOrderByCreatedAtDesc(
            @Param("questionId") Long questionId, Pageable pageable);

    /**
     * 检查指定问题是否已有指定用户的回答。
     *
     * @param questionId 问题 ID
     * @param userId     用户 ID
     * @return 是否存在回答
     */
    boolean existsByQuestionIdAndUserId(Long questionId, Long userId);

    /**
     * 根据问题 ID 统计回答数量。
     *
     * @param questionId 问题 ID
     * @return 回答数量
     */
    long countByQuestionId(Long questionId);

    /**
     * 根据用户 ID 查询回答列表，按创建时间倒序。
     * 用于破冰引导功能中查找用户最近回答的每日一问。
     *
     * @param userId 用户 ID
     * @return 回答列表
     */
    java.util.List<DailyAnswer> findByUserIdOrderByCreatedAtDesc(Long userId);
}
