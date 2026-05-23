package com.campuslove.api.discover;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 每日一问服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 */
@Profile("mock")
@Service
public class MockDailyQuestionService implements DailyQuestionService {

  private final AtomicLong questionIdSeq = new AtomicLong(1);
  private final AtomicLong answerIdSeq = new AtomicLong(1);
  private final Map<Long, QuestionState> questionsById = new LinkedHashMap<>();
  private final Map<Long, List<AnswerState>> answersByQuestionId = new LinkedHashMap<>();

  @Override
  public DailyQuestionView getTodayQuestion(Long userId) {
    LocalDate today = LocalDate.now();
    for (Map.Entry<Long, QuestionState> entry : questionsById.entrySet()) {
      if (entry.getValue().questionDate().equals(today)) {
        boolean hasAnswered = userId != null && hasAnswered(userId, entry.getKey());
        return toQuestionView(entry.getKey(), entry.getValue(), hasAnswered);
      }
    }

    long questionId = questionIdSeq.getAndIncrement();
    QuestionState questionState = new QuestionState(
        today,
        "你理想的第一次约会是什么样的？"
    );
    questionsById.put(questionId, questionState);
    answersByQuestionId.putIfAbsent(questionId, new ArrayList<>());
    return toQuestionView(questionId, questionState, false);
  }

  @Override
  public DailyAnswerView submitAnswer(Long userId, Long questionId, String content, boolean isAnonymous) {
    if (questionId == null || content == null || content.isBlank()) {
      throw new IllegalArgumentException("questionId and content are required");
    }

    QuestionState question = questionsById.get(questionId);
    if (question == null) {
      throw new IllegalArgumentException("question not found: " + questionId);
    }

    long answerId = answerIdSeq.getAndIncrement();
    AnswerState answerState = new AnswerState(
        answerId,
        questionId,
        userId != null ? userId : 0L,
        content,
        isAnonymous
    );

    List<AnswerState> answers = answersByQuestionId.computeIfAbsent(questionId, k -> new ArrayList<>());
    answers.add(answerState);

    return toAnswerView(answerState);
  }

  @Override
  public Page<DailyAnswerView> getAnswers(Long questionId, Long currentUserId, Pageable pageable) {
    if (questionId == null) {
      throw new IllegalArgumentException("questionId is required");
    }

    // 权限检查：只有已回答的用户才能查看
    if (currentUserId != null && !hasAnswered(currentUserId, questionId)) {
      throw new IllegalStateException("请先回答问题才能查看其他人的回答");
    }

    List<AnswerState> answers = answersByQuestionId.getOrDefault(questionId, List.of());

    if (answers.isEmpty()) {
      // 返回 mock 数据
      List<DailyAnswerView> mockAnswers = buildMockAnswers(questionId);
      int start = (int) pageable.getOffset();
      int end = Math.min(start + pageable.getPageSize(), mockAnswers.size());
      List<DailyAnswerView> pageContent = start < mockAnswers.size()
          ? mockAnswers.subList(start, end) : List.of();
      return new PageImpl<>(pageContent, pageable, mockAnswers.size());
    }

    List<DailyAnswerView> views = answers.stream()
        .map(this::toAnswerView)
        .toList();

    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), views.size());
    List<DailyAnswerView> pageContent = start < views.size()
        ? views.subList(start, end) : List.of();
    return new PageImpl<>(pageContent, pageable, views.size());
  }

  @Override
  public boolean hasAnswered(Long userId, Long questionId) {
    if (userId == null || questionId == null) {
      return false;
    }
    List<AnswerState> answers = answersByQuestionId.getOrDefault(questionId, List.of());
    return answers.stream().anyMatch(a -> a.userId.equals(userId));
  }

  private List<DailyAnswerView> buildMockAnswers(Long questionId) {
    List<DailyAnswerView> mockAnswers = new ArrayList<>();

    mockAnswers.add(new DailyAnswerView(
        1001L,
        1002L,
        "林安",
        "希望是傍晚在校园里散步，聊聊天，去图书馆旁边的咖啡馆坐一坐。不用太复杂，轻松自然就好。",
        false,
        LocalDateTime.now().minusHours(1)
    ));

    mockAnswers.add(new DailyAnswerView(
        1002L,
        1003L,
        "周沐",
        "一起去逛书店或者看一场展览吧，安静又有话题可以聊。",
        false,
        LocalDateTime.now().minusHours(2)
    ));

    mockAnswers.add(new DailyAnswerView(
        1003L,
        null,
        "匿名用户",
        "想在操场看星星，带两杯奶茶，随便聊聊各自的专业和兴趣。",
        true,
        LocalDateTime.now().minusHours(3)
    ));

    return mockAnswers;
  }

  private DailyQuestionView toQuestionView(Long id, QuestionState state, boolean hasAnswered) {
    return new DailyQuestionView(id, state.questionDate(), state.questionText(), hasAnswered);
  }

  private DailyAnswerView toAnswerView(AnswerState state) {
    String displayName = state.isAnonymous ? "匿名用户" : "Mock用户";
    Long displayUserId = state.isAnonymous ? null : state.userId;
    return new DailyAnswerView(
        state.id,
        displayUserId,
        displayName,
        state.content,
        state.isAnonymous,
        LocalDateTime.now()
    );
  }

  private record QuestionState(
      LocalDate questionDate,
      String questionText
  ) {}

  private record AnswerState(
      long id,
      long questionId,
      Long userId,
      String content,
      boolean isAnonymous
  ) {}
}
