package com.campuslove.api.match;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.dto.MatchDto;
import com.campuslove.api.monitor.MatchMetrics;
import com.campuslove.api.ratelimit.RateLimit;
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
 *
 * <p>DTO 层接入：新增 GET /api/matches/dto 端点返回 {@link MatchDto} 列表，
 * 与既有返回 {@code MatchResultView}/{@code LikedUserView} 的端点并存，
 * 保持方法签名兼容。</p>
 *
 * <p><strong>注意：</strong>当前项目中尚不存在独立的 {@code Match} 实体
 * （匹配关系暂以 {@code HeartSignal} 等形式存储），
 * 故 {@code /dto} 端点暂返回空列表，待 Match 实体与对应聚合查询引入后再补全。
 * {@link com.campuslove.api.dto.DtoMapper#toMatchDto} 方法签名已在 DtoMapper 中预留注释。</p>
 */
@RestController
@RequestMapping("/api/matches")
public class MatchController {

  private final MatchService matchService;
  private final IcebreakerService icebreakerService;
  /**
   * 匹配业务监控指标。用于记录滑动操作、匹配成功、推荐耗时等。
   * 通过 Micrometer 暴露到 /actuator/prometheus 供 Prometheus 抓取。
   */
  private final MatchMetrics matchMetrics;

  public MatchController(MatchService matchService, IcebreakerService icebreakerService,
                         MatchMetrics matchMetrics) {
    this.matchService = matchService;
    this.icebreakerService = icebreakerService;
    this.matchMetrics = matchMetrics;
  }

  @GetMapping("/form-config")
  public MatchFormConfigView getFormConfig() {
    return matchService.getFormConfig();
  }

  @PostMapping
  public MatchResultView createMatch(@Valid @RequestBody MatchRequest request) {
    // 修复：从 JWT 认证上下文获取当前用户 ID，忽略请求体中的 userId 字段，
    // 防止用户伪造请求体越权为他人创建匹配。
    Long authenticatedUserId = SecurityUtils.getCurrentUserId();
    MatchRequest securedRequest = new MatchRequest(
        authenticatedUserId,
        request.matchIntent(),
        request.topicIds(),
        request.timeWindow(),
        request.durationMinutes()
    );
    return matchService.createMatch(securedRequest);
  }

  @PostMapping("/quick")
  public MatchResultView createQuickMatch(@Valid @RequestBody QuickMatchRequest request) {
    // 修复：从 JWT 认证上下文获取当前用户 ID，忽略请求体中的 userId 字段
    Long authenticatedUserId = SecurityUtils.getCurrentUserId();
    QuickMatchRequest securedRequest = new QuickMatchRequest(
        authenticatedUserId,
        request.durationMinutes()
    );
    return matchService.createQuickMatch(securedRequest);
  }

  @GetMapping("/{id}")
  public MatchResultView getMatch(@PathVariable("id") String id) {
    return matchService.getMatch(id);
  }

  // ---- Phase 2 新增：社交功能端点 ----

  /**
   * 喜欢用户（右滑 = swipeRight 等价操作）。
   * POST /api/matches/like
   *
   * <p>速率限制：桶容量 60，每秒补充 2 个令牌，按客户端 IP 限流，
   * 防止自动化脚本批量刷喜欢。</p>
   */
  @PostMapping("/like")
  @RateLimit(capacity = 60, refillTokens = 2, key = "#request.remoteAddr")
  public HeartSignalView likeUser(@RequestBody LikeTargetRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    // 监控：记录滑动操作（like 方向），指标失败不影响主流程
    try {
      matchMetrics.recordSwipe("like");
    } catch (Exception ignore) {
      // 监控逻辑失败忽略
    }
    HeartSignalView result = matchService.likeUser(userId, request.targetUserId());
    // 监控：互相喜欢（result != null 表示已生成 HeartSignal，即匹配成功）
    if (result != null) {
      try {
        matchMetrics.recordMatchSuccess();
      } catch (Exception ignore) {
        // 监控逻辑失败忽略
      }
    }
    return result;
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
    // 监控：记录左滑（dislike）操作
    try {
      matchMetrics.recordSwipe("dislike");
    } catch (Exception ignore) {
      // 监控逻辑失败忽略
    }
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

  // ---- DTO 层接入 ----

  /**
   * 获取当前用户的匹配 DTO 列表（DTO 层示例端点）。
   *
   * <p>与 {@link #getHeartSignals()} 等返回 {@code *View} 的端点并存，
   * 用于演示未来 Entity -&gt; DTO 的批量转换流程。</p>
   *
   * <p><strong>当前实现：</strong>项目尚不存在独立的 {@code Match} 实体，
   * 故本端点暂返回空列表。待 Match 实体引入后，将按以下流程补全：
   * <ol>
   *   <li>通过 MatchRepository 查询当前用户的所有匹配关系；</li>
   *   <li>批量加载 partner 用户实体与最近一条消息预览；</li>
   *   <li>经 {@link com.campuslove.api.dto.DtoMapper#toMatchDto} 转换为
   *       {@link MatchDto} 列表返回。</li>
   * </ol>
   * </p>
   *
   * @return MatchDto 列表（当前阶段恒为空）
   */
  @GetMapping("/dto")
  public ResponseEntity<List<MatchDto>> getMatchesDto() {
    // TODO: 待 Match 实体引入后，接入 MatchRepository 并调用 DtoMapper.toMatchDto
    return ResponseEntity.ok(List.of());
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
