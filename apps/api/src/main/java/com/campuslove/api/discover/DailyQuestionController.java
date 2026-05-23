package com.campuslove.api.discover;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 每日一问 Controller。
 * 提供获取今日问题、提交回答、查看回答列表的 API。
 */
@RestController
@RequestMapping("/api/daily-question")
public class DailyQuestionController {

  private final DailyQuestionService dailyQuestionService;

  public DailyQuestionController(DailyQuestionService dailyQuestionService) {
    this.dailyQuestionService = dailyQuestionService;
  }

  /**
   * 获取今日问题。
   * GET /api/daily-question/today
   */
  @GetMapping("/today")
  public DailyQuestionView getTodayQuestion(
      @RequestParam(name = "userId", required = false) Long userId) {
    return dailyQuestionService.getTodayQuestion(userId);
  }

  /**
   * 提交每日一问的回答。
   * POST /api/daily-question/answer
   */
  @PostMapping("/answer")
  public DailyAnswerView submitAnswer(@Valid @RequestBody DailyAnswerRequest request) {
    return dailyQuestionService.submitAnswer(
        request.userId(),
        request.questionId(),
        request.content(),
        request.isAnonymous() != null && request.isAnonymous()
    );
  }

  /**
   * 获取指定问题的回答列表。
   * GET /api/daily-question/answers?questionId={id}
   */
  @GetMapping("/answers")
  public Page<DailyAnswerView> getAnswers(
      @RequestParam("questionId") Long questionId,
      @RequestParam(name = "userId", required = false) Long userId,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(page, size);
    return dailyQuestionService.getAnswers(questionId, userId, pageable);
  }
}

// ---------- 请求模型 ----------

/**
 * 每日一问回答请求。
 */
record DailyAnswerRequest(
    Long userId,
    Long questionId,
    @NotBlank @Size(max = 2000) String content,
    Boolean isAnonymous
) {}
