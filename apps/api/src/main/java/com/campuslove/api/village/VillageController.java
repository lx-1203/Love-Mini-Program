package com.campuslove.api.village;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.monitor.VillageMetrics;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.ResponseEntity;
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
 * 村口帖子与转发控制器。
 * 提供帖子列表、详情、发布、点赞、评论以及转发等接口。
 * 写操作的用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/v1/posts")
@Validated
public class VillageController {

  private final VillageService villageService;
  /**
   * 村口业务监控指标。用于记录帖子创建/点赞/评论、当前帖子总数等。
   * 通过 Micrometer 暴露到 /actuator/prometheus 供 Prometheus 抓取。
   */
  private final VillageMetrics villageMetrics;

  public VillageController(VillageService villageService,
                           VillageMetrics villageMetrics) {
    this.villageService = villageService;
    this.villageMetrics = villageMetrics;
  }

  // ---------- 帖子 ----------

  /**
   * 获取帖子列表（支持分类、标签、排序、分页）。
   * 当 category=campus 时，从JWT认证上下文获取 userId 用于校园筛选。
   * 当 authorId 非空时，仅返回该作者发布的帖子（"我的动态"场景）。
   */
  @GetMapping
  public PostListResponse getPosts(
      @RequestParam(name = "category", required = false) String category,
      @RequestParam(name = "tag", required = false) String tag,
      @RequestParam(name = "sortBy", required = false, defaultValue = "latest") String sortBy,
      @RequestParam(name = "authorId", required = false) Long authorId,
      @RequestParam(name = "page", required = false, defaultValue = "1") @Min(1) int page,
      @RequestParam(name = "pageSize", required = false, defaultValue = "20") @Min(1) @Max(100) int pageSize,
      // 2026-08-07：同城 / 发现分类参数（圈子页三 Tab）
      @RequestParam(name = "city", required = false) String city,
      @RequestParam(name = "discoverSub", required = false) String discoverSub) {
    // 走查补齐：按作者过滤（个人主页"我的动态"），优先于分类/标签筛选
    if (authorId != null) {
      return villageService.getPostsByAuthor(authorId, page, pageSize);
    }
    // 校园分类 / 关注分类需要从认证上下文获取 userId
    // FIN-00064 修复：改用 SecurityUtils.isAuthenticated() 判断认证状态，
    // 原实现 catch HttpClientErrorException.Unauthorized（HTTP 异常类型滥用），
    // 未认证时 getCurrentUserId 抛出的 401 异常会被 GlobalExceptionHandler 捕获，
    // 与「返回空列表」的意图耦合在异常流上。
    // 2026-08-07 修复：following（关注 Tab）同样需要 userId 过滤关注作者的帖子。
    // R4-00339：discover（发现 Tab）的 alumni 子标签需要 userId 计算同校过滤。
    Long userId = null;
    if ("campus".equals(category) || "following".equals(category) || "samecity".equals(category)
            || "discover".equals(category)) {
      if (SecurityUtils.isAuthenticated()) {
        userId = SecurityUtils.getCurrentUserId();
      } else if ("campus".equals(category) || "following".equals(category) || "samecity".equals(category)) {
        // 未认证时校园/关注/同城返回空列表（发现 Tab 未认证仍可浏览 all 流）
        return new PostListResponse(List.of(), 0, page, pageSize);
      }
    }
    return villageService.getPosts(category, tag, sortBy, page, pageSize, userId, city, discoverSub);
  }

