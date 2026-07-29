package com.campuslove.api.discover;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 每日一问 Controller。
 * 提供获取今日问题、提交回答、查看回答列表的 API。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/v1/daily-question")
@Validated
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
  public ApiResponse<DailyQuestionView> getTodayQuestion() {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(dailyQuestionService.getTodayQuestion(userId));
  }

  /**
   * 提交每日一问的回答。
   * POST /api/daily-question/answer
   *
   * <p>速率限制：桶容量 10，每 6 秒补充 1 个令牌（refillTokens≈0.17/s），
   * 按客户端 IP 限流，防止回答刷屏。实际 refillTokens 取 0.2（每 5 秒 1 个），
   * 兼顾用户体验与防滥用。</p>
   */
  @PostMapping("/answer")
  @RateLimit(capacity = 10, refillTokens = 0.2, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<DailyAnswerView> submitAnswer(@Valid @RequestBody DailyAnswerRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(dailyQuestionService.submitAnswer(
        userId,
        request.questionId(),
        request.content(),
        request.isAnonymous() != null && request.isAnonymous()
    ));
  }

  /**
   * 获取指定问题的回答列表。
   * GET /api/daily-question/answers?questionId={id}
   */
  @GetMapping("/answers")
  public ApiResponse<Page<DailyAnswerView>> getAnswers(
      @RequestParam("questionId") @Positive Long questionId,
      @RequestParam(name = "page", required = false, defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") @Min(1) @Max(100) int size) {
    Long userId = SecurityUtils.getCurrentUserId();
    Pageable pageable = PageRequest.of(page, size);
    return ApiResponse.ok(dailyQuestionService.getAnswers(questionId, userId, pageable));
  }
}

// ---------- 请求模型 ----------

/**
 * 每日一问回答请求。
 * userId 由 SecurityUtils 自动获取，不再从请求体传入。
 */
record DailyAnswerRequest(
    @NotNull @Positive Long questionId,
    @NotBlank @Size(max = 2000) String content,
    Boolean isAnonymous
) {}
