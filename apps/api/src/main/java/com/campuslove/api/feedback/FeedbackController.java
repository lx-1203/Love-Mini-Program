package com.campuslove.api.feedback;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 反馈控制器。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
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
}
