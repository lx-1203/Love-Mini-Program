package com.campuslove.api.village;

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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/posts")
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
      } catch (Exception e) {
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
  public PostDetailView createPost(
      @Valid @RequestBody CreatePostRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    PostDetailView view = villageService.createPost(userId, request.content(), request.images(), request.tags(), request.category());
    // 监控：记录帖子创建事件
    try {
      villageMetrics.recordPostCreated();
    } catch (Exception ignore) {
      // 监控逻辑失败忽略，不影响主流程
    }
    return view;
  }

  /**
   * 获取帖子详情。
   */
  @GetMapping("/{id}")
  public PostDetailView getPostDetail(@PathVariable("id") Long id) {
    return villageService.getPostDetail(id);
  }

  // ---------- 点赞 ----------

  /**
   * 点赞帖子。
   */
  @PostMapping("/{id}/like")
  public PostLikeResponse likePost(@PathVariable("id") Long id) {
    Long userId = SecurityUtils.getCurrentUserId();
    PostLikeResponse response = villageService.likePost(userId, id);
    // 监控：记录帖子点赞事件（仅在实际触发点赞时记录，取消点赞不记录）
    if (response != null && response.liked()) {
      try {
        villageMetrics.recordPostLiked(id);
      } catch (Exception ignore) {
        // 监控逻辑失败忽略，不影响主流程
      }
    }
    return response;
  }

  // ---------- 评论 ----------

  /**
   * 获取帖子评论列表。
   */
  @GetMapping("/{id}/comments")
  public CommentListResponse getComments(
      @PathVariable("id") Long id,
      @RequestParam(name = "page", required = false, defaultValue = "1") int page,
      @RequestParam(name = "pageSize", required = false, defaultValue = "20") int pageSize) {
    return villageService.getComments(id, page, pageSize);
  }

  /**
   * 发表评论。
   */
  @PostMapping("/{id}/comments")
  public CommentItemView createComment(
      @PathVariable("id") Long id,
      @Valid @RequestBody CreateCommentRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    CommentItemView view = villageService.commentPost(userId, id, request.content());
    // 监控：记录评论创建事件
    try {
      villageMetrics.recordCommentCreated();
    } catch (Exception ignore) {
      // 监控逻辑失败忽略，不影响主流程
    }
    return view;
  }

  // ---------- 转发 ----------

  /**
   * 转发帖子。
   */
  @PostMapping("/{id}/share")
  public ShareView sharePost(
      @PathVariable("id") Long id,
      @Valid @RequestBody SharePostRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    return villageService.sharePost(userId, id, request.comment());
  }

  // ---------- 同校动态流 ----------

  /**
   * 获取同校动态流。
   * 聚合同校用户最新帖子、即将开始的活动、兴趣圈最新话题。
   */
  @GetMapping("/campus-feed")
  public ResponseEntity<CampusFeedView> getCampusFeed(
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "size", defaultValue = "20") int size) {
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
      @PathVariable("id") Long postId) {
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

/**
 * 帖子列表响应。
 */
record PostListResponse(List<PostSummaryView> items, int total, int page, int pageSize) {
}

/**
 * 帖子详情视图。
 */
record PostDetailView(
    Long id,
    String title,
    String content,
    PostAuthorView author,
    String category,
    List<String> tags,
    List<String> images,
    int likeCount,
    int commentCount,
    int shareCount,
    String createdAt,
    String updatedAt,
    boolean isLiked,
    boolean isAuthor,
    boolean isAlumni
) {
}

/**
 * 发布帖子请求体。
 */
record CreatePostRequest(
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 5000) String content,
    @NotBlank String category,
    List<@Size(max = 20) String> tags,
    List<String> images
) {
}

/**
 * 点赞响应。
 */
record PostLikeResponse(boolean success, boolean liked, int likeCount) {
}

/**
 * 评论列表响应。
 */
record CommentListResponse(List<CommentItemView> items, int total, int page, int pageSize) {
}

/**
 * 评论项视图。
 */
record CommentItemView(
    Long id,
    Long postId,
    Long parentId,
    CommentAuthorView author,
    String content,
    int likeCount,
    String createdAt,
    boolean isAuthor,
    String replyTo
) {
}

/**
 * 评论作者视图。
 */
record CommentAuthorView(Long userId, String nickname, String avatarUrl) {
}

/**
 * 发表评论请求体。
 */
record CreateCommentRequest(
    @NotBlank @Size(max = 1000) String content,
    Long parentId
) {
}

/**
 * 转发帖子请求体。
 */
record SharePostRequest(
    @Size(max = 500) String comment
) {
}

/**
 * 转发响应视图。
 */
record ShareView(Long id, Long postId, int shareCount) {
}

/**
 * 帖子分类视图。
 */
record PostCategoryView(
    Long id,
    String name,
    String code,
    String icon,
    int sortOrder
) {}

/**
 * 同校动态流视图。
 *
 * @param campusName 校区名称
 * @param posts      同校最新帖子列表
 * @param activities 同校即将开始的活动列表
 * @param topics     同校兴趣圈最新话题列表
 */
record CampusFeedView(
    String campusName,
    List<PostSummaryView> posts,
    List<CampusActivityView> activities,
    List<CampusTopicView> topics
) {}

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

// ---- 相似作者推荐 ----

/**
 * 相似作者推荐响应。
 */
record SimilarAuthorsResponse(
    /** 推荐的相似作者列表 */
    List<SimilarAuthorView> authors
) {}

/**
 * 相似作者视图。
 * 包含作者基础信息、同校关系、共同兴趣及是否已关注等字段。
 */
record SimilarAuthorView(
    /** 用户 ID */
    Long userId,
    /** 昵称 */
    String nickname,
    /** 头像 URL */
    String avatarUrl,
    /** 校区名称 */
    String campusName,
    /** 个性签名/一句话介绍 */
    String headline,
    /** 是否同校 */
    boolean isAlumni,
    /** 共同的兴趣标签 */
    List<String> commonInterests,
    /** 当前用户是否已关注该推荐作者 */
    boolean isFollowed
) {}
