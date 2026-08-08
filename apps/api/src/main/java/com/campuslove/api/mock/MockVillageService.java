package com.campuslove.api.mock;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.village.ActivitySummaryView;
import com.campuslove.api.village.CampusActivityView;
import com.campuslove.api.village.CampusFeedView;
import com.campuslove.api.village.CampusTopicView;
import com.campuslove.api.village.FavoriteResponse;
import com.campuslove.api.village.PostHistoryItemView;
import com.campuslove.api.village.PostHistoryResponse;
import com.campuslove.api.village.CommentAuthorView;
import com.campuslove.api.village.CommentItemView;
import com.campuslove.api.village.CommentListResponse;
import com.campuslove.api.village.CommentPreviewView;
import com.campuslove.api.village.CreateCommentRequest;
import com.campuslove.api.village.CreatePostRequest;
import com.campuslove.api.village.PostAuthorView;
import com.campuslove.api.village.PostCategoryView;
import com.campuslove.api.village.PostDetailView;
import com.campuslove.api.village.PostLikeResponse;
import com.campuslove.api.village.PostListResponse;
import com.campuslove.api.village.PostSummaryView;
import com.campuslove.api.village.SharePostRequest;
import com.campuslove.api.village.ShareView;
import com.campuslove.api.village.SimilarAuthorView;
import com.campuslove.api.village.SimilarAuthorsResponse;
import com.campuslove.api.village.VillageService;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
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

  /**
   * 热门帖子点赞阈值（FIN-00057 修复：抽为常量，原 likePost/列表 isHot 判断中硬编码 50，
   * 与 real 侧 VillageViewMapper.HOT_POST_THRESHOLD 保持一致）。
   */
  private static final int HOT_POST_THRESHOLD = 50;

  private final AtomicLong postIdGen = new AtomicLong(1000);
  private final AtomicLong shareIdGen = new AtomicLong(100);
  private final AtomicLong commentIdGen = new AtomicLong(5000);

  private final List<PostData> posts = new ArrayList<>();
  private final Map<Long, List<ShareData>> sharesByPost = new LinkedHashMap<>();
  private final Map<Long, List<CommentData>> commentsByPost = new LinkedHashMap<>();

  /**
   * 2026-08-09 帖子关联活动：mock 活动摘要 Map（id 201 电影社线下碰面 / 202 周末篮球友谊赛），
   * 字段与 ActivitySummaryView 对齐；coverImage 实体暂无封面字段，恒 null。
   */
  private static final Map<Long, ActivitySummaryView> MOCK_ACTIVITIES = Map.of(
      201L, new ActivitySummaryView(201L, "电影社线下碰面", "影像楼 B 厅", "周六 15:00-17:00",
          null, "upcoming", 8, null),
      202L, new ActivitySummaryView(202L, "周末篮球友谊赛", "校体育馆", "周日 10:00-12:00",
          null, "upcoming", 20, null)
  );

  /**
   * R4-00403：点赞用户维度隔离（userId -> 已点赞帖子 ID 集合）。
   * 原 likePost(Long id) 无 userId 参数，点赞不区分用户、无法联调点赞态切换；
   * 现按用户记录点赞状态，同一用户重复点赞为取消（计数回退），不同用户互不影响。
   */
  private final Map<Long, java.util.Set<Long>> likedByUser = new java.util.concurrent.ConcurrentHashMap<>();

  /** 运行时状态（FIN-00053 修复：作者名取自真实 mock 用户而非硬编码"星野"） */
  private final MockRuntimeState runtimeState;

  public MockVillageService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
    initMockPosts();
  }

  @Override
  public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize) {
    return getPosts(category, tag, sortBy, page, pageSize, null);
  }

  @Override
  public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize,
                                   Long userId, String city, String discoverSub) {
    // Mock 模式：同城（city）与发现二级子标签（discoverSub）简化为不额外过滤，
    // 与既有 mock 语义一致（真实过滤逻辑见 RealVillageService）。
    return getPosts(category, tag, sortBy, page, pageSize, userId);
  }

  @Override
  public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId) {
    List<PostData> filtered = posts.stream()
        .filter(p -> category == null || "all".equals(category) || p.category.equals(category))
        .filter(p -> tag == null || (p.tags != null && p.tags.contains(tag)))
        .toList();

    // 校园分类：按 campus 进行筛选
    if ("campus".equals(category)) {
      String mockCampusName = MockDemoConstants.MOCK_CAMPUS_NAME;
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
        .map(p -> toSummaryView(p, false))
        .toList();

    return new PostListResponse(items, sorted.size(), page, pageSize);
  }

  /**
   * 按作者分页查询帖子（"我的动态"场景，走查补齐，与 real 侧行为对齐）。
   *
   * <p>按 authorId 过滤帖子并分页返回，视图映射逻辑与 {@link #getPosts} 保持一致。</p>
   */
  @Override
  public PostListResponse getPostsByAuthor(Long authorId, int page, int pageSize) {
    List<PostData> filtered = posts.stream()
        .filter(p -> p.authorId != null && p.authorId.equals(authorId))
        .toList();

    int from = (page - 1) * pageSize;
    int to = Math.min(from + pageSize, filtered.size());
    List<PostData> pageItems = from < filtered.size() ? filtered.subList(from, to) : List.of();

    List<PostSummaryView> items = pageItems.stream()
        .map(p -> toSummaryView(p, false))
        .toList();

    return new PostListResponse(items, filtered.size(), page, pageSize);
  }

  @Override
  public PostDetailView getPostDetail(Long id) {
    PostData post = findPost(id);
    List<CommentData> comments = commentsByPost.getOrDefault(id, List.of());
    // 2026-08-08 论坛互动真实化：mock 侧顺带模拟浏览量 +1（与 real 侧详情埋点行为一致）
    post.viewCount++;
    // 记录 mock 浏览历史（重复浏览刷新位置到头部）
    mockViewHistory.remove(post);
    mockViewHistory.add(0, post);
    // 2026-08-09 帖子关联活动：mock 详情带活动摘要（无关联则为 null）
    ActivitySummaryView activity = post.activityId != null ? MOCK_ACTIVITIES.get(post.activityId) : null;
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
        false,
        post.favoriteCount,
        post.isFavorite,
        post.viewCount,
        post.activityId,
        activity
    );
  }

  @Override
  public PostDetailView createPost(Long userId, @Valid CreatePostRequest request) {
    long id = postIdGen.incrementAndGet();
    PostData post = new PostData(
        id, request.title(), request.content(), request.images(), request.tags(),
        request.category(), 0, 0, 0, "active", userId,
        defaultUserName(), null, MockDemoConstants.MOCK_CAMPUS_NAME,
        LocalDateTime.now(TimeZones.BUSINESS), LocalDateTime.now(TimeZones.BUSINESS),
        request.activityId(), false
    );
    posts.add(0, post);
    return getPostDetail(id);
  }

  @Override
  public PostLikeResponse likePost(Long id) {
    // Phase 1 兼容入口：默认 mock 用户（MockSecurityConfig 的 principal 默认 1）
    return likePost(1L, id);
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
        id, postId, request.parentId(), request.content(), userId,
        defaultUserName(), null, LocalDateTime.now(TimeZones.BUSINESS), null
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
        userId, defaultUserName(), LocalDateTime.now(TimeZones.BUSINESS));
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
  public PostDetailView createPost(Long userId, String title, String content, List<String> images, List<String> tags, String category, Long activityId) {
    long id = postIdGen.incrementAndGet();
    PostData post = new PostData(
        id, title, content, images, tags,
        category != null ? category : "all", 0, 0, 0, "active",
        userId, defaultUserName(), null, MockDemoConstants.MOCK_CAMPUS_NAME,
        LocalDateTime.now(TimeZones.BUSINESS), LocalDateTime.now(TimeZones.BUSINESS),
        activityId, false
    );
    posts.add(0, post);
    return getPostDetail(id);
  }

  @Override
  public PostLikeResponse likePost(Long userId, Long postId) {
    PostData post = findPost(postId);
    // R4-00403：按用户维度切换点赞状态（同一用户重复点赞视为取消，计数回退），
    // 不同用户点赞互不影响——mock 模式可联调点赞态切换（原实现无用户维度隔离）
    java.util.Set<Long> likedPosts = likedByUser.computeIfAbsent(
            userId, k -> java.util.concurrent.ConcurrentHashMap.newKeySet());
    boolean nowLiked;
    synchronized (likedPosts) {
      if (likedPosts.contains(postId)) {
        likedPosts.remove(postId);
        post.likesCount = Math.max(0, post.likesCount - 1);
        nowLiked = false;
      } else {
        likedPosts.add(postId);
        post.likesCount++;
        nowLiked = true;
      }
    }
    return new PostLikeResponse(true, nowLiked, post.likesCount);
  }

  // ---- 2026-08-08 论坛互动真实化：收藏 / 浏览记录（mock 内存实现，防前端 mock 模式 404） ----

  /**
   * mock 浏览历史（最近浏览在头部，重复浏览刷新位置）。
   */
  private final java.util.List<PostData> mockViewHistory = new java.util.ArrayList<>();

  @Override
  public FavoriteResponse toggleFavorite(Long userId, Long postId) {
    PostData post = findPost(postId);
    post.isFavorite = !post.isFavorite;
    post.favoriteCount += post.isFavorite ? 1 : -1;
    if (post.favoriteCount < 0) {
      post.favoriteCount = 0;
    }
    return new FavoriteResponse(true, post.isFavorite, post.favoriteCount);
  }

  @Override
  public PostHistoryResponse getPostHistory(Long userId, int page, int pageSize) {
    int from = (page - 1) * pageSize;
    int to = Math.min(from + pageSize, mockViewHistory.size());
    List<PostHistoryItemView> items = from < mockViewHistory.size()
        ? mockViewHistory.subList(from, to).stream()
            .map(p -> new PostHistoryItemView(
                toSummaryView(p, false),
                LocalDateTime.now(TimeZones.BUSINESS).toString()))
            .toList()
        : List.of();
    return new PostHistoryResponse(items, mockViewHistory.size(), page, pageSize);
  }

  @Override
  public void clearPostHistory(Long userId) {
    mockViewHistory.clear();
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
        // FIN-00056 修复：原实现恒返回空动态流。现聚合同校（南校区）帖子 + 活动 + 话题，
        // page/size 对帖子列表生效（与 real 侧语义对齐）。
        String mockCampusName = MockDemoConstants.MOCK_CAMPUS_NAME;
        List<PostSummaryView> campusPosts = posts.stream()
            .filter(p -> mockCampusName.equals(p.authorCampus))
            .skip((long) Math.max(0, page) * Math.max(1, size))
            .limit(Math.max(1, size))
            .map(p -> toSummaryView(p, true))
            .toList();
        List<CampusActivityView> activities = List.of(
            new CampusActivityView(201L, "图书馆南门咖啡散步", "周四 19:00-20:00",
                "南门咖啡馆", 12, "upcoming"),
            new CampusActivityView(202L, "电影社轻松线下碰面", "周六 15:00-17:00",
                "影像楼 B 厅", 8, "upcoming")
        );
        List<CampusTopicView> topics = List.of(
            new CampusTopicView(2001L, 1L, "摄影社", "摄影社新学期招新啦！", "林安", 32,
                LocalDateTime.now(TimeZones.BUSINESS).minusDays(1).toString()),
            new CampusTopicView(2002L, 1L, "学习圈", "高数A期末考试复习资料共享", "星野", 15,
                LocalDateTime.now(TimeZones.BUSINESS).minusDays(2).toString())
        );
        return new CampusFeedView(mockCampusName, campusPosts, activities, topics);
    }

    /** 当前 mock 用户的展示名（FIN-00053 修复：从 MockRuntimeState 获取，替代硬编码"星野"）。 */
    private String defaultUserName() {
        if (runtimeState == null) {
            return "星野";
        }
        String name = runtimeState.currentSession().displayName();
        return name != null && !name.isBlank() ? name : "星野";
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
                1003L, "周沐", null, MockDemoConstants.MOCK_CAMPUS_NAME,
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

  /**
   * 2026-08-09 统一组装帖子摘要视图（活动摘要 / 置顶 / 最新评论预览）。
   */
  private PostSummaryView toSummaryView(PostData p, boolean isAlumni) {
    return new PostSummaryView(
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
        p.likesCount >= HOT_POST_THRESHOLD,
        isAlumni,
        false,
        p.favoriteCount,
        p.isFavorite,
        p.viewCount,
        p.activityId,
        p.activityId != null ? MOCK_ACTIVITIES.get(p.activityId) : null,
        p.isPinned,
        recentCommentsOf(p.id)
    );
  }

  /**
   * 2026-08-09 每帖最新 2 条根评论预览（楼中楼回复数 = 子评论条数）。
   */
  private List<CommentPreviewView> recentCommentsOf(Long postId) {
    List<CommentData> comments = commentsByPost.getOrDefault(postId, List.of());
    return comments.stream()
        .filter(c -> c.parentId() == null)
        .sorted(Comparator.comparing(CommentData::createdAt).reversed())
        .limit(2)
        .map(c -> new CommentPreviewView(
            c.id(),
            new CommentAuthorView(c.authorId(), c.authorName(), c.authorAvatar()),
            c.content(),
            c.createdAt().toString(),
            (int) comments.stream()
                .filter(r -> r.parentId() != null && r.parentId().equals(c.id()))
                .count()))
        .toList();
  }

  private PostData findPost(Long id) {
    return posts.stream()
        .filter(p -> p.id.equals(id))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Post not found: " + id));
  }

  private void initMockPosts() {
    // FIN-00055 修复：数据由 3 帖/3 评论扩充为 10 帖/8 评论，覆盖全部 5 个分类；
    // 作者校区分布兼顾「南校区（同校流可见）+ 北/东校区」；
    // 图片外链（picsum.photos）替换为本地 mock 资源路径（FIN-00026，避免小程序域名白名单问题）。
    posts.add(new PostData(
        1L, "图书馆遇到的那个女生，还有机会再见面吗？",
        "今天下午在图书馆三楼靠窗的位置，你坐在我对面，穿一件米白色卫衣。我们好几次抬头对视又赶紧低头，走的时候你留了一本书在桌上...不知道你有没有看到这条帖子。",
        null, List.of("真诚找", "图书馆"), "dating", 128, 45, 12, "active",
        1002L, "林安", MockMediaPaths.AVATAR_LINAN, MockDemoConstants.MOCK_CAMPUS_NAME, LocalDateTime.now(TimeZones.BUSINESS).minusHours(3), LocalDateTime.now(TimeZones.BUSINESS).minusHours(3),
        null, false
    ));
    posts.add(new PostData(
        2L, "高数考试自救小组招人啦！",
        "期末高数太难了，想组一个小型学习小组，3-5人，每周两次在图书馆讨论，有意向的留个言～要求：大二以上，认真不摸鱼。",
        null, List.of("学习", "高数"), "study", 67, 23, 5, "active",
        1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU, "北校区", LocalDateTime.now(TimeZones.BUSINESS).minusHours(6), LocalDateTime.now(TimeZones.BUSINESS).minusHours(6),
        null, false
    ));
    posts.add(new PostData(
        3L, "周末一起去后山看日出吧！",
        "周六早上4:30校门口集合，骑车去后山观景台。上次去拍的照片在下面，真的超美！注意带外套，早上有点凉。",
        List.of(MockMediaPaths.POST_SUNRISE_1, MockMediaPaths.POST_SUNRISE_2),
        List.of("活动", "后山"), "activity", 89, 31, 8, "active",
        1004L, "许诺", MockMediaPaths.AVATAR_XUNUO, "东校区", LocalDateTime.now(TimeZones.BUSINESS).minusDays(1), LocalDateTime.now(TimeZones.BUSINESS).minusDays(1),
        null, false
    ));
    posts.add(new PostData(
        4L, "南门新开的咖啡馆测评：环境好但略贵",
        "刚开业一周的『南窗咖啡』，装修很出片，插座充足适合自习。一杯拿铁 28 元略贵，但充值活动划算。学生党可以冲下午茶套餐～",
        List.of(MockMediaPaths.POST_COFFEE_1), List.of("生活", "探店"), "life", 52, 18, 3, "active",
        1002L, "林安", MockMediaPaths.AVATAR_LINAN, MockDemoConstants.MOCK_CAMPUS_NAME, LocalDateTime.now(TimeZones.BUSINESS).minusDays(2), LocalDateTime.now(TimeZones.BUSINESS).minusDays(2),
        null, false
    ));
    posts.add(new PostData(
        5L, "毕业季出二手：台灯、书架、移动硬盘",
        "临近毕业清宿舍，台灯 20、书架 15、1T 移动硬盘 120，都可小刀。宿舍楼下当面交易，有意留言或私信～",
        null, List.of("二手", "毕业季"), "help", 34, 27, 6, "active",
        1001L, "星野", MockMediaPaths.AVATAR_XINGYE, MockDemoConstants.MOCK_CAMPUS_NAME, LocalDateTime.now(TimeZones.BUSINESS).minusDays(3), LocalDateTime.now(TimeZones.BUSINESS).minusDays(3),
        null, false
    ));
    posts.add(new PostData(
        6L, "四六级冲刺搭子：每天早上图书馆门口晨读",
        "想找 2-3 个英语搭子，每天早上 7:00-7:30 在图书馆门口晨读，互相抽查单词，周末模拟真题。自律党来！",
        null, List.of("学习", "四六级"), "study", 41, 15, 2, "active",
        1004L, "许诺", MockMediaPaths.AVATAR_XUNUO, "东校区", LocalDateTime.now(TimeZones.BUSINESS).minusDays(3), LocalDateTime.now(TimeZones.BUSINESS).minusDays(3),
        null, false
    ));
    posts.add(new PostData(
        7L, "周五晚电影社放映：《星际穿越》",
        "本周五 19:00 影像楼 B 厅放映《星际穿越》，映后自由讨论。免费入场，欢迎带朋友一起来～",
        List.of(MockMediaPaths.POST_MOVIE_1), List.of("活动", "电影"), "activity", 76, 22, 9, "active",
        1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU, "北校区", LocalDateTime.now(TimeZones.BUSINESS).minusDays(4), LocalDateTime.now(TimeZones.BUSINESS).minusDays(4),
        null, false
    ));
    posts.add(new PostData(
        8L, "求助：相机镜头进灰了，学校附近有靠谱维修吗？",
        "上周外拍回来发现镜头里进了一粒灰，拍照有黑点。问了几家店报价差别很大，求推荐靠谱的相机维修店，救救孩子！",
        null, List.of("求助", "摄影"), "help", 12, 9, 1, "active",
        1001L, "星野", MockMediaPaths.AVATAR_XINGYE, MockDemoConstants.MOCK_CAMPUS_NAME, LocalDateTime.now(TimeZones.BUSINESS).minusDays(5), LocalDateTime.now(TimeZones.BUSINESS).minusDays(5),
        null, false
    ));
    posts.add(new PostData(
        9L, "记录第一次和心动的人一起逛操场",
        "昨晚一起走了三圈操场，聊到宿舍关门。原来她也有在偷偷关注我，这一刻觉得之前的忐忑都值了。",
        null, List.of("恋爱", "记录"), "dating", 210, 88, 21, "active",
        1004L, "许诺", MockMediaPaths.AVATAR_XUNUO, "东校区", LocalDateTime.now(TimeZones.BUSINESS).minusDays(6), LocalDateTime.now(TimeZones.BUSINESS).minusDays(6),
        null, false
    ));
    posts.add(new PostData(
        10L, "求拼车：周末去市区图书馆查资料",
        "周末想约 2-3 人拼车去市图书馆（早去晚回），平摊车费大概一人 15 元，路上还能一起讨论论文。有一起的吗？",
        null, List.of("生活", "拼车"), "life", 8, 5, 0, "active",
        1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU, "北校区", LocalDateTime.now(TimeZones.BUSINESS).minusDays(7), LocalDateTime.now(TimeZones.BUSINESS).minusDays(7),
        null, false
    ));

    commentsByPost.put(1L, new ArrayList<>(List.of(
        new CommentData(5001L, 1L, null, "好浪漫的故事！希望能找到她。", 1004L, "许诺", MockMediaPaths.AVATAR_XUNUO,
            LocalDateTime.now(TimeZones.BUSINESS).minusHours(2), null),
        new CommentData(5002L, 1L, null, "图书馆三楼靠窗确实是个好位置，光线好", 1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU,
            LocalDateTime.now(TimeZones.BUSINESS).minusHours(1), null),
        new CommentData(5003L, 1L, null, "蹲一个后续！", 1002L, "林安", MockMediaPaths.AVATAR_LINAN,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(30), null)
    )));
    commentsByPost.put(2L, new ArrayList<>(List.of(
        new CommentData(5004L, 2L, null, "加我一个！大二计算机，高数勉强不挂科的水平", 1001L, "星野", MockMediaPaths.AVATAR_XINGYE,
            LocalDateTime.now(TimeZones.BUSINESS).minusHours(4), null),
        new CommentData(5005L, 2L, null, "组队成功记得拉群，我也在高数苦海中", 1002L, "林安", MockMediaPaths.AVATAR_LINAN,
            LocalDateTime.now(TimeZones.BUSINESS).minusHours(3), null)
    )));
    commentsByPost.put(3L, new ArrayList<>(List.of(
        new CommentData(5006L, 3L, null, "日出真的绝美！上次去蹲到了云海", 1001L, "星野", MockMediaPaths.AVATAR_XINGYE,
            LocalDateTime.now(TimeZones.BUSINESS).minusDays(1).minusHours(2), null),
        new CommentData(5007L, 3L, null, "带我一个，正好周末没安排", 1002L, "林安", MockMediaPaths.AVATAR_LINAN,
            LocalDateTime.now(TimeZones.BUSINESS).minusDays(1).minusHours(1), null)
    )));
    commentsByPost.put(4L, new ArrayList<>(List.of(
        new CommentData(5008L, 4L, null, "上周去过，提拉米苏不错", 1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU,
            LocalDateTime.now(TimeZones.BUSINESS).minusHours(5), null)
    )));

    // 2026-08-09 今日频道：新增 4 条今日帖（置顶公告 / 2 条活动帖 / 图片帖），
    // 作者沿用 mock 既有用户（1001 星野 / 1002 林安 / 1003 周沐 / 1004 许诺）。
    posts.add(new PostData(
        11L, "本周圈子公告：七夕主题活动预告",
        "下周就是七夕啦，圈子将推出「七夕主题活动」：同城配对聊天、操场星空夜话、图书馆寻宝游戏三选一，报名通道本周五 20:00 开启，名额有限，敬请期待！",
        null, List.of("公告", "七夕"), "interest", 32, 4, 1, "active",
        1001L, "星野", MockMediaPaths.AVATAR_XINGYE, MockDemoConstants.MOCK_CAMPUS_NAME,
        LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(10), LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(10),
        null, true
    ));
    posts.add(new PostData(
        12L, "电影社放映《你的名字》：现场报名ing",
        "周六 15:00 影像楼 B 厅放映《你的名字》，映后有交流环节，现场报名即可入场，座位先到先得。上次《星际穿越》场场爆满，这次早点来呀！",
        null, List.of("活动", "电影"), "activity", 18, 4, 2, "active",
        1002L, "林安", MockMediaPaths.AVATAR_LINAN, MockDemoConstants.MOCK_CAMPUS_NAME,
        LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(25), LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(25),
        201L, false
    ));
    posts.add(new PostData(
        13L, "周末篮球友谊赛，缺两个人！",
        "周日上午 10:00 校体育馆，约了 3v3 友谊赛，目前缺两个人！水平不限，会跑位传球就行，打完一起干饭。想来的评论区扣 1，凑齐就开打～",
        null, List.of("活动", "篮球"), "activity", 14, 3, 1, "active",
        1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU, "北校区",
        LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(40), LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(40),
        202L, false
    ));
    posts.add(new PostData(
        14L, "今日份图书馆晚霞，治愈了",
        "傍晚在图书馆四楼自习，抬头看到窗外的晚霞，橘粉色一层层漫开，整个人都被治愈了。学习再累，也别忘了看看窗外呀。",
        List.of(MockMediaPaths.POST_SUNRISE_1), List.of("生活", "晚霞"), "life", 9, 0, 0, "active",
        1004L, "许诺", MockMediaPaths.AVATAR_XUNUO, "东校区",
        LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(55), LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(55),
        null, false
    ));

    // 2026-08-09 今日帖评论（id 5009 起；每帖至少一条根评论带楼中楼子评论）
    commentsByPost.put(11L, new ArrayList<>(List.of(
        new CommentData(5009L, 11L, null, "期待！到时候一定去现场看看", 1004L, "许诺", MockMediaPaths.AVATAR_XUNUO,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(8), null),
        new CommentData(5010L, 11L, null, "七夕活动安排什么时候出详情呀？", 1002L, "林安", MockMediaPaths.AVATAR_LINAN,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(6), null),
        new CommentData(5011L, 11L, 5010L, "明天下午公布，记得关注公告～", 1001L, "星野", MockMediaPaths.AVATAR_XINGYE,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(4), null),
        new CommentData(5012L, 11L, null, "置顶帖终于来啦，蹲一个活动预告", 1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(2), null)
    )));
    commentsByPost.put(12L, new ArrayList<>(List.of(
        new CommentData(5013L, 12L, null, "《你的名字》yyds！报名报名", 1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(20), null),
        new CommentData(5014L, 12L, 5013L, "现场还有纪念票根哦", 1002L, "林安", MockMediaPaths.AVATAR_LINAN,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(15), null),
        new CommentData(5015L, 12L, null, "上次电影社活动超棒，这次也去", 1001L, "星野", MockMediaPaths.AVATAR_XINGYE,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(12), null),
        new CommentData(5016L, 12L, null, "请问需要提前报名吗？", 1004L, "许诺", MockMediaPaths.AVATAR_XUNUO,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(5), null)
    )));
    commentsByPost.put(13L, new ArrayList<>(List.of(
        new CommentData(5017L, 13L, null, "我报名！缺我一个是吧", 1001L, "星野", MockMediaPaths.AVATAR_XINGYE,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(30), null),
        new CommentData(5018L, 13L, 5017L, "算你一个，还差一个啦", 1003L, "周沐", MockMediaPaths.AVATAR_ZHOU_MU,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(22), null),
        new CommentData(5019L, 13L, null, "可以带不怎么会打的新手吗哈哈", 1004L, "许诺", MockMediaPaths.AVATAR_XUNUO,
            LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(15), null)
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
    /**
     * 2026-08-08 论坛互动真实化：mock 收藏数 / 浏览量 / 已收藏（构造器默认派生，个别帖覆写）。
     */
    int favoriteCount;
    int viewCount;
    boolean isFavorite;
    String status;
    Long authorId;
    String authorName;
    String authorAvatar;
    String authorCampus;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    /**
     * 2026-08-09 帖子关联活动：关联活动 ID（mock 活动 Map 见 MOCK_ACTIVITIES，无则 null）。
     */
    Long activityId;
    /**
     * 2026-08-09 帖子置顶：置顶帖列表优先展示。
     */
    boolean isPinned;

    PostData(Long id, String title, String content, List<String> images, List<String> tags,
             String category, int likesCount, int commentsCount, int shareCount, String status,
             Long authorId, String authorName, String authorAvatar, String authorCampus,
             LocalDateTime createdAt, LocalDateTime updatedAt,
             Long activityId, boolean isPinned) {
      this.id = id;
      this.title = title;
      this.content = content;
      this.images = images;
      this.tags = tags;
      this.category = category;
      this.likesCount = likesCount;
      this.favoriteCount = likesCount / 3;
      this.viewCount = likesCount * 10;
      this.isFavorite = false;
      this.commentsCount = commentsCount;
      this.shareCount = shareCount;
      this.status = status;
      this.authorId = authorId;
      this.authorName = authorName;
      this.authorAvatar = authorAvatar;
      this.authorCampus = authorCampus;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
      this.activityId = activityId;
      this.isPinned = isPinned;
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
