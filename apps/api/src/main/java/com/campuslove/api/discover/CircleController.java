package com.campuslove.api.discover;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
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
   * GET /api/circles?category=study
   *
   * <p>2026-08-10 B4：新增可选 category 参数——非空时按分类服务端过滤
   * （study/sports/music/movie/travel/game/food/reading），
   * 未分类（category=null）的圈子仅在未携带参数时展示。</p>
   */
  @GetMapping
  public ApiResponse<List<CircleView>> getCircles(
      @RequestParam(name = "category", required = false) String category) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.getCircles(userId, category));
  }

  /**
   * 加入圈子。
   * POST /api/circles/{id}/join
   */
  @PostMapping("/{id}/join")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<CircleMembershipView> joinCircle(@PathVariable("id") @Positive Long circleId) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.joinCircle(userId, circleId));
  }

  /**
   * 退出圈子。
   * DELETE /api/circles/{id}/join
   */
  @DeleteMapping("/{id}/join")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<CircleMembershipView> leaveCircle(@PathVariable("id") @Positive Long circleId) {
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
      @PathVariable("id") @Positive Long circleId,
      @RequestParam(name = "page", required = false, defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") @Min(1) @Max(100) int size) {
    Pageable pageable = PageRequest.of(page, size);
    return ApiResponse.ok(circleService.getTopics(circleId, SecurityUtils.getCurrentUserId(), pageable));
  }

  /**
   * 获取圈子 meta（标签 + 置顶公告）。
   * GET /api/v1/circles/{id}/meta
   */
  @GetMapping("/{id}/meta")
  public ApiResponse<CircleMetaView> getCircleMeta(@PathVariable("id") @Positive Long circleId) {
    return ApiResponse.ok(circleService.getCircleMeta(circleId));
  }

  /**
   * 获取圈子公告（已发布，置顶优先）。
   * GET /api/v1/circles/{id}/announcements?limit=5
   */
  @GetMapping("/{id}/announcements")
  public ApiResponse<List<CircleAnnouncementView>> getAnnouncements(
      @PathVariable("id") @Positive Long circleId,
      @RequestParam(name = "limit", required = false, defaultValue = "5")
      @Min(1) @Max(20) int limit) {
    return ApiResponse.ok(circleService.getAnnouncements(circleId, limit));
  }

  /**
   * 获取可 @ 的同圈成员（话题/回复提及选择器）。
   * GET /api/v1/circles/{id}/mention-candidates?keyword=&limit=50
   */
  @GetMapping("/{id}/mention-candidates")
  public ApiResponse<List<CircleMentionCandidateView>> getMentionCandidates(
      @PathVariable("id") @Positive Long circleId,
      @RequestParam(name = "keyword", required = false) String keyword,
      @RequestParam(name = "limit", required = false, defaultValue = "50")
      @Min(1) @Max(100) int limit) {
    return ApiResponse.ok(circleService.getMentionCandidates(
        circleId, SecurityUtils.getCurrentUserId(), keyword, limit));
  }

  /**
   * 点赞话题。
   * POST /api/v1/circles/topics/{id}/like
   */
  @PostMapping("/topics/{id}/like")
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<TopicLikeView> likeTopic(@PathVariable("id") @Positive Long topicId) {
    return ApiResponse.ok(circleService.likeTopic(topicId, SecurityUtils.getCurrentUserId()));
  }

  /**
   * 取消点赞。
   * DELETE /api/v1/circles/topics/{id}/like
   */
  @DeleteMapping("/topics/{id}/like")
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<TopicLikeView> unlikeTopic(@PathVariable("id") @Positive Long topicId) {
    return ApiResponse.ok(circleService.unlikeTopic(topicId, SecurityUtils.getCurrentUserId()));
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
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<CircleTopicView> createTopic(
      @PathVariable("id") @Positive Long circleId,
      @Valid @RequestBody CreateTopicRequest request) {
    Long authorId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.createTopic(circleId, authorId, request.title(),
        request.content(), request.images(), request.mentionedUserIds()));
  }

  /**
   * 获取话题详情。
   * GET /api/circles/topics/{id}
   */
  @GetMapping("/topics/{id}")
  public ApiResponse<CircleTopicView> getTopicDetail(@PathVariable("id") @Positive Long topicId) {
    return ApiResponse.ok(circleService.getTopicDetail(topicId, SecurityUtils.getCurrentUserId()));
  }

  // ---------- 回复 ----------

  /**
   * 获取指定话题的回复列表。
   * GET /api/circles/topics/{id}/replies
   */
  @GetMapping("/topics/{id}/replies")
  public ApiResponse<Page<CircleReplyView>> getReplies(
      @PathVariable("id") @Positive Long topicId,
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
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<CircleReplyView> createReply(
      @PathVariable("id") @Positive Long topicId,
      @Valid @RequestBody CreateReplyRequest request) {
    Long authorId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(circleService.replyToTopic(topicId, authorId, request.content(),
        request.mentionedUserIds()));
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
    return ApiResponse.ok(circleService.getFeaturedTopics(SecurityUtils.getCurrentUserId(), pageable));
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
    int topicCount,
    /** 圈子分类（study/sports/music/movie/travel/game/food/reading，null=未分类，2026-08-10 B4） */
    String category,
    /** 已加入好友数（前端展示"等X位朋友已加入"；暂无独立统计，按成员数推算，2026-08-21） */
    int friendJoinedCount
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
    /** 作者头像（users.avatar_url 原值，客户端 resolveMediaUrl 解析；2026-09-12 MP-R1-CIRCLE-001） */
    String authorAvatarUrl,
    String title,
    String contentPreview,
    List<String> images,
    int replyCount,
    boolean isPinned,
    LocalDateTime createdAt,
    /** 话题点赞数（2026-10-28） */
    int likeCount,
    /** 当前查看者是否已点赞 */
    boolean likedByMe
) {
    /** 兼容旧构造（无点赞状态） */
    CircleTopicView(
            Long id,
            Long circleId,
            String circleName,
            Long authorId,
            String authorName,
            String authorAvatarUrl,
            String title,
            String contentPreview,
            List<String> images,
            int replyCount,
            boolean isPinned,
            LocalDateTime createdAt) {
        this(id, circleId, circleName, authorId, authorName, authorAvatarUrl,
                title, contentPreview, images, replyCount, isPinned, createdAt, 0, false);
    }
}

/** 圈子 meta：标签 + 置顶公告（兼容旧字段）+ 公告列表。 */
record CircleMetaView(Long circleId, List<String> tags, String announcement,
                      List<CircleAnnouncementView> announcements) {
    /** 兼容旧调用（无公告列表）。 */
    CircleMetaView(Long circleId, List<String> tags, String announcement) {
        this(circleId, tags, announcement, List.of());
    }
}

/** 圈子公告视图（客户端仅见 published）。 */
record CircleAnnouncementView(
    Long id,
    String title,
    String content,
    boolean isPinned,
    LocalDateTime publishedAt
) {
}

/** 可 @ 的圈成员（提及选择器）。 */
record CircleMentionCandidateView(
    Long userId,
    String nickname,
    String avatarUrl
) {
}

/** 话题点赞结果。 */
record TopicLikeView(Long topicId, boolean liked, int likeCount) {
}

/**
 * 圈子回复视图。
 */
record CircleReplyView(
    Long id,
    Long topicId,
    Long authorId,
    String authorName,
    String authorAvatarUrl,
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
    @Size(max = 9) List<String> images,
    /** 2026-10-28：@提及的同圈成员（最多 10 人） */
    @Size(max = 10) List<Long> mentionedUserIds
) {
}

/**
 * 发表回复请求体。
 * authorId 由 SecurityUtils 自动获取，不再从请求体传入。
 */
record CreateReplyRequest(
    @NotBlank @Size(max = 1000) String content,
    /** 2026-10-28：@提及的同圈成员（最多 10 人） */
    @Size(max = 10) List<Long> mentionedUserIds
) {
}
