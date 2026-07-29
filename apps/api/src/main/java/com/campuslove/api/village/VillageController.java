package com.campuslove.api.village;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.dto.DtoMapper;
import com.campuslove.api.dto.PostDto;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.User;
import com.campuslove.api.monitor.VillageMetrics;
import com.campuslove.api.ratelimit.RateLimit;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
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
 *
 * <p>DTO 层接入：新增 GET /api/posts/dto 端点返回 {@link PostDto} 列表，
 * 通过 {@link DtoMapper} 将 Post 实体批量转换为 DTO，
 * 与既有返回 {@code PostListResponse} 的 {@link #getPosts} 端点并存，
 * 保持方法签名兼容。</p>
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
  private final PostRepository postRepository;
  private final UserRepository userRepository;

  public VillageController(VillageService villageService,
                           VillageMetrics villageMetrics,
                           PostRepository postRepository,
                           UserRepository userRepository) {
    this.villageService = villageService;
    this.villageMetrics = villageMetrics;
    this.postRepository = postRepository;
    this.userRepository = userRepository;
  }

  // ---------- 帖子 ----------

  /**
   * 获取帖子列表（支持分类、标签、排序、分页）。
   * 当 category=campus 时，从JWT认证上下文获取 userId 用于校园筛选。
   */
  @GetMapping
  public PostListResponse getPosts(
      @RequestParam(name = "category", required = false) String category,
      @RequestParam(name = "tag", required = false) String tag,
      @RequestParam(name = "sortBy", required = false, defaultValue = "latest") String sortBy,
      @RequestParam(name = "page", required = false, defaultValue = "1") @Min(1) int page,
      @RequestParam(name = "pageSize", required = false, defaultValue = "20") @Min(1) @Max(100) int pageSize) {
    // 校园分类需要从认证上下文获取 userId
    Long userId = null;
    if ("campus".equals(category)) {
      try {
        userId = SecurityUtils.getCurrentUserId();
      } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized e) {
        // 未认证时返回空列表
        return new PostListResponse(List.of(), 0, page, pageSize);
      }
    }
    return villageService.getPosts(category, tag, sortBy, page, pageSize, userId);
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
    PostDetailView view = villageService.createPost(userId, request.content(), request.images(), request.tags(), request.category());
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
   * 发表评论。
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
    CommentItemView view = villageService.commentPost(userId, id, request.content());
    // 监控：记录评论创建事件
    try {
      villageMetrics.recordCommentCreated();
    } catch (RuntimeException ignore) {
      // 监控逻辑失败忽略，不影响主流程
    }
    return ApiResponse.ok(view);
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

  // ---------- DTO 层接入 ----------

  /**
   * 获取帖子 DTO 列表（DTO 层示例端点）。
   *
   * <p>与 {@link #getPosts} 返回的 {@code PostListResponse} 并存，
   * 用于演示 Entity -&gt; DTO 的批量转换：
   * <ol>
   *   <li>通过 PostRepository 分页查询最新 active 状态的帖子；</li>
   *   <li>批量查询作者 User 实体（一次 findAllById 避免 N+1）；</li>
   *   <li>经 {@link DtoMapper#toPostDto} 逐条转换为 {@link PostDto}，
   *       并通过 {@link DtoMapper#toDtoList} 批量产出。</li>
   * </ol>
   * 计数（likeCount/commentCount）取自 Post 实体本身的累计字段，
   * 避免在本端点触发额外的聚合查询。</p>
   *
   * @param page     页码（从 1 开始）
   * @param pageSize 每页大小（1-100）
   * @return PostDto 列表
   */
  @GetMapping("/dto")
  public List<PostDto> getPostsDto(
      @RequestParam(name = "page", required = false, defaultValue = "1") @Min(1) int page,
      @RequestParam(name = "pageSize", required = false, defaultValue = "20") @Min(1) @Max(100) int pageSize) {
    Pageable pageable = PageRequest.of(page - 1, pageSize,
        Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<Post> postPage = postRepository.findByStatusOrderByCreatedAtDesc(
        Post.PostStatus.active, pageable);
    List<Post> posts = postPage.getContent();
    if (posts.isEmpty()) {
      return List.of();
    }
    // 批量加载作者，避免 N+1 查询
    List<Long> authorIds = posts.stream().map(Post::getAuthorId).distinct().toList();
    Map<Long, User> authorMap = new HashMap<>();
    if (!authorIds.isEmpty()) {
      List<User> authors = userRepository.findAllById(authorIds);
      for (User u : authors) {
        authorMap.put(u.getId(), u);
      }
    }
    return DtoMapper.toDtoList(posts, p -> DtoMapper.toPostDto(
        p,
        authorMap.get(p.getAuthorId()),
        p.getLikesCount() != null ? p.getLikesCount().longValue() : 0L,
        p.getCommentsCount() != null ? p.getCommentsCount().longValue() : 0L
    ));
  }
}

// ---------- 视图 / 请求模型 ----------
// 注意：public record 已迁移到独立文件，便于跨包引用（如 mock 包）。
// 下方仅保留 VillageController 内部使用的 package-private 视图。

/**
 * 同校动态流中的活动简要视图。
 */
record CampusActivityView(
    Long id,
    String title,
    String scheduleText,
    String location,
    int enrollmentCount,
    String status
) {}

/**
 * 同校动态流中的话题简要视图。
 */
record CampusTopicView(
    Long id,
    Long circleId,
    String circleName,
    String title,
    String authorName,
    int replyCount,
    String createdAt
) {}
