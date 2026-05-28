package com.campuslove.api.village;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 村口帖子与转发服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 */
@Profile("mock")
@Service
public class MockVillageService implements VillageService {

  private static final List<String> CATEGORIES = List.of("dating", "study", "life", "activity", "help");

  private final AtomicLong postIdGen = new AtomicLong(1000);
  private final AtomicLong shareIdGen = new AtomicLong(100);
  private final AtomicLong commentIdGen = new AtomicLong(5000);

  private final List<PostData> posts = new ArrayList<>();
  private final Map<Long, List<ShareData>> sharesByPost = new LinkedHashMap<>();
  private final Map<Long, List<CommentData>> commentsByPost = new LinkedHashMap<>();

  public MockVillageService() {
    initMockPosts();
  }

  @Override
  public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize) {
    return getPosts(category, tag, sortBy, page, pageSize, null);
  }

  @Override
  public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId) {
    List<PostData> filtered = posts.stream()
        .filter(p -> category == null || "all".equals(category) || p.category.equals(category))
        .filter(p -> tag == null || (p.tags != null && p.tags.contains(tag)))
        .toList();

    // 校园分类：按 campus 进行筛选
    if ("campus".equals(category)) {
      String mockCampusName = "南校区";
      filtered = filtered.stream()
          .filter(p -> mockCampusName.equals(p.authorCampus))
          .toList();
    }

    List<PostData> sorted = switch (sortBy == null ? "latest" : sortBy) {
      case "hottest" -> filtered.stream()
          .sorted((a, b) -> Integer.compare(b.likesCount, a.likesCount))
          .toList();
      case "recommended" -> filtered;
      default -> filtered;
    };

    int from = (page - 1) * pageSize;
    int to = Math.min(from + pageSize, sorted.size());
    List<PostData> pageItems = from < sorted.size() ? sorted.subList(from, to) : List.of();

    List<PostSummaryView> items = pageItems.stream()
        .map(p -> new PostSummaryView(
            p.id,
            p.title,
            truncate(p.content, 120),
            new PostAuthorView(p.authorId, p.authorName, p.authorAvatar, p.authorCampus),
            p.category,
            p.tags == null ? List.of() : p.tags,
            p.likesCount,
            p.commentsCount,
            p.shareCount,
            p.createdAt.toString(),
            p.likesCount >= 50,
            false
        ))
        .toList();

    return new PostListResponse(items, sorted.size(), page, pageSize);
  }

  @Override
  public PostDetailView getPostDetail(Long id) {
    PostData post = findPost(id);
    List<CommentData> comments = commentsByPost.getOrDefault(id, List.of());
    return new PostDetailView(
        post.id,
        post.title,
        post.content,
        new PostAuthorView(post.authorId, post.authorName, post.authorAvatar, post.authorCampus),
        post.category,
        post.tags == null ? List.of() : post.tags,
        post.images == null ? List.of() : post.images,
        post.likesCount,
        comments.size(),
        post.shareCount,
        post.createdAt.toString(),
        post.updatedAt.toString(),
        false,
        post.authorId == 1001L,
        false
    );
  }

  @Override
  public PostDetailView createPost(Long userId, @Valid CreatePostRequest request) {
    long id = postIdGen.incrementAndGet();
    PostData post = new PostData(
        id, request.title(), request.content(), request.images(), request.tags(),
        request.category(), 0, 0, 0, "active", userId, "星野", null, "南校区",
        LocalDateTime.now(), LocalDateTime.now()
    );
    posts.add(0, post);
    return getPostDetail(id);
  }

  @Override
  public PostLikeResponse likePost(Long id) {
    findPost(id);
    return new PostLikeResponse(true, true, 1);
  }

  @Override
  public CommentListResponse getComments(Long postId, int page, int pageSize) {
    findPost(postId);
    List<CommentData> all = commentsByPost.getOrDefault(postId, List.of());
    int from = (page - 1) * pageSize;
    int to = Math.min(from + pageSize, all.size());
    List<CommentData> pageItems = from < all.size() ? all.subList(from, to) : List.of();

    List<CommentItemView> items = pageItems.stream()
        .map(c -> new CommentItemView(
            c.id, c.postId, c.parentId,
            new CommentAuthorView(c.authorId, c.authorName, null),
            c.content, 0, c.createdAt.toString(), c.authorId == 1001L, c.replyTo
        ))
        .toList();
    return new CommentListResponse(items, all.size(), page, pageSize);
  }

  @Override
  public CommentItemView createComment(Long userId, Long postId, @Valid CreateCommentRequest request) {
    findPost(postId);
    long id = commentIdGen.incrementAndGet();
    CommentData comment = new CommentData(
        id, postId, request.parentId(), request.content(), userId, "星野", null, LocalDateTime.now(), null
    );
    commentsByPost.computeIfAbsent(postId, k -> new ArrayList<>()).add(0, comment);
    return new CommentItemView(
        comment.id, comment.postId, comment.parentId,
        new CommentAuthorView(comment.authorId, comment.authorName, null),
        comment.content, 0, comment.createdAt.toString(), true, comment.replyTo
    );
  }

  @Override
  public ShareView sharePost(Long userId, Long postId, @Valid SharePostRequest request) {
    PostData post = findPost(postId);
    long shareId = shareIdGen.incrementAndGet();
    int newShareCount = post.shareCount + 1;

    post.shareCount = newShareCount;

    ShareData share = new ShareData(shareId, postId, userId, request.comment(),
        userId, "星野", LocalDateTime.now());
    sharesByPost.computeIfAbsent(postId, k -> new ArrayList<>()).add(share);

    return new ShareView(shareId, postId, newShareCount);
  }

  // ---- Phase 2 新增方法 Mock 实现 ----

  @Override
  public PostListResponse getPosts(String tab, String category, Long userId, Pageable pageable) {
    // Mock 实现：委托给原有方法
    return getPosts(category, null, "latest", pageable.getPageNumber() + 1, pageable.getPageSize());
  }

  @Override
  public PostDetailView getPost(Long postId) {
    return getPostDetail(postId);
  }

  @Override
  public PostDetailView createPost(Long userId, String content, List<String> images, List<String> tags, String category) {
    long id = postIdGen.incrementAndGet();
    PostData post = new PostData(
        id, null, content, images, tags,
        category != null ? category : "all", 0, 0, 0, "active",
        userId, "Mock用户", null, "南校区",
        LocalDateTime.now(), LocalDateTime.now()
    );
    posts.add(0, post);
    return getPostDetail(id);
  }

  @Override
  public PostLikeResponse likePost(Long userId, Long postId) {
    return likePost(postId);
  }

  @Override
  public CommentItemView commentPost(Long userId, Long postId, String content) {
    return createComment(userId, postId, new CreateCommentRequest(content, null));
  }

  @Override
  public ShareView sharePost(Long userId, Long postId, String comment) {
    return sharePost(userId, postId, new SharePostRequest(comment));
  }

  // ---- Phase 2 新增：帖子分类 ----

  @Override
  public List<PostCategoryView> getCategories() {
    return List.of(
        new PostCategoryView(1L, "约会", "dating", "heart", 1),
        new PostCategoryView(2L, "学习", "study", "book", 2),
        new PostCategoryView(3L, "生活", "life", "coffee", 3),
        new PostCategoryView(4L, "活动", "activity", "calendar", 4),
        new PostCategoryView(5L, "求助", "help", "help-circle", 5)
    );
  }

  // ---- 同校动态流 ----

    @Override
    public CampusFeedView getCampusFeed(Long userId, int page, int size) {
        // Mock 实现：返回空动态流
        return new CampusFeedView("南校区", List.of(), List.of(), List.of());
    }

    // ---- 相似作者推荐 ----

    @Override
    public SimilarAuthorsResponse getSimilarAuthors(Long postId, Long userId) {
        if (postId == null || userId == null) {
            throw new IllegalArgumentException("postId and userId are required");
        }

        // Mock 数据：返回 2 个不同的相似作者
        List<SimilarAuthorView> authors = List.of(
            new SimilarAuthorView(
                1003L, "周沐", null, "南校区",
                "大二计算机 · 喜欢学习和徒步",
                true, List.of("学习", "高数"), false
            ),
            new SimilarAuthorView(
                1004L, "许诺", null, "北校区",
                "摄影爱好者 · 周末出去走走",
                false, List.of("摄影", "旅行"), false
            )
        );

        return new SimilarAuthorsResponse(authors);
    }

  private PostData findPost(Long id) {
    return posts.stream()
        .filter(p -> p.id.equals(id))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Post not found: " + id));
  }

  private void initMockPosts() {
    posts.add(new PostData(
        1L, "图书馆遇到的那个女生，还有机会再见面吗？",
        "今天下午在图书馆三楼靠窗的位置，你坐在我对面，穿一件米白色卫衣。我们好几次抬头对视又赶紧低头，走的时候你留了一本书在桌上...不知道你有没有看到这条帖子。",
        null, List.of("真诚找", "图书馆"), "dating", 128, 45, 12, "active",
        1002L, "林安", null, "南校区", LocalDateTime.now().minusHours(3), LocalDateTime.now().minusHours(3)
    ));
    posts.add(new PostData(
        2L, "高数考试自救小组招人啦！",
        "期末高数太难了，想组一个小型学习小组，3-5人，每周两次在图书馆讨论，有意向的留个言～要求：大二以上，认真不摸鱼。",
        null, List.of("学习", "高数"), "study", 67, 23, 5, "active",
        1003L, "周沐", null, "北校区", LocalDateTime.now().minusHours(6), LocalDateTime.now().minusHours(6)
    ));
    posts.add(new PostData(
        3L, "周末一起去后山看日出吧！",
        "周六早上4:30校门口集合，骑车去后山观景台。上次去拍的照片在下面，真的超美！注意带外套，早上有点凉。",
        List.of("https://picsum.photos/600/400?sunrise1", "https://picsum.photos/600/400?sunrise2"),
        List.of("活动", "后山"), "activity", 89, 31, 8, "active",
        1004L, "许诺", null, "东校区", LocalDateTime.now().minusDays(1), LocalDateTime.now().minusDays(1)
    ));

    commentsByPost.put(1L, new ArrayList<>(List.of(
        new CommentData(5001L, 1L, null, "好浪漫的故事！希望能找到她 🙏", 1004L, "许诺", null,
            LocalDateTime.now().minusHours(2), null),
        new CommentData(5002L, 1L, null, "图书馆三楼靠窗确实是个好位置，光线好", 1003L, "周沐", null,
            LocalDateTime.now().minusHours(1), null)
    )));
    commentsByPost.put(2L, new ArrayList<>(List.of(
        new CommentData(5003L, 2L, null, "加我一个！大二计算机，高数勉强不挂科的水平", 1001L, "星野", null,
            LocalDateTime.now().minusHours(4), null)
    )));
  }

  private static String truncate(String text, int maxLen) {
    if (text == null)
      return null;
    return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
  }

  static class PostData {
    Long id;
    String title;
    String content;
    List<String> images;
    List<String> tags;
    String category;
    int likesCount;
    int commentsCount;
    int shareCount;
    String status;
    Long authorId;
    String authorName;
    String authorAvatar;
    String authorCampus;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    PostData(Long id, String title, String content, List<String> images, List<String> tags,
             String category, int likesCount, int commentsCount, int shareCount, String status,
             Long authorId, String authorName, String authorAvatar, String authorCampus,
             LocalDateTime createdAt, LocalDateTime updatedAt) {
      this.id = id;
      this.title = title;
      this.content = content;
      this.images = images;
      this.tags = tags;
      this.category = category;
      this.likesCount = likesCount;
      this.commentsCount = commentsCount;
      this.shareCount = shareCount;
      this.status = status;
      this.authorId = authorId;
      this.authorName = authorName;
      this.authorAvatar = authorAvatar;
      this.authorCampus = authorCampus;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
    }
  }

  record CommentData(Long id, Long postId, Long parentId, String content, Long authorId,
                     String authorName, String authorAvatar, LocalDateTime createdAt,
                     String replyTo) {
  }

  record ShareData(Long id, Long postId, Long userId, String comment, Long sharerId, String sharerName,
                   LocalDateTime createdAt) {
  }
}
