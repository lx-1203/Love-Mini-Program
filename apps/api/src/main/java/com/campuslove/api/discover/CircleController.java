package com.campuslove.api.discover;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 话题圈 / 兴趣圈控制器。
 * 提供圈子列表、加入/退出、话题浏览与发布、回复浏览与发布等接口。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/v1/circles")
@Validated
public class CircleController {

  private final CircleService circleService;

  public CircleController(CircleService circleService) {
    this.circleService = circleService;
  }

  // ---------- 圈子 ----------

  /**
   * 获取所有兴趣圈列表。
   * GET /api/circles
   */
  @GetMapping
  public ApiResponse<List<CircleView>> getCircles() {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.getCircles(userId));
  }

  /**
   * 加入圈子。
   * POST /api/circles/{id}/join
   */
  @PostMapping("/{id}/join")
  @Idempotent
  public ApiResponse<CircleMembershipView> joinCircle(@PathVariable("id") Long circleId) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.joinCircle(userId, circleId));
  }

  /**
   * 退出圈子。
   * DELETE /api/circles/{id}/join
   */
  @DeleteMapping("/{id}/join")
  @Idempotent
  public ApiResponse<CircleMembershipView> leaveCircle(@PathVariable("id") Long circleId) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.leaveCircle(userId, circleId));
  }

  // ---------- 话题 ----------

  /**
   * 获取指定圈子的话题列表。
   * GET /api/circles/{id}/topics
   */
  @GetMapping("/{id}/topics")
  public ApiResponse<Page<CircleTopicView>> getTopics(
      @PathVariable("id") Long circleId,
      @RequestParam(name = "page", required = false, defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") @Min(1) @Max(100) int size) {
    Pageable pageable = PageRequest.of(page, size);
    return ApiResponse.ok(circleService.getTopics(circleId, pageable));
  }

  /**
   * 在指定圈子发布新话题。
   * POST /api/circles/{id}/topics
   *
   * <p>速率限制：桶容量 20，每 2 秒补充 1 个令牌（refillTokens=0.5/s），
   * 按客户端 IP 限流，防止话题刷屏。</p>
   */
  @PostMapping("/{id}/topics")
  @RateLimit(capacity = 20, refillTokens = 0.5, key = "#request.remoteAddr")
  @Idempotent
  public ApiResponse<CircleTopicView> createTopic(
      @PathVariable("id") Long circleId,
      @Valid @RequestBody CreateTopicRequest request) {
    Long authorId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.createTopic(circleId, authorId, request.title(),
        request.content(), request.images()));
  }

  /**
   * 获取话题详情。
   * GET /api/circles/topics/{id}
   */
  @GetMapping("/topics/{id}")
  public ApiResponse<CircleTopicView> getTopicDetail(@PathVariable("id") Long topicId) {
    return ApiResponse.ok(circleService.getTopicDetail(topicId));
  }

  // ---------- 回复 ----------

  /**
   * 获取指定话题的回复列表。
   * GET /api/circles/topics/{id}/replies
   */
  @GetMapping("/topics/{id}/replies")
  public ApiResponse<Page<CircleReplyView>> getReplies(
      @PathVariable("id") Long topicId,
      @RequestParam(name = "page", required = false, defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") @Min(1) @Max(100) int size) {
    Pageable pageable = PageRequest.of(page, size);
    return ApiResponse.ok(circleService.getReplies(topicId, pageable));
  }

  /**
   * 对指定话题发表回复。
   * POST /api/circles/topics/{id}/replies
   *
   * <p>速率限制：桶容量 30，每秒补充 1 个令牌，按客户端 IP 限流，
   * 防止回复刷屏与垃圾内容。</p>
   */
  @PostMapping("/topics/{id}/replies")
  @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
  @Idempotent
  public ApiResponse<CircleReplyView> createReply(
      @PathVariable("id") Long topicId,
      @Valid @RequestBody CreateReplyRequest request) {
    Long authorId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.replyToTopic(topicId, authorId, request.content()));
  }

  // ---------- 精选话题 ----------

  /**
   * 获取所有圈子的精选话题（用于村口"兴趣"分类）。
   * GET /api/circles/featured
   */
  @GetMapping("/featured")
  public ApiResponse<Page<CircleTopicView>> getFeaturedTopics(
      @RequestParam(name = "page", required = false, defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") @Min(1) @Max(100) int size) {
    Pageable pageable = PageRequest.of(page, size);
    return ApiResponse.ok(circleService.getFeaturedTopics(pageable));
  }
}

// ---------- 视图 / 请求模型 ----------

/**
 * 兴趣圈列表项视图。
 */
record CircleView(
    Long id,
    String name,
    String icon,
    String description,
    int memberCount,
    boolean isJoined,
    /** 话题数量 */
    int topicCount
) {
}

/**
 * 圈子加入/退出结果视图。
 */
record CircleMembershipView(
    Long circleId,
    boolean joined,
    int memberCount
) {
}

/**
 * 圈子话题视图。
 */
record CircleTopicView(
    Long id,
    Long circleId,
    String circleName,
    Long authorId,
    String authorName,
    String title,
    String contentPreview,
    List<String> images,
    int replyCount,
    boolean isPinned,
    LocalDateTime createdAt
) {
}

/**
 * 圈子回复视图。
 */
record CircleReplyView(
    Long id,
    Long topicId,
    Long authorId,
    String authorName,
    String content,
    LocalDateTime createdAt
) {
}

/**
 * 发布话题请求体。
 * authorId 由 SecurityUtils 自动获取，不再从请求体传入。
 */
record CreateTopicRequest(
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 5000) String content,
    List<String> images
) {
}

/**
 * 发表回复请求体。
 * authorId 由 SecurityUtils 自动获取，不再从请求体传入。
 */
record CreateReplyRequest(
    @NotBlank @Size(max = 1000) String content
) {
}
