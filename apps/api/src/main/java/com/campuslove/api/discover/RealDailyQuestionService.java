package com.campuslove.api.discover;

import com.campuslove.api.entity.DailyAnswer;
import com.campuslove.api.entity.DailyQuestion;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.DailyQuestionRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实每日一问服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 支持匿名回答：匿名回答显示"匿名用户"，非匿名回答显示真实用户信息。
 */
@Profile("real")
@Service
public class RealDailyQuestionService implements DailyQuestionService {

    private static final Logger log = LoggerFactory.getLogger(RealDailyQuestionService.class);

    /** 匿名用户显示名称 */
    private static final String ANONYMOUS_DISPLAY_NAME = "匿名用户";

    private final DailyQuestionRepository dailyQuestionRepository;
    private final DailyAnswerRepository dailyAnswerRepository;
    private final UserRepository userRepository;

    public RealDailyQuestionService(
            DailyQuestionRepository dailyQuestionRepository,
            DailyAnswerRepository dailyAnswerRepository,
            UserRepository userRepository) {
        this.dailyQuestionRepository = dailyQuestionRepository;
        this.dailyAnswerRepository = dailyAnswerRepository;
        this.userRepository = userRepository;
    }

    /**
     * 获取今日问题。
     * 查询当日 DailyQuestion 记录，若无则返回最近的问题。
     *
     * @param userId 当前用户 ID（用于判断是否已回答），可为 null
     * @return 每日一问视图
     */
    @Override
    @Transactional(readOnly = true)
    public DailyQuestionView getTodayQuestion(Long userId) {
        LocalDate today = LocalDate.now();
        log.debug("获取今日问题，日期: {}, userId: {}", today, userId);

        // 1. 查询当日问题
        DailyQuestion question = dailyQuestionRepository.findByQuestionDate(today).orElse(null);

        // 2. 若当日无问题，则查询最近的问题（按日期倒序取第一条）
        if (question == null) {
            log.debug("当日无问题记录，查询最近的问题");
            Page<DailyQuestion> latestPage = dailyQuestionRepository.findAll(
                    org.springframework.data.domain.PageRequest.of(0, 1,
                            org.springframework.data.domain.Sort.by(
                                    org.springframework.data.domain.Sort.Direction.DESC, "questionDate")));
            if (latestPage.hasContent()) {
                question = latestPage.getContent().get(0);
            }
        }

        // 3. 若仍无问题，抛出异常
        if (question == null) {
            log.warn("系统中不存在任何每日一问记录");
            throw new RuntimeException("暂无每日一问记录，请稍后再试");
        }

        // 4. 判断当前用户是否已回答
        boolean hasAnswered = userId != null && hasAnswered(userId, question.getId());

        return toQuestionView(question, hasAnswered);
    }

    /**
     * 提交每日一问的回答。
     * 创建 DailyAnswer 记录，支持匿名回答。
     *
     * @param userId      用户 ID
     * @param questionId  问题 ID
     * @param content     回答内容
     * @param isAnonymous 是否匿名
     * @return 回答视图
     */
    @Override
    @Transactional
    public DailyAnswerView submitAnswer(Long userId, Long questionId, String content, boolean isAnonymous) {
        // 参数校验
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (questionId == null) {
            throw new IllegalArgumentException("questionId is required");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        log.debug("提交回答，userId: {}, questionId: {}, isAnonymous: {}", userId, questionId, isAnonymous);

        // 查询问题是否存在
        DailyQuestion question = dailyQuestionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("问题不存在: " + questionId));

        // 检查是否重复回答
        if (dailyAnswerRepository.existsByQuestionIdAndUserId(questionId, userId)) {
            throw new IllegalStateException("您已经回答过该问题，不能重复回答");
        }

        // 创建回答记录
        LocalDateTime now = LocalDateTime.now();
        DailyAnswer answer = new DailyAnswer();
        answer.setQuestion(question);
        answer.setUserId(userId);
        answer.setContent(content);
        answer.setIsAnonymous(isAnonymous);
        answer.setCreatedAt(now);

        dailyAnswerRepository.save(answer);
        log.info("回答提交成功，answerId: {}, userId: {}, questionId: {}", answer.getId(), userId, questionId);

        return toAnswerView(answer);
    }

