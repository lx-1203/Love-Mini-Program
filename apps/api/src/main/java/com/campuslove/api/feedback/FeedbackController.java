package com.campuslove.api.feedback;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.growth.AppConfigService;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 反馈控制器。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 *
 * <p>功能9：新增 POST /api/v1/feedback/images 端点，用于上传反馈图片附件。</p>
 * <p>功能10：新增 GET /api/v1/feedback/my-submissions/{id} 端点，用于查询反馈详情。</p>
 */
@RestController
@Validated
public class FeedbackController {

  private final FeedbackService feedbackService;

  public FeedbackController(FeedbackService feedbackService) {
    this.feedbackService = feedbackService;
  }

  /** 应用配置服务（B6：后台开关执行点）。real profile 注入；mock 为 null。 */
  @org.springframework.beans.factory.annotation.Autowired(required = false)
  private AppConfigService appConfigService;

  /** B6：反馈功能开关校验（app_switch.feedback_open=false → 403） */
  private void ensureFeedbackOpen() {
    if (appConfigService != null && !appConfigService.isSwitchEnabled(AppConfigService.SWITCH_FEEDBACK_OPEN)) {
      throw new OperationForbiddenException(ErrorMessages.FEEDBACK_CLOSED);
    }
  }

  /**
   * 提交问题反馈。
   *
   * <p>速率限制：桶容量 10，每 10 秒补充 1 个令牌（refillTokens=0.1/s），
   * 按客户端 IP 限流，防止反馈接口被滥用刷量。</p>
   */
  @PostMapping("/api/v1/feedback/issues")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<SubmissionRecordView> createIssue(@Valid @RequestBody FeedbackSubmissionRequest request) {
    ensureFeedbackOpen();
    return ApiResponse.ok(feedbackService.submit(FeedbackTicketType.FEEDBACK, request));
  }

  /**
   * 提交功能建议。
   *
   * <p>速率限制：桶容量 10，每 10 秒补充 1 个令牌（refillTokens=0.1/s），
   * 按客户端 IP 限流，防止反馈接口被滥用刷量。</p>
   */
  @PostMapping("/api/v1/feedback/suggestions")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<SubmissionRecordView> createSuggestion(@Valid @RequestBody FeedbackSubmissionRequest request) {
    ensureFeedbackOpen();
    return ApiResponse.ok(feedbackService.submit(FeedbackTicketType.SUGGESTION, request));
  }

  /**
   * 提交活动提案。
   *
   * <p>速率限制：桶容量 10，每 10 秒补充 1 个令牌（refillTokens=0.1/s），
   * 按客户端 IP 限流，防止反馈接口被滥用刷量。</p>
   */
  @PostMapping("/api/v1/feedback/activity-proposals")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<SubmissionRecordView> createActivityProposal(@Valid @RequestBody FeedbackSubmissionRequest request) {
    ensureFeedbackOpen();
    return ApiResponse.ok(feedbackService.submit(FeedbackTicketType.ACTIVITY_PROPOSAL, request));
  }

  @GetMapping("/api/v1/feedback/my-submissions")
  public ApiResponse<List<SubmissionRecordView>> listMySubmissions(
      @RequestParam(name = "type", required = false) FeedbackTicketType type
  ) {
    // listMine 内部已通过 SecurityUtils 获取当前用户ID
    return ApiResponse.ok(feedbackService.listMine(type));
  }

  @GetMapping("/api/v1/admin/feedback")
  public List<SubmissionRecordView> listAdminFeedback() {
    return feedbackService.listAdminFeedback();
  }

  /**
   * 管理员回复/标记反馈为已处理（infra R2-00023 新增端点）。
   *
   * <p>与其余 admin 端点一致返回裸对象（不使用 ApiResponse 包装），
   * 管理后台前端直接按数组/对象消费。</p>
   *
   * @param id    反馈记录 ID
   * @param reply 回复内容（非空）
   * @return 更新后的反馈记录（状态 REVIEWED）
   */
  @PutMapping("/api/v1/admin/feedback/{id}/reply")
  @PreAuthorize("hasRole('ADMIN')")
  public SubmissionRecordView replyFeedback(
      @PathVariable("id") @Positive long id,
      @Valid @RequestBody ReplyFeedbackRequest reply) {
    return feedbackService.replyFeedback(id, reply.reply());
  }

  @PostMapping("/api/v1/admin/activity-proposals/{id}/convert")
  @Idempotent
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<SubmissionRecordView> convertProposal(@PathVariable("id") @Positive long id) {
    return ApiResponse.ok(feedbackService.convertProposal(id));
  }

  /**
   * 功能9：上传反馈图片附件。
   *
   * <p>端点：POST /api/v1/feedback/images（multipart/form-data，字段名 file）</p>
   *
   * <p>业务规则：
   * <ul>
   *   <li>图片格式：jpg/png/webp（由 MediaStorageService 校验）</li>
   *   <li>图片大小：单张 ≤ 5MB（由 RealFeedbackService 校验，比 MediaStorageService 默认 10MB 更严格）</li>
   *   <li>存储路径：uploads/{userId}/{yyyyMM}/{uuid}.{ext}</li>
   * </ul>
   * </p>
   *
   * <p>鉴权：从 SecurityContext 获取当前登录用户 ID。</p>
   *
   * <p>错误处理：
   * <ul>
   *   <li>未登录 → 401 Unauthorized（由 SecurityUtils 抛出）</li>
   *   <li>文件为空 / 超过 5MB / 格式不支持 → IllegalArgumentException → 400 Bad Request</li>
   * </ul>
   * </p>
   *
   * @param file multipart 文件（由 Spring 自动绑定 multipart/form-data 的 file 字段）
   * @return 上传结果，含访问 URL
   */
  @PostMapping("/api/v1/feedback/images")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<FeedbackService.UploadedImageResult> uploadImage(MultipartFile file) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(feedbackService.uploadImage(userId, file));
  }

  /**
   * 功能10：查询反馈提交详情。
   *
   * <p>端点：GET /api/v1/feedback/my-submissions/{id}</p>
   *
   * <p>业务规则：
   * <ul>
   *   <li>仅返回属于当前用户的反馈详情，避免越权访问他人反馈</li>
   *   <li>详情包含完整 content、解析后的 attachments 数组、latestReplyContent</li>
   * </ul>
   * </p>
   *
   * <p>鉴权：从 SecurityContext 获取当前登录用户 ID。</p>
   *
   * <p>错误处理：
   * <ul>
   *   <li>未登录 → 401 Unauthorized（由 SecurityUtils 抛出）</li>
   *   <li>反馈不存在 → IllegalArgumentException → 400 Bad Request</li>
   *   <li>反馈不属于当前用户 → IllegalArgumentException → 400 Bad Request（避免越权）</li>
   * </ul>
   * </p>
   *
   * @param id 反馈记录 ID
   * @return 反馈详情视图
   */
  @GetMapping("/api/v1/feedback/my-submissions/{id}")
  public ApiResponse<SubmissionDetailView> getSubmissionDetail(@PathVariable("id") @Positive long id) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(feedbackService.getSubmissionDetail(userId, id));
  }
}

/**
 * 管理员回复反馈请求体（infra R2-00023）。
 *
 * @param reply 回复内容（必填，非空）
 */
record ReplyFeedbackRequest(
    @jakarta.validation.constraints.NotBlank String reply
) {
}
