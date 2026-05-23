package com.campuslove.api.match;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

  private final MatchService matchService;

  public MatchController(MatchService matchService) {
    this.matchService = matchService;
  }

  @GetMapping("/form-config")
  public MatchFormConfigView getFormConfig() {
    return matchService.getFormConfig();
  }

  @PostMapping
  public MatchResultView createMatch(@Valid @RequestBody MatchRequest request) {
    return matchService.createMatch(request);
  }

  @PostMapping("/quick")
  public MatchResultView createQuickMatch(@Valid @RequestBody QuickMatchRequest request) {
    return matchService.createQuickMatch(request);
  }

  @GetMapping("/{id}")
  public MatchResultView getMatch(@PathVariable("id") String id) {
    return matchService.getMatch(id);
  }

  // ---- Phase 2 新增：社交功能端点 ----

  /**
   * 喜欢用户。
   * POST /api/matches/like
   */
  @PostMapping("/like")
  public HeartSignalView likeUser(@RequestBody LikeUserRequest request) {
    return matchService.likeUser(request.userId(), request.targetUserId());
  }

  /**
   * 取消喜欢。
   * POST /api/matches/cancel-like
   */
  @PostMapping("/cancel-like")
  public void cancelLike(@RequestBody LikeUserRequest request) {
    matchService.cancelLike(request.userId(), request.targetUserId());
  }

  /**
   * 获取喜欢我的用户列表。
   * GET /api/matches/liked-me
   */
  @GetMapping("/liked-me")
  public List<LikedUserView> getLikedMe(@RequestParam(name = "userId") Long userId) {
    return matchService.getLikedMe(userId);
  }

  /**
   * 获取访客列表。
   * GET /api/matches/visitors
   */
  @GetMapping("/visitors")
  public List<VisitorView> getVisitors(@RequestParam(name = "userId") Long userId) {
    return matchService.getVisitors(userId);
  }

  /**
   * 记录访客。
   * POST /api/matches/visit
   */
  @PostMapping("/visit")
  public void recordVisit(@RequestBody VisitRequest request) {
    matchService.recordVisit(request.visitorId(), request.visitedUserId());
  }

  /**
   * 获取心动信号列表。
   * GET /api/matches/heart-signals
   */
  @GetMapping("/heart-signals")
  public List<HeartSignalView> getHeartSignals(@RequestParam(name = "userId") Long userId) {
    return matchService.getHeartSignals(userId);
  }

  /**
   * 接受心动信号。
   * POST /api/matches/heart-signals/{id}/accept
   */
  @PostMapping("/heart-signals/{id}/accept")
  public void acceptHeartSignal(
          @PathVariable("id") Long signalId,
          @RequestParam(name = "userId") Long userId) {
    matchService.acceptHeartSignal(signalId, userId);
  }

  /**
   * 拒绝心动信号。
   * POST /api/matches/heart-signals/{id}/decline
   */
  @PostMapping("/heart-signals/{id}/decline")
  public void declineHeartSignal(
          @PathVariable("id") Long signalId,
          @RequestParam(name = "userId") Long userId) {
    matchService.declineHeartSignal(signalId, userId);
  }
}

record MatchFormConfigView(List<MatchFormSectionView> sections) {
}

record MatchFormSectionView(
    String id,
    String title,
    List<MatchFormFieldView> fields
) {
}

record MatchFormFieldView(
    String id,
    String kind,
    String label,
    List<MatchOptionView> options,
    Integer min,
    Integer max
) {
}

record MatchOptionView(String id, String label) {
}

record MatchRequest(
    Long userId,
    @NotBlank String matchIntent,
    List<String> topicIds,
    @NotBlank String timeWindow,
    Integer durationMinutes
) {
}

record QuickMatchRequest(Long userId, Integer durationMinutes) {
}

record MatchResultView(
    String id,
    String queueStatus,
    String topicLabel,
    String partnerHeadline,
    Integer countdownMinutes,
    String recommendedPrompt,
    String tempChatSessionId
) {
}

/**
 * 喜欢用户请求体。
 */
record LikeUserRequest(
    Long userId,
    Long targetUserId
) {}

/**
 * 访客记录请求体。
 */
record VisitRequest(
    Long visitorId,
    Long visitedUserId
) {}
