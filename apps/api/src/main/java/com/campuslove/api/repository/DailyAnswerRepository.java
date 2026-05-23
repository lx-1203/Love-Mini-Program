package com.campuslove.api.repository;

import com.campuslove.api.entity.DailyAnswer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
