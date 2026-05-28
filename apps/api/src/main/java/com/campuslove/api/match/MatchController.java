package com.campuslove.api.match;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 匹配控制器。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/matches")
public class MatchController {

  private final MatchService matchService;
  private final IcebreakerService icebreakerService;

  public MatchController(MatchService matchService, IcebreakerService icebreakerService) {
    this.matchService = matchService;
    this.icebreakerService = icebreakerService;
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
  public HeartSignalView likeUser(@RequestBody LikeTargetRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    return matchService.likeUser(userId, request.targetUserId());
  }

  /**
   * 取消喜欢。
   * POST /api/matches/cancel-like
   */
  @PostMapping("/cancel-like")
  public void cancelLike(@RequestBody LikeTargetRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    matchService.cancelLike(userId, request.targetUserId());
  }

  /**
   * 获取喜欢我的用户列表。
   * GET /api/matches/liked-me
   */
  @GetMapping("/liked-me")
  public List<LikedUserView> getLikedMe() {
    Long userId = SecurityUtils.getCurrentUserId();
    return matchService.getLikedMe(userId);
  }

  /**
   * 获取访客列表。
   * GET /api/matches/visitors
   */
  @GetMapping("/visitors")
  public List<VisitorView> getVisitors() {
    Long userId = SecurityUtils.getCurrentUserId();
    return matchService.getVisitors(userId);
  }

  /**
   * 记录访客。
   * POST /api/matches/visit
   */
  @PostMapping("/visit")
  public void recordVisit(@RequestBody VisitTargetRequest request) {
    Long visitorId = SecurityUtils.getCurrentUserId();
    matchService.recordVisit(visitorId, request.visitedUserId());
  }

  /**
   * 获取心动信号列表。
   * GET /api/matches/heart-signals
   */
  @GetMapping("/heart-signals")
  public List<HeartSignalView> getHeartSignals() {
    Long userId = SecurityUtils.getCurrentUserId();
    return matchService.getHeartSignals(userId);
  }

  /**
   * 接受心动信号。
   * POST /api/matches/heart-signals/{id}/accept
   */
  @PostMapping("/heart-signals/{id}/accept")
  public void acceptHeartSignal(@PathVariable("id") Long signalId) {
    Long userId = SecurityUtils.getCurrentUserId();
    matchService.acceptHeartSignal(signalId, userId);
  }

  /**
   * 拒绝心动信号。
   * POST /api/matches/heart-signals/{id}/decline
   */
  @PostMapping("/heart-signals/{id}/decline")
  public void declineHeartSignal(@PathVariable("id") Long signalId) {
    Long userId = SecurityUtils.getCurrentUserId();
    matchService.declineHeartSignal(signalId, userId);
  }

  // ---- Phase 2 新增：左滑/反悔/我喜欢的/访客已读 ----

  /**
   * 左滑(pass)用户。
   * POST /api/matches/pass
   */
  @PostMapping("/pass")
  public ResponseEntity<Void> passUser(
          @RequestParam(name = "passedUserId") Long passedUserId) {
    Long userId = SecurityUtils.getCurrentUserId();
    matchService.passUser(userId, passedUserId);
    return ResponseEntity.ok().build();
  }

  /**
   * 反悔(rewind)操作，撤销最近一次 pass。
   * POST /api/matches/rewind
   */
  @PostMapping("/rewind")
  public ResponseEntity<RewindResultView> rewind() {
    Long userId = SecurityUtils.getCurrentUserId();
    RewindResultView result = matchService.rewind(userId);
    if (result.success()) {
      return ResponseEntity.ok(result);
    }
    return ResponseEntity.badRequest().body(result);
  }

  /**
   * 获取我喜欢的用户列表。
   * GET /api/matches/my-likes
   */
  @GetMapping("/my-likes")
  public ResponseEntity<List<LikedUserView>> getMyLikes() {
    Long userId = SecurityUtils.getCurrentUserId();
    return ResponseEntity.ok(matchService.getMyLikes(userId));
  }

  /**
   * 标记访客记录为已读。
   * PUT /api/matches/visitors/{id}/read
   */
  @PutMapping("/visitors/{id}/read")
  public ResponseEntity<Void> markVisitorRead(@PathVariable("id") Long id) {
    matchService.markVisitorRead(id);
    return ResponseEntity.ok().build();
  }

  // ---- 破冰引导 ----

  /**
   * 获取匹配对的破冰话题推荐。
   * GET /api/matches/{matchId}/icebreakers
   *
   * @param matchId 匹配记录 ID（HeartSignal ID）
   * @return 破冰话题列表（最多 3 个）
   */
  @GetMapping("/{matchId}/icebreakers")
  public ResponseEntity<List<IcebreakerView>> getIcebreakers(@PathVariable("matchId") Long matchId) {
    try {
      List<IcebreakerView> icebreakers = icebreakerService.getIcebreakers(matchId);
      return ResponseEntity.ok(icebreakers);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
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
 * 喜欢目标用户请求体。
 * userId 由 SecurityUtils 自动获取，只需传入目标用户ID。
 */
record LikeTargetRequest(
    Long targetUserId
) {}

/**
 * 访问目标用户请求体。
 * visitorId 由 SecurityUtils 自动获取，只需传入被访问用户ID。
 */
record VisitTargetRequest(
    Long visitedUserId
) {}