    /**
     * 获取指定问题的回答列表（分页）。
     * 只有当前用户已回答该问题时才能查看其他人的回答。
     * 匿名回答显示"匿名用户"，非匿名回答显示真实用户信息。
     *
     * @param questionId    问题 ID
     * @param currentUserId 当前用户 ID（用于权限校验）
     * @param pageable      分页参数
     * @return 回答视图分页列表
     */
    @Override
    @Transactional(readOnly = true)
    public Page<DailyAnswerView> getAnswers(Long questionId, Long currentUserId, Pageable pageable) {
        if (questionId == null) {
            throw new IllegalArgumentException("questionId is required");
        }

        log.debug("获取回答列表，questionId: {}, currentUserId: {}, page: {}, size: {}",
                questionId, currentUserId, pageable.getPageNumber(), pageable.getPageSize());

        // 权限检查：只有已回答的用户才能查看
        if (currentUserId != null && !hasAnswered(currentUserId, questionId)) {
            throw new IllegalStateException("请先回答问题才能查看其他人的回答");
        }

        // 查询问题是否存在
        if (!dailyQuestionRepository.existsById(questionId)) {
            throw new IllegalArgumentException("问题不存在: " + questionId);
        }

        // 分页查询回答列表
        Page<DailyAnswer> answerPage = dailyAnswerRepository.findByQuestionIdOrderByCreatedAtDesc(questionId, pageable);

        // 转换为视图
        return answerPage.map(this::toAnswerView);
    }

    /**
     * 检查指定用户是否已回答指定问题。
     *
     * @param userId     用户 ID
     * @param questionId 问题 ID
     * @return 是否已回答
     */
    @Override
    @Transactional(readOnly = true)
    public boolean hasAnswered(Long userId, Long questionId) {
        if (userId == null || questionId == null) {
            return false;
        }
        return dailyAnswerRepository.existsByQuestionIdAndUserId(questionId, userId);
    }

    // ---- 私有辅助方法 ----

    /**
     * 将 DailyQuestion 实体转换为 DailyQuestionView。
     *
     * @param question   问题实体
     * @param hasAnswered 当前用户是否已回答
     * @return 问题视图
     */
    private DailyQuestionView toQuestionView(DailyQuestion question, boolean hasAnswered) {
        return new DailyQuestionView(
                question.getId(),
                question.getQuestionDate(),
                question.getQuestionText(),
                hasAnswered
        );
    }

    /**
     * 将 DailyAnswer 实体转换为 DailyAnswerView。
     * 匿名回答显示"匿名用户"，userId 置为 null；
     * 非匿名回答显示真实用户昵称和 userId。
     *
     * @param answer 回答实体
     * @return 回答视图
     */
    private DailyAnswerView toAnswerView(DailyAnswer answer) {
        if (Boolean.TRUE.equals(answer.getIsAnonymous())) {
            // 匿名回答：隐藏用户信息
            return new DailyAnswerView(
                    answer.getId(),
                    null,
                    ANONYMOUS_DISPLAY_NAME,
                    answer.getContent(),
                    true,
                    answer.getCreatedAt()
            );
        }

        // 非匿名回答：查询真实用户信息
        User user = userRepository.findById(answer.getUserId()).orElse(null);
        String authorName = user != null ? user.getNickname() : "未知用户";

        return new DailyAnswerView(
                answer.getId(),
                answer.getUserId(),
                authorName,
                answer.getContent(),
                false,
                answer.getCreatedAt()
        );
    }
}
