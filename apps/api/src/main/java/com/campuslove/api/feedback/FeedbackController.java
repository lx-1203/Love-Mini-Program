package com.campuslove.api.feedback;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 反馈控制器。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 *
 * <p>功能9：新增 POST /api/feedback/images 端点，用于上传反馈图片附件。</p>
 * <p>功能10：新增 GET /api/feedback/my-submissions/{id} 端点，用于查询反馈详情。</p>
 */
@RestController
public class FeedbackController {

  private final FeedbackService feedbackService;

  public FeedbackController(FeedbackService feedbackService) {
    this.feedbackService = feedbackService;
  }

  @PostMapping("/api/feedback/issues")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public SubmissionRecordView createIssue(@Valid @RequestBody FeedbackSubmissionRequest request) {
    return feedbackService.submit(FeedbackTicketType.FEEDBACK, request);
  }

  @PostMapping("/api/feedback/suggestions")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public SubmissionRecordView createSuggestion(@Valid @RequestBody FeedbackSubmissionRequest request) {
    return feedbackService.submit(FeedbackTicketType.SUGGESTION, request);
  }

  @PostMapping("/api/feedback/activity-proposals")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public SubmissionRecordView createActivityProposal(@Valid @RequestBody FeedbackSubmissionRequest request) {
    return feedbackService.submit(FeedbackTicketType.ACTIVITY_PROPOSAL, request);
  }

  @GetMapping("/api/feedback/my-submissions")
  public List<SubmissionRecordView> listMySubmissions(
      @RequestParam(name = "type", required = false) FeedbackTicketType type
  ) {
    // listMine 内部已通过 SecurityUtils 获取当前用户ID
    return feedbackService.listMine(type);
  }

  @GetMapping("/api/admin/feedback")
  public List<SubmissionRecordView> listAdminFeedback() {
    return feedbackService.listAdminFeedback();
  }

  @PostMapping("/api/admin/activity-proposals/{id}/convert")
  public SubmissionRecordView convertProposal(@PathVariable("id") long id) {
    return feedbackService.convertProposal(id);
  }

  /**
   * 功能9：上传反馈图片附件。
   *
   * <p>端点：POST /api/feedback/images（multipart/form-data，字段名 file）</p>
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
  @PostMapping("/api/feedback/images")
  public FeedbackService.UploadedImageResult uploadImage(MultipartFile file) {
    Long userId = SecurityUtils.getCurrentUserId();
    return feedbackService.uploadImage(userId, file);
  }

  /**
   * 功能10：查询反馈提交详情。
   *
   * <p>端点：GET /api/feedback/my-submissions/{id}</p>
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
  @GetMapping("/api/feedback/my-submissions/{id}")
  public SubmissionDetailView getSubmissionDetail(@PathVariable("id") long id) {
    Long userId = SecurityUtils.getCurrentUserId();
    return feedbackService.getSubmissionDetail(userId, id);
  }
}
