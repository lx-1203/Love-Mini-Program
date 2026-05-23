package com.campuslove.api.village;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
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
 */
@RestController
@RequestMapping("/api/posts")
public class VillageController {

  private final VillageService villageService;

  public VillageController(VillageService villageService) {
    this.villageService = villageService;
  }

  // ---------- 帖子 ----------

  /**
   * 获取帖子列表（支持分类、标签、排序、分页）。
   */
  @GetMapping
  public PostListResponse getPosts(
      @RequestParam(name = "category", required = false) String category,
      @RequestParam(name = "tag", required = false) String tag,
      @RequestParam(name = "sortBy", required = false, defaultValue = "latest") String sortBy,
      @RequestParam(name = "page", required = false, defaultValue = "1") int page,
      @RequestParam(name = "pageSize", required = false, defaultValue = "20") int pageSize) {
    return villageService.getPosts(category, tag, sortBy, page, pageSize);
  }

  /**
   * 发布新帖子。
   */
  @PostMapping
  public PostDetailView createPost(
      @RequestParam(name = "userId") Long userId,
      @Valid @RequestBody CreatePostRequest request) {
    return villageService.createPost(userId, request.content(), request.images(), request.tags(), request.category());
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
  public PostLikeResponse likePost(
      @PathVariable("id") Long id,
      @RequestParam(name = "userId") Long userId) {
    return villageService.likePost(userId, id);
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
      @RequestParam(name = "userId") Long userId,
      @Valid @RequestBody CreateCommentRequest request) {
    return villageService.commentPost(userId, id, request.content());
  }

  // ---------- 转发 ----------

  /**
   * 转发帖子。
   */
  @PostMapping("/{id}/share")
  public ShareView sharePost(
      @PathVariable("id") Long id,
      @RequestParam(name = "userId") Long userId,
      @Valid @RequestBody SharePostRequest request) {
    return villageService.sharePost(userId, id, request.comment());
  }
}

// ---------- 视图 / 请求模型 ----------

/**
 * 帖子列表响应。
 */
record PostListResponse(List<PostSummaryView> items, int total, int page, int pageSize) {
}

/**
 * 帖子摘要视图。
 */
record PostSummaryView(
    Long id,
    String title,
    String summary,
    PostAuthorView author,
    String category,
    List<String> tags,
    int likeCount,
    int commentCount,
    int shareCount,
    String createdAt,
    boolean isHot,
    boolean isAlumni
) {
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
 * 帖子作者视图。
 */
record PostAuthorView(
    Long userId,
    String nickname,
    String avatarUrl,
    String campusName
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