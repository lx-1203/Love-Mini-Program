package com.campuslove.api.village;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.PostCategoryEntity;
import com.campuslove.api.entity.PostLike;
import com.campuslove.api.entity.PostShare;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.PostCategoryRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PostShareRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实村口帖子与转发服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 */
@Profile("real")
@Service
public class RealVillageService implements VillageService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostShareRepository postShareRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostCategoryRepository postCategoryRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserFollowRepository userFollowRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final ObjectMapper objectMapper;
    private final InteractionEventService interactionEventService;
    private final ActivityRepository activityRepository;
    private final CircleTopicRepository circleTopicRepository;
    private final SensitiveWordFilter sensitiveWordFilter;

    public RealVillageService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostShareRepository postShareRepository,
            PostLikeRepository postLikeRepository,
            PostCategoryRepository postCategoryRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserFollowRepository userFollowRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            ObjectMapper objectMapper,
            InteractionEventService interactionEventService,
            ActivityRepository activityRepository,
            CircleTopicRepository circleTopicRepository,
            SensitiveWordFilter sensitiveWordFilter) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postShareRepository = postShareRepository;
        this.postLikeRepository = postLikeRepository;
        this.postCategoryRepository = postCategoryRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userFollowRepository = userFollowRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.objectMapper = objectMapper;
        this.interactionEventService = interactionEventService;
        this.activityRepository = activityRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    // ---- Phase 1 兼容方法（委托给 Phase 2 实现，userId 由 Controller 传入） ----

    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize) {
        return getPosts(category, tag, sortBy, page, pageSize, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        // 校园分类：需要 userId 筛选与当前用户同校的帖子
        if ("campus".equals(category)) {
            return getCampusCategoryPosts(userId, pageable);
        }

        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = PostCategory.valueOf(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }

        List<PostSummaryView> items = postPage.getContent().stream()
                .map(this::toPostSummaryView)
                .toList();

        return new PostListResponse(items, (int) postPage.getTotalElements(), page, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public PostDetailView getPostDetail(Long id) {
        return getPost(id);
    }

    @Override
    @Transactional
    public PostDetailView createPost(Long userId, @Valid CreatePostRequest request) {
        // Phase 1 兼容：userId 由 Controller 层传入
        return createPost(userId, request.content(), request.images(), request.tags(), request.category());
    }

    @Override
    @Transactional
    public PostLikeResponse likePost(Long id) {
        // Phase 2: 从 SecurityContext 获取当前用户ID，未认证时抛出 401 异常
        return likePost(SecurityUtils.getCurrentUserId(), id);
    }

    @Override
    @Transactional(readOnly = true)
    public CommentListResponse getComments(Long postId, int page, int pageSize) {
        // 使用数据库分页而非内存分页，避免 OOM 风险
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Comment> commentPage = commentRepository.findByPostIdOrderByCreatedAtDesc(postId, pageable);

        List<CommentItemView> items = commentPage.getContent().stream()
                .map(this::toCommentItemView)
                .toList();

        return new CommentListResponse(items, (int) commentPage.getTotalElements(), page, pageSize);
    }

    @Override
    @Transactional
    public CommentItemView createComment(Long userId, Long postId, @Valid CreateCommentRequest request) {
        // Phase 1 兼容：userId 由 Controller 层传入
        return commentPost(userId, postId, request.content());
    }

    @Override
    @Transactional
    public ShareView sharePost(Long userId, Long postId, @Valid SharePostRequest request) {
        // Phase 1 兼容：userId 由 Controller 层传入
        return sharePost(userId, postId, request.comment());
    }

    // ---- Phase 2 核心实现 ----

    /**
     * 获取帖子列表（支持 tab 切换、分类过滤、分页）。
     * - tab="discover": 所有帖子，按创建时间倒序
     * - tab="city": 同城市帖子优先
     * - tab="following": 关注用户的帖子
     */
    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String tab, String category, Long userId, Pageable pageable) {
        String effectiveTab = tab != null ? tab : "discover";

        return switch (effectiveTab) {
            case "city" -> getCityPosts(category, userId, pageable);
            case "following" -> getFollowingPosts(category, userId, pageable);
            default -> getDiscoverPosts(category, pageable);
        };
    }

    @Override
    @Transactional(readOnly = true)
    public PostDetailView getPost(Long postId) {
        Post post = findPostOrThrow(postId);
        // 尝试获取当前用户 ID（未认证时返回 null）
        Long currentUserId = null;
        try {
            currentUserId = SecurityUtils.getCurrentUserId();
        } catch (Exception e) {
            // 未认证用户查看帖子，isLiked/isAuthor 均为 false
        }
        return toPostDetailView(post, currentUserId);
    }

    @Override
    @Transactional
    public PostDetailView createPost(Long userId, String content, List<String> images, List<String> tags, String category) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        // 敏感词过滤：过滤帖子内容和标签
        String filteredContent = sensitiveWordFilter.filterWithLog(content, userId, "POST");
        List<String> filteredTags = filterTagList(tags, userId);

        LocalDateTime now = LocalDateTime.now();
        Post post = new Post();
        post.setAuthorId(userId);
        post.setContent(filteredContent);
        post.setImages(toJsonString(images));
        post.setTags(toJsonString(filteredTags));
        post.setCategory(category != null ? PostCategory.valueOf(category) : PostCategory.all);
        post.setLikesCount(0);
        post.setCommentsCount(0);
        post.setShareCount(0);
        post.setStatus(PostStatus.active);
        post.setCreatedAt(now);
        post.setUpdatedAt(now);

        postRepository.save(post);
        // 创建者查看自己的帖子，isAuthor 应为 true
        return toPostDetailView(post, userId);
    }

    @Override
    @Transactional
    public PostLikeResponse likePost(Long userId, Long postId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        Post post = findPostOrThrow(postId);

        // 查询当前用户是否已对该帖子点赞
        boolean alreadyLiked = postLikeRepository.existsByUserIdAndPostId(userId, postId);

        if (alreadyLiked) {
            // 已点赞 -> 取消点赞：删除 PostLike 记录，帖子 likeCount - 1
            postLikeRepository.deleteByUserIdAndPostId(userId, postId);
            post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
        } else {
            // 未点赞 -> 新增点赞：创建 PostLike 记录，帖子 likeCount + 1
            PostLike postLike = new PostLike(userId, postId);
            postLikeRepository.save(postLike);
            post.setLikesCount(post.getLikesCount() + 1);

            // 记录互动事件：通知帖子作者有人点赞
            if (!userId.equals(post.getAuthorId())) {
                interactionEventService.recordEvent(
                        post.getAuthorId(), userId, "POST_LIKED", postId, "POST",
                        "有人赞了你的帖子"
                );
            }
        }

        post.setUpdatedAt(LocalDateTime.now());
        postRepository.save(post);

        // 返回更新后的点赞状态：liked 表示当前是否处于点赞状态
        boolean currentLiked = !alreadyLiked;
        return new PostLikeResponse(true, currentLiked, post.getLikesCount());
    }

    @Override
    @Transactional
    public CommentItemView commentPost(Long userId, Long postId, String content) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        Post post = findPostOrThrow(postId);

        LocalDateTime now = LocalDateTime.now();
        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthorId(userId);
        comment.setContent(content);
        comment.setCreatedAt(now);

        commentRepository.save(comment);

        // 增加帖子评论计数
        post.setCommentsCount(post.getCommentsCount() + 1);
        post.setUpdatedAt(now);
        postRepository.save(post);

        // 记录互动事件：通知帖子作者有人评论
        if (!userId.equals(post.getAuthorId())) {
            interactionEventService.recordEvent(
                    post.getAuthorId(), userId, "POST_COMMENTED", postId, "POST",
                    "有人评论了你的帖子"
            );
        }

        return toCommentItemView(comment);
    }

    @Override
    @Transactional
    public ShareView sharePost(Long userId, Long postId, String comment) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        Post post = findPostOrThrow(postId);

        LocalDateTime now = LocalDateTime.now();
        PostShare share = new PostShare();
        share.setPost(post);
        share.setUserId(userId);
        share.setComment(comment);
        share.setCreatedAt(now);

        postShareRepository.save(share);

        // 增加帖子转发计数
        post.setShareCount(post.getShareCount() + 1);
        post.setUpdatedAt(now);
        postRepository.save(post);

        return new ShareView(share.getId(), postId, post.getShareCount());
    }

    // ---- Phase 2 新增：帖子分类 ----

    /**
     * 获取帖子分类列表（仅返回已启用的分类）。
     */
    @Override
    @Transactional(readOnly = true)
    public List<PostCategoryView> getCategories() {
        List<PostCategoryEntity> categories = postCategoryRepository.findByIsActiveTrueOrderBySortOrderAsc();
        return categories.stream()
                .map(cat -> new PostCategoryView(
                        cat.getId(),
                        cat.getName(),
                        cat.getCode(),
                        cat.getIcon(),
                        cat.getSortOrder()
                ))
                .toList();
    }

    // ---- 同校动态流 ----

    /**
     * 聚合同校动态流。
     * 获取用户所在学校（从 UserCampusProfile 查询），
     * 聚合同校用户最新帖子（限制 10 条）、同校即将开始的活动（限制 5 条）、
     * 兴趣圈最新话题（限制 5 条），按时间倒序混合排列。
     *
     * @param userId 当前用户 ID
     * @param page   页码（从 0 开始）
     * @param size   每页大小
     * @return 同校动态流视图
     */
    @Override
    @Transactional(readOnly = true)
    public CampusFeedView getCampusFeed(Long userId, int page, int size) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        // 获取用户所在学校
        String campusName = userCampusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName)
                .orElse("");

        // 1. 聚合同校用户最新帖子（限制 10 条）
        List<PostSummaryView> posts = getCampusPosts(campusName);

        // 2. 聚合同校即将开始的活动（限制 5 条）
        List<CampusActivityView> activities = getCampusActivities(campusName);

        // 3. 聚合兴趣圈最新话题（限制 5 条）
        List<CampusTopicView> topics = getCampusTopics();

        return new CampusFeedView(campusName, posts, activities, topics);
    }

    /**
     * 获取同校分类帖子（当用户选择"校园"Tab时调用）。
     * 查询所有活跃帖子，通过 authorId 匹配当前用户的 campusName 进行筛选。
     *
     * @param userId   当前用户 ID
     * @param pageable 分页参数
     * @return 帖子列表响应
     */
    private PostListResponse getCampusCategoryPosts(Long userId, Pageable pageable) {
        if (userId == null) {
            return new PostListResponse(List.of(), 0,
                    pageable.getPageNumber() + 1, pageable.getPageSize());
        }

        // 获取当前用户的校区名称
        String myCampusName = userCampusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName)
                .orElse("");
        if (myCampusName.isEmpty()) {
            return new PostListResponse(List.of(), 0,
                    pageable.getPageNumber() + 1, pageable.getPageSize());
        }

        // 查询所有活跃帖子并筛选同校作者
        Page<Post> postPage = postRepository.findByStatusOrderByCreatedAtDesc(
                PostStatus.active, pageable);

        List<Post> campusPosts = new ArrayList<>();
        for (Post post : postPage.getContent()) {
            if (isSameCampus(post.getAuthorId(), myCampusName)) {
                campusPosts.add(post);
            }
        }

        List<PostSummaryView> items = campusPosts.stream()
                .map(post -> toPostSummaryView(post, myCampusName))
                .toList();

        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    /**
     * 获取同校用户最新帖子（限制 10 条）。
     * 查询所有活跃帖子，筛选同校作者的帖子。
     *
     * @param campusName 校区名称
     * @return 帖子摘要视图列表
     */
    private List<PostSummaryView> getCampusPosts(String campusName) {
        Page<Post> postPage = postRepository.findByStatusOrderByCreatedAtDesc(
                PostStatus.active, PageRequest.of(0, 50));

        List<Post> campusPosts = new ArrayList<>();
        for (Post post : postPage.getContent()) {
            if (campusPosts.size() >= 10) {
                break;
            }
            if (!campusName.isEmpty() && isSameCampus(post.getAuthorId(), campusName)) {
                campusPosts.add(post);
            }
        }

        return campusPosts.stream()
                .map(post -> toPostSummaryView(post, campusName))
                .toList();
    }

    /**
     * 获取同校即将开始的活动（限制 5 条）。
     * 按校区名称和 upcoming 状态查询活动。
     *
     * @param campusName 校区名称
     * @return 活动简要视图列表
     */
    private List<CampusActivityView> getCampusActivities(String campusName) {
        if (campusName.isEmpty()) {
            return List.of();
        }

        Page<Activity> activityPage = activityRepository
                .findByCampusNameAndStatusOrderByActivityDateAsc(
                        campusName, ActivityStatus.upcoming, PageRequest.of(0, 5));

        return activityPage.getContent().stream()
                .map(activity -> new CampusActivityView(
                        activity.getId(),
                        activity.getTitle(),
                        activity.getScheduleText(),
                        activity.getLocation(),
                        activity.getEnrollmentCount(),
                        activity.getStatus().name()
                ))
                .toList();
    }

    /**
     * 获取兴趣圈最新话题（限制 5 条）。
     * 按创建时间倒序查询所有话题。
     *
     * @return 话题简要视图列表
     */
    private List<CampusTopicView> getCampusTopics() {
        Page<CircleTopic> topicPage = circleTopicRepository
                .findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5));

        return topicPage.getContent().stream()
                .map(topic -> {
                    String authorName = userRepository.findById(topic.getAuthorId())
                            .map(User::getNickname)
                            .orElse(DisplayConstants.UNKNOWN_USER);
                    return new CampusTopicView(
                            topic.getId(),
                            topic.getCircle().getId(),
                            topic.getCircle().getName(),
                            topic.getTitle(),
                            authorName,
                            topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                            topic.getCreatedAt().toString()
                    );
                })
                .toList();
    }

    // ---- 私有辅助方法 ----

    /**
     * 发现页帖子：所有帖子按创建时间倒序。
     */
    private PostListResponse getDiscoverPosts(String category, Pageable pageable) {
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = PostCategory.valueOf(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(
                    postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }

        List<PostSummaryView> items = postPage.getContent().stream()
                .map(this::toPostSummaryView)
                .toList();

        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    /**
     * 同城帖子：同校区帖子优先，然后其他帖子。
     * 使用 campus_name 进行排序（同校优先）。
     */
    private PostListResponse getCityPosts(String category, Long userId, Pageable pageable) {
        // 获取当前用户的校区名称
        final String myCampusName;
        if (userId != null) {
            myCampusName = userCampusProfileRepository.findByUserId(userId)
                    .map(UserCampusProfile::getCampusName)
                    .orElse("");
        } else {
            myCampusName = "";
        }

        // 查询所有帖子
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = PostCategory.valueOf(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(
                    postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }

        // 按同校区优先排序
        List<Post> allPosts = new ArrayList<>(postPage.getContent());
        if (!myCampusName.isEmpty()) {
            allPosts.sort((a, b) -> {
                boolean aSameCampus = isSameCampus(a.getAuthorId(), myCampusName);
                boolean bSameCampus = isSameCampus(b.getAuthorId(), myCampusName);
                if (aSameCampus && !bSameCampus) return -1;
                if (!aSameCampus && bSameCampus) return 1;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });
        }

        List<PostSummaryView> items = allPosts.stream()
                .map(post -> toPostSummaryView(post, myCampusName))
                .toList();

        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    /**
     * 关注帖子：仅显示关注用户的帖子。
     * 通过 UserFollowRepository 查询当前用户关注的用户列表，
     * 然后筛选这些用户发布的帖子。
     */
    private PostListResponse getFollowingPosts(String category, Long userId, Pageable pageable) {
        // 如果用户未登录，返回空列表
        if (userId == null) {
            return new PostListResponse(List.of(), 0,
                    pageable.getPageNumber() + 1, pageable.getPageSize());
        }

        // 查询当前用户关注的用户 ID 列表
        List<UserFollow> followingRelations = userFollowRepository.findByFollowerId(userId);
        List<Long> followingUserIds = followingRelations.stream()
                .map(UserFollow::getFollowingId)
                .toList();

        // 如果没有关注任何用户，返回空列表
        if (followingUserIds.isEmpty()) {
            return new PostListResponse(List.of(), 0,
                    pageable.getPageNumber() + 1, pageable.getPageSize());
        }

        // 查询关注用户的帖子
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = PostCategory.valueOf(category);
            postPage = postRepository.findByAuthorIdInAndCategoryAndStatusOrderByCreatedAtDesc(
                    followingUserIds, postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                    followingUserIds, PostStatus.active, pageable);
        }

        List<PostSummaryView> items = postPage.getContent().stream()
                .map(this::toPostSummaryView)
                .toList();

        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    /**
     * 检查指定用户是否与当前用户同校区。
     */
    private boolean isSameCampus(Long authorId, String myCampusName) {
        if (myCampusName == null || myCampusName.isEmpty()) {
            return false;
        }
        return userCampusProfileRepository.findByUserId(authorId)
                .map(campus -> myCampusName.equals(campus.getCampusName()))
                .orElse(false);
    }

    /**
     * 查找帖子，不存在则抛出异常。
     */
    private Post findPostOrThrow(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found: " + postId));
    }

    /**
     * 将 Post 实体转换为 PostSummaryView（不含同校信息）。
     */
    private PostSummaryView toPostSummaryView(Post post) {
        return toPostSummaryView(post, "");
    }

    /**
     * 将 Post 实体转换为 PostSummaryView（含同校信息）。
     */
    private PostSummaryView toPostSummaryView(Post post, String myCampusName) {
        PostAuthorView author = getPostAuthorView(post.getAuthorId());
        List<String> tags = parseJsonToList(post.getTags());
        String summary = truncate(post.getContent(), 120);
        boolean isAlumni = !myCampusName.isEmpty() && isSameCampus(post.getAuthorId(), myCampusName);

        return new PostSummaryView(
                post.getId(),
                null, // title 字段在 Post 实体中不存在
                summary,
                author,
                post.getCategory().name(),
                tags,
                post.getLikesCount(),
                post.getCommentsCount(),
                post.getShareCount(),
                post.getCreatedAt().toString(),
                post.getLikesCount() >= 50,
                isAlumni
        );
    }

    /**
     * 将 Post 实体转换为 PostDetailView。
     * 根据当前用户 ID 判断 isLiked 和 isAuthor 状态。
     */
    private PostDetailView toPostDetailView(Post post, Long currentUserId) {
        PostAuthorView author = getPostAuthorView(post.getAuthorId());
        List<String> tags = parseJsonToList(post.getTags());
        List<String> images = parseJsonToList(post.getImages());

        // 判断当前用户是否已点赞
        boolean isLiked = false;
        if (currentUserId != null) {
            isLiked = postLikeRepository.existsByUserIdAndPostId(currentUserId, post.getId());
        }

        // 判断当前用户是否为帖子作者
        boolean isAuthor = currentUserId != null && currentUserId.equals(post.getAuthorId());

        // 判断是否为校友（简化实现：通过 campusName 判断）
        boolean isAlumni = false;
        if (currentUserId != null) {
            String currentUserCampus = userCampusProfileRepository.findByUserId(currentUserId)
                    .map(UserCampusProfile::getCampusName)
                    .orElse("");
            String authorCampus = userCampusProfileRepository.findByUserId(post.getAuthorId())
                    .map(UserCampusProfile::getCampusName)
                    .orElse("");
            isAlumni = !currentUserCampus.isBlank() && currentUserCampus.equals(authorCampus);
        }

        return new PostDetailView(
                post.getId(),
                null, // title 字段在 Post 实体中不存在
                post.getContent(),
                author,
                post.getCategory().name(),
                tags,
                images,
                post.getLikesCount(),
                post.getCommentsCount(),
                post.getShareCount(),
                post.getCreatedAt().toString(),
                post.getUpdatedAt().toString(),
                isLiked,
                isAuthor,
                isAlumni
        );
    }

    /**
     * 将 Post 实体转换为 PostDetailView（无用户上下文版本）。
     */
    private PostDetailView toPostDetailView(Post post) {
        return toPostDetailView(post, null);
    }

    /**
     * 将 Comment 实体转换为 CommentItemView。
     */
    private CommentItemView toCommentItemView(Comment comment) {
        User author = userRepository.findById(comment.getAuthorId()).orElse(null);
        CommentAuthorView authorView = new CommentAuthorView(
                comment.getAuthorId(),
                author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER,
                author != null ? author.getAvatarUrl() : null
        );

        return new CommentItemView(
                comment.getId(),
                comment.getPost().getId(),
                null, // parentId
                authorView,
                comment.getContent(),
                0, // likeCount
                comment.getCreatedAt().toString(),
                false, // isAuthor
                null  // replyTo
        );
    }

    /**
     * 获取帖子作者视图。
     */
    private PostAuthorView getPostAuthorView(Long authorId) {
        User author = userRepository.findById(authorId).orElse(null);
        String nickname = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = author != null ? author.getAvatarUrl() : null;
        String campusName = userCampusProfileRepository.findByUserId(authorId)
                .map(UserCampusProfile::getCampusName)
                .orElse("");

        return new PostAuthorView(authorId, nickname, avatarUrl, campusName);
    }

    /**
     * 将 JSON 字符串解析为 List。
     */
    private List<String> parseJsonToList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    /**
     * 将 List 序列化为 JSON 字符串。
     */
    private String toJsonString(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /**
     * 截断字符串。
     */
    private static String truncate(String text, int maxLen) {
        if (text == null) return null;
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }

    /**
     * 过滤标签列表中的敏感词。
     * 对每个标签进行敏感词过滤，移除非空过滤结果。
     *
     * @param tags   原始标签列表（可为 null）
     * @param userId 用户 ID（用于日志记录）
     * @return 过滤后的标签列表
     */
    private List<String> filterTagList(List<String> tags, Long userId) {
        if (tags == null || tags.isEmpty()) {
            return tags;
        }
        List<String> filtered = new ArrayList<>();
        for (String tag : tags) {
            String filteredTag = sensitiveWordFilter.filterWithLog(tag, userId, "POST_TAG");
            if (filteredTag != null && !filteredTag.isBlank()) {
                filtered.add(filteredTag);
            }
        }
        return filtered;
    }

    // ---- 相似作者推荐 ----

    /**
     * 获取与帖子作者相似的推荐用户。
     * 基于兴趣标签重叠度和同校关系计算相似度分数，推荐 1-2 位最相似的用户。
     * 排除已关注的用户和当前用户自身。
     *
     * @param postId 帖子 ID
     * @param userId 当前用户 ID
     * @return 相似作者推荐响应
     */
    @Override
    @Transactional(readOnly = true)
    public SimilarAuthorsResponse getSimilarAuthors(Long postId, Long userId) {
        if (postId == null || userId == null) {
            throw new IllegalArgumentException("postId and userId are required");
        }

        // 1. 查找帖子，获取帖子作者
        Post post = findPostOrThrow(postId);
        Long postAuthorId = post.getAuthorId();

        // 2. 获取帖子作者的校区和兴趣标签
        String authorCampus = userCampusProfileRepository.findByUserId(postAuthorId)
                .map(UserCampusProfile::getCampusName)
                .orElse("");

        List<String> authorInterests = userBasicProfileRepository.findByUserId(postAuthorId)
                .map(UserBasicProfile::getInterestTags)
                .map(this::parseJsonToList)
                .orElse(List.of());

        // 3. 获取当前用户已关注的用户ID列表（用于排除）
        List<Long> followedUserIds = userFollowRepository.findByFollowerId(userId).stream()
                .map(UserFollow::getFollowingId)
                .toList();

        // 4. 获取所有用户，计算相似度分数
        List<User> allUsers = userRepository.findAll();

        // 按相似度评分排序的候选列表
        record CandidateScore(Long candidateId, int score) {}

        List<CandidateScore> candidates = new ArrayList<>();
        for (User candidate : allUsers) {
            Long candidateId = candidate.getId();

            // 排除：帖子作者自身、当前用户自身、已关注的用户
            if (candidateId.equals(postAuthorId)
                    || candidateId.equals(userId)
                    || followedUserIds.contains(candidateId)) {
                continue;
            }

            int score = 0;

            // 同校加分
            boolean isSameCampus = userCampusProfileRepository.findByUserId(candidateId)
                    .map(cp -> authorCampus.equals(cp.getCampusName()))
                    .orElse(false);
            if (isSameCampus) {
                score += 1;
            }

            // 兴趣标签重叠加分
            List<String> candidateInterests = userBasicProfileRepository.findByUserId(candidateId)
                    .map(UserBasicProfile::getInterestTags)
                    .map(this::parseJsonToList)
                    .orElse(List.of());

            long commonInterestCount = candidateInterests.stream()
                    .filter(authorInterests::contains)
                    .count();
            score += (int) commonInterestCount;

            // 只有有相似度（同校或有共同兴趣）的用户才纳入候选
            if (score > 0) {
                candidates.add(new CandidateScore(candidateId, score));
            }
        }

        // 5. 按分数降序排列，取前 2 位
        List<SimilarAuthorView> similarAuthors = candidates.stream()
                .sorted((a, b) -> Integer.compare(b.score(), a.score()))
                .limit(2)
                .map(cs -> buildSimilarAuthorView(cs.candidateId(), authorCampus, authorInterests, userId))
                .toList();

        return new SimilarAuthorsResponse(similarAuthors);
    }

    /**
     * 构建相似作者视图。
     *
     * @param candidateId     候选用户 ID
     * @param authorCampus    帖子作者的校区名称
     * @param authorInterests 帖子作者的兴趣标签列表
     * @param currentUserId   当前用户 ID
     * @return 相似作者视图
     */
    private SimilarAuthorView buildSimilarAuthorView(
            Long candidateId, String authorCampus,
            List<String> authorInterests, Long currentUserId) {

        User user = userRepository.findById(candidateId).orElse(null);
        String nickname = user != null ? user.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = user != null ? user.getAvatarUrl() : null;
        String headline = user != null ? user.getBio() : "";

        String candidateCampus = userCampusProfileRepository.findByUserId(candidateId)
                .map(UserCampusProfile::getCampusName)
                .orElse("");
        boolean isAlumni = !authorCampus.isEmpty() && authorCampus.equals(candidateCampus);

        // 计算共同兴趣标签
        List<String> candidateInterests = userBasicProfileRepository.findByUserId(candidateId)
                .map(UserBasicProfile::getInterestTags)
                .map(this::parseJsonToList)
                .orElse(List.of());
        List<String> commonInterests = candidateInterests.stream()
                .filter(authorInterests::contains)
                .toList();

        boolean isFollowed = userFollowRepository.existsByFollowerIdAndFollowingId(currentUserId, candidateId);

        return new SimilarAuthorView(
                candidateId, nickname, avatarUrl,
                candidateCampus, headline, isAlumni,
                commonInterests, isFollowed
        );
    }
}
