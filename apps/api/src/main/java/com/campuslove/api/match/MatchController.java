package com.campuslove.api.match;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.dto.MatchDto;
import com.campuslove.api.monitor.MatchMetrics;
import com.campuslove.api.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Match", description = "匹配与社交关系接口：滑动操作、心动信号、访客、喜欢列表、破冰引导")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/matches")
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
  @Operation(summary = "获取匹配表单配置", description = "返回匹配意向、话题、时间窗口等表单选项配置，供前端动态渲染匹配表单。", operationId = "getMatchFormConfig")
  @ApiResponses({
          @ApiResponse(responseCode = "200", description = "配置获取成功",
                  content = @Content(schema = @Schema(implementation = MatchFormConfigView.class))),
          @ApiResponse(responseCode = "401", description = "未授权", content = @Content)
  })
  public MatchFormConfigView getFormConfig() {
    return matchService.getFormConfig();
  }

  @PostMapping
  @Operation(summary = "创建匹配请求", description = "用户提交匹配意向、话题与时间窗口，进入匹配队列。userId 从 JWT 上下文获取（忽略请求体 userId 字段以防越权）。", operationId = "createMatch")
  @ApiResponses({
          @ApiResponse(responseCode = "200", description = "匹配创建成功",
                  content = @Content(schema = @Schema(implementation = MatchResultView.class))),
          @ApiResponse(responseCode = "400", description = "请求参数校验失败", content = @Content),
          @ApiResponse(responseCode = "401", description = "未授权", content = @Content),
          @ApiResponse(responseCode = "409", description = "已存在进行中的匹配", content = @Content)
  })
  public MatchResultView createMatch(
          @Parameter(description = "匹配请求体（matchIntent/topicIds/timeWindow/durationMinutes）", required = true)
          @Valid @RequestBody MatchRequest request) {
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
  @Operation(summary = "快速匹配", description = "跳过表单填写，使用上次配置或默认值快速进入匹配队列。", operationId = "createQuickMatch")
  @ApiResponses({
          @ApiResponse(responseCode = "200", description = "快速匹配创建成功",
                  content = @Content(schema = @Schema(implementation = MatchResultView.class))),
          @ApiResponse(responseCode = "401", description = "未授权", content = @Content)
  })
  public MatchResultView createQuickMatch(
          @Parameter(description = "快速匹配请求体（仅 durationMinutes）", required = true)
          @Valid @RequestBody QuickMatchRequest request) {
    // 修复：从 JWT 认证上下文获取当前用户 ID，忽略请求体中的 userId 字段
    Long authenticatedUserId = SecurityUtils.getCurrentUserId();
    QuickMatchRequest securedRequest = new QuickMatchRequest(
        authenticatedUserId,
        request.durationMinutes()
    );
    return matchService.createQuickMatch(securedRequest);
  }

  @GetMapping("/{id}")
  @Operation(summary = "查询匹配详情", description = "根据 matchId 查询匹配结果详情，含 partner 信息与临时聊天会话 ID。", operationId = "getMatch")
  @ApiResponses({
          @ApiResponse(responseCode = "200", description = "匹配详情",
                  content = @Content(schema = @Schema(implementation = MatchResultView.class))),
          @ApiResponse(responseCode = "404", description = "匹配不存在", content = @Content)
  })
  public MatchResultView getMatch(
          @Parameter(description = "匹配 ID", required = true, example = "match-abc123")
          @PathVariable("id") String id) {
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
  @Operation(summary = "喜欢用户（右滑）", description = "对目标用户标记为喜欢，若双向喜欢则生成 HeartSignal（匹配成功）。支持幂等性。速率限制 60 桶容量/2 令牌每秒。", operationId = "likeUser")
  @ApiResponses({
          @ApiResponse(responseCode = "200", description = "操作成功，data 为 HeartSignalView（如双向喜欢则非空）",
                  content = @Content(schema = @Schema(implementation = ApiResponse.class))),
          @ApiResponse(responseCode = "400", description = "targetUserId 缺失或非法", content = @Content),
          @ApiResponse(responseCode = "429", description = "触发限流", content = @Content)
  })
  @RateLimit(capacity = 60, refillTokens = 2, key = "#request.remoteAddr")
  @Idempotent
  public ApiResponse<HeartSignalView> likeUser(
          @Parameter(description = "喜欢目标请求体（targetUserId）", required = true)
          @RequestBody LikeTargetRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    // 监控：记录滑动操作（like 方向），指标失败不影响主流程
    try {
      matchMetrics.recordSwipe("like");
    } catch (RuntimeException ignore) {
      // 监控逻辑失败忽略
    }
    HeartSignalView result = matchService.likeUser(userId, request.targetUserId());
    // 监控：互相喜欢（result != null 表示已生成 HeartSignal，即匹配成功）
    if (result != null) {
      try {
        matchMetrics.recordMatchSuccess();
      } catch (RuntimeException ignore) {
        // 监控逻辑失败忽略
      }
    }
    return ApiResponse.ok(result);
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
  @Operation(summary = "左滑跳过用户", description = "对目标用户标记为 pass（不喜欢），不会产生匹配。支持幂等性。", operationId = "passUser")
  @ApiResponses({
          @ApiResponse(responseCode = "200", description = "操作成功"),
          @ApiResponse(responseCode = "400", description = "passedUserId 缺失", content = @Content)
  })
  @Idempotent
  public ResponseEntity<Void> passUser(
          @Parameter(description = "被跳过的目标用户 ID", required = true, example = "12345")
          @RequestParam(name = "passedUserId") Long passedUserId) {
    Long userId = SecurityUtils.getCurrentUserId();
    matchService.passUser(userId, passedUserId);
    // 监控：记录左滑（dislike）操作
    try {
      matchMetrics.recordSwipe("dislike");
    } catch (RuntimeException ignore) {
      // 监控逻辑失败忽略
    }
    return ResponseEntity.ok().build();
  }

  /**
   * 反悔(rewind)操作，撤销最近一次 pass。
   * POST /api/matches/rewind
   */
  @PostMapping("/rewind")
  @Operation(summary = "反悔最近一次滑动", description = "撤销最近一次 pass 操作。每日限制 1 次，超限抛 DailyLimitExceededException。", operationId = "rewind")
  @ApiResponses({
          @ApiResponse(responseCode = "200", description = "反悔成功",
                  content = @Content(schema = @Schema(implementation = ApiResponse.class))),
          @ApiResponse(responseCode = "429", description = "DAILY_LIMIT_EXCEEDED：超出每日反悔次数限制", content = @Content)
  })
  @Idempotent
  public ApiResponse<RewindResultView> rewind() {
    Long userId = SecurityUtils.getCurrentUserId();
    RewindResultView result = matchService.rewind(userId);
    return ApiResponse.ok(result);
  }

  /**
   * 获取我喜欢的用户列表。
   * GET /api/matches/my-likes
   */
  @GetMapping("/my-likes")
  public ApiResponse<List<LikedUserView>> getMyLikes() {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(matchService.getMyLikes(userId));
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