  /**
   * 发布新帖子。
   *
   * <p>速率限制：桶容量 20，每 2 秒补充 1 个令牌（refillTokens=0.5/s），
   * 按客户端 IP 限流，防止垃圾帖子批量发布。</p>
   */
  @PostMapping
  @RateLimit(capacity = 20, refillTokens = 0.5, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<PostDetailView> createPost(
      @Valid @RequestBody CreatePostRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    // 2026-08-09 帖子关联活动：透传可选 activityId（无效值服务层宽松置 null）
    PostDetailView view = villageService.createPost(userId, request.title(), request.content(),
        request.images(), request.tags(), request.category(), request.activityId());
    // 监控：记录帖子创建事件
    try {
      villageMetrics.recordPostCreated();
    } catch (RuntimeException ignore) {
      // 监控逻辑失败忽略，不影响主流程
    }
    return ApiResponse.ok(view);
  }

  /**
   * 获取帖子详情。
   */
  @GetMapping("/{id}")
  public ApiResponse<PostDetailView> getPostDetail(@PathVariable("id") @Positive Long id) {
    return ApiResponse.ok(villageService.getPostDetail(id));
  }

  // ---------- 收藏 ----------

  /**
   * 收藏/取消收藏帖子（2026-08-08 论坛互动真实化，幂等 toggle）。
   *
   * <p>速率限制：桶容量 60，每秒补充 2 个令牌，按客户端 IP 限流，
   * 与点赞端点同口径，防止自动化脚本批量刷收藏。</p>
   */
  @PostMapping("/{id}/favorite")
  @RateLimit(capacity = 60, refillTokens = 2, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<FavoriteResponse> toggleFavorite(@PathVariable("id") @Positive Long id) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(villageService.toggleFavorite(userId, id));
  }

  // ---------- 点赞 ----------

  /**
   * 点赞帖子。
   *
   * <p>速率限制：桶容量 60，每秒补充 2 个令牌，按客户端 IP 限流，
   * 防止自动化脚本批量刷点赞。</p>
   */
  @PostMapping("/{id}/like")
  @RateLimit(capacity = 60, refillTokens = 2, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<PostLikeResponse> likePost(@PathVariable("id") @Positive Long id) {
    Long userId = SecurityUtils.getCurrentUserId();
    PostLikeResponse response = villageService.likePost(userId, id);
    // 监控：记录帖子点赞事件（仅在实际触发点赞时记录，取消点赞不记录）
    if (response != null && response.liked()) {
      try {
        villageMetrics.recordPostLiked(id);
      } catch (RuntimeException ignore) {
        // 监控逻辑失败忽略，不影响主流程
      }
    }
    return ApiResponse.ok(response);
  }

  // ---------- 评论 ----------

  /**
   * 获取帖子评论列表。
   */
  @GetMapping("/{id}/comments")
  public CommentListResponse getComments(
      @PathVariable("id") @Positive Long id,
      @RequestParam(name = "page", required = false, defaultValue = "1") @Min(1) int page,
      @RequestParam(name = "pageSize", required = false, defaultValue = "20") @Min(1) @Max(100) int pageSize) {
    return villageService.getComments(id, page, pageSize);
  }

  /**
   * 发表评论（P1-02 / A-12 楼中楼：请求体支持 parentId，非空即为楼中楼回复）。
   *
   * <p>速率限制：桶容量 30，每秒补充 1 个令牌，按客户端 IP 限流，
   * 防止评论刷屏与垃圾内容。</p>
   */
  @PostMapping("/{id}/comments")
  @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<CommentItemView> createComment(
      @PathVariable("id") @Positive Long id,
      @Valid @RequestBody CreateCommentRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    CommentItemView view = villageService.commentPost(userId, id, request.content(), request.parentId());
    // 监控：记录评论创建事件
    try {
      villageMetrics.recordCommentCreated();
    } catch (RuntimeException ignore) {
      // 监控逻辑失败忽略，不影响主流程
    }
    return ApiResponse.ok(view);
  }

  /**
   * 点赞/取消点赞评论（M-14，幂等切换）。
   *
   * <p>实现复用帖子点赞模式：已点赞 → 取消点赞；未点赞 → 新增点赞并返回最新点赞数。
   * 幂等：同一用户对同一评论仅一条点赞记录（comment_likes 表 uk_comment_likes_user_comment
   * 唯一约束兜底）。</p>
   *
   * <p>速率限制：桶容量 60，每秒补充 2 个令牌，按客户端 IP 限流，
   * 防止自动化脚本批量刷评论点赞。</p>
   */
  @PostMapping("/comments/{commentId}/like")
  @RateLimit(capacity = 60, refillTokens = 2, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<PostLikeResponse> likeComment(@PathVariable("commentId") @Positive Long commentId) {
    Long userId = SecurityUtils.getCurrentUserId();
    PostLikeResponse response = villageService.likeComment(userId, commentId);
    return ApiResponse.ok(response);
  }

  // ---------- 转发 ----------

  /**
   * 转发帖子。
   *
   * <p>速率限制：桶容量 30，每秒补充 1 个令牌，按客户端 IP 限流，
   * 防止刷转发与垃圾引流。</p>
   */
  @PostMapping("/{id}/share")
  @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
  @Idempotent
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<ShareView> sharePost(
      @PathVariable("id") @Positive Long id,
      @Valid @RequestBody SharePostRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(villageService.sharePost(userId, id, request.comment()));
  }

  // ---------- 同校动态流 ----------

  /**
   * 获取同校动态流。
   * 聚合同校用户最新帖子、即将开始的活动、兴趣圈最新话题。
   */
  @GetMapping("/campus-feed")
  public ResponseEntity<CampusFeedView> getCampusFeed(
      @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
    Long userId = SecurityUtils.getCurrentUserId();
    try {
      CampusFeedView feed = villageService.getCampusFeed(userId, page, size);
      return ResponseEntity.ok(feed);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
  }

  // ---------- 相似作者推荐 ----------

  /**
   * 获取与帖子作者相似的推荐用户。
   * 基于兴趣标签重叠度和同校关系推荐 1-2 位最相似的用户，
   * 排除已关注的用户和当前用户自身。
   *
   * @param postId 帖子 ID
   * @return 相似作者推荐响应（1-2 位用户）
   */
  @GetMapping("/{id}/similar-authors")
  public ResponseEntity<SimilarAuthorsResponse> getSimilarAuthors(
      @PathVariable("id") @Positive Long postId) {
    Long userId = SecurityUtils.getCurrentUserId();
    try {
      SimilarAuthorsResponse response = villageService.getSimilarAuthors(postId, userId);
      return ResponseEntity.ok(response);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    }
  }

  // ---------- 浏览记录 ----------

  /**
   * 分页查询当前用户的帖子浏览历史（2026-08-08 论坛互动真实化）。
   *
   * <p>路由说明：/history 为字面量路径，优先于 /{id} 匹配（与 /campus-feed 同模式）。</p>
   */
  @GetMapping("/history")
  @PreAuthorize("hasRole('USER')")
  public PostHistoryResponse getPostHistory(
      @RequestParam(name = "page", required = false, defaultValue = "1") @Min(1) int page,
      @RequestParam(name = "pageSize", required = false, defaultValue = "20") @Min(1) @Max(100) int pageSize) {
    Long userId = SecurityUtils.getCurrentUserId();
    return villageService.getPostHistory(userId, page, pageSize);
  }

  /**
   * 清空当前用户的帖子浏览历史（2026-08-08 论坛互动真实化）。
   */
  @DeleteMapping("/history")
  @PreAuthorize("hasRole('USER')")
  public ApiResponse<Void> clearPostHistory() {
    Long userId = SecurityUtils.getCurrentUserId();
    villageService.clearPostHistory(userId);
    return ApiResponse.ok(null);
  }

  // ---------- DTO 层接入 ----------（infra R2-00218: 废弃端点 GET /posts/dto 已删除，与 getPosts 功能重复）
}

// ---------- 视图 / 请求模型 ----------
// 注意：public record 已迁移到独立文件，便于跨包引用（如 mock 包）。
// 下方仅保留 VillageController 内部使用的 package-private 视图。
