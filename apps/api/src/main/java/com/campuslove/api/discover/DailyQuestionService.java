package com.campuslove.api.discover;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 每日一问服务接口。
 * 提供获取今日问题、提交回答、查询回答列表的功能。
 */
public interface DailyQuestionService {

    /**
     * 获取今日问题。
     * 如果今天还没有生成问题，则从预定义列表中随机选取一个创建。
     *
     * @param userId 当前用户 ID（用于判断是否已回答），可为 null
     * @return 每日一问视图
     */
    DailyQuestionView getTodayQuestion(Long userId);

    /**
     * 提交每日一问的回答。
     *
     * @param userId      用户 ID
     * @param questionId  问题 ID
     * @param content     回答内容
     * @param isAnonymous 是否匿名
     * @return 回答视图
     */
    DailyAnswerView submitAnswer(Long userId, Long questionId, String content, boolean isAnonymous);

    /**
     * 获取指定问题的回答列表（分页）。
     * 只有当前用户已回答该问题时才能查看其他人的回答。
     *
     * @param questionId    问题 ID
     * @param currentUserId 当前用户 ID（用于权限校验）
     * @param pageable      分页参数
     * @return 回答视图分页列表
     */
    Page<DailyAnswerView> getAnswers(Long questionId, Long currentUserId, Pageable pageable);

    /**
     * 检查指定用户是否已回答指定问题。
     *
     * @param userId     用户 ID
     * @param questionId 问题 ID
     * @return 是否已回答
     */
    boolean hasAnswered(Long userId, Long questionId);
}

/**
 * 每日一问问题视图。
 */
record DailyQuestionView(
    Long id,
    LocalDate questionDate,
    String questionText,
    boolean hasAnswered,
    /** 问题分类 */
    String category,
    /** 回答数量 */
    int answerCount
) {}

/**
 * 每日一问回答视图。
 */
record DailyAnswerView(
    Long id,
    Long userId,
    String authorName,
    String content,
    boolean isAnonymous,
    java.time.LocalDateTime createdAt,
    /** 回答者头像 URL（匿名时为空） */
    String avatarUrl
) {}
