package com.campuslove.api.village;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.PostCategoryEntity;
import com.campuslove.api.entity.PostLike;
import com.campuslove.api.entity.PostShare;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.repository.CommentRepository;
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

    /** Phase 1 兼容：未集成 Spring Security 时的默认用户 ID */
    private static final Long DEFAULT_USER_ID = 1L;

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostShareRepository postShareRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostCategoryRepository postCategoryRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserFollowRepository userFollowRepository;
    private final ObjectMapper objectMapper;

    public RealVillageService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostShareRepository postShareRepository,
            PostLikeRepository postLikeRepository,
            PostCategoryRepository postCategoryRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserFollowRepository userFollowRepository,
            ObjectMapper objectMapper) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postShareRepository = postShareRepository;
        this.postLikeRepository = postLikeRepository;
        this.postCategoryRepository = postCategoryRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userFollowRepository = userFollowRepository;
        this.objectMapper = objectMapper;
    }

    // ---- Phase 1 兼容方法（委托给 Phase 2 实现，userId 由 Controller 传入） ----

    @Override
    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

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
        // Phase 1 兼容：当前无 Spring Security 上下文，使用默认用户 ID
        // Controller 已直接调用 Phase 2 的 likePost(userId, id)，此方法仅作接口兼容
        return likePost(SecurityUtils.getCurrentUserIdOrDefault(DEFAULT_USER_ID), id);
    }

    @Override
    @Transactional(readOnly = true)
    public CommentListResponse getComments(Long postId, int page, int pageSize) {
        List<Comment> allComments = commentRepository.findByPostIdOrderByCreatedAtDesc(postId);
        int from = (page - 1) * pageSize;
        int to = Math.min(from + pageSize, allComments.size());
        List<Comment> pageItems = from < allComments.size() ? allComments.subList(from, to) : List.of();

        List<CommentItemView> items = pageItems.stream()
                .map(this::toCommentItemView)
                .toList();

        return new CommentListResponse(items, allComments.size(), page, pageSize);
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
        return toPostDetailView(post);
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

        LocalDateTime now = LocalDateTime.now();
        Post post = new Post();
        post.setAuthorId(userId);
        post.setContent(content);
        post.setImages(toJsonString(images));
        post.setTags(toJsonString(tags));
        post.setCategory(category != null ? PostCategory.valueOf(category) : PostCategory.all);
        post.setLikesCount(0);
        post.setCommentsCount(0);
        post.setShareCount(0);
        post.setStatus(PostStatus.active);
        post.setCreatedAt(now);
        post.setUpdatedAt(now);

        postRepository.save(post);
        return toPostDetailView(post);
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
     */
    private PostDetailView toPostDetailView(Post post) {
        PostAuthorView author = getPostAuthorView(post.getAuthorId());
        List<String> tags = parseJsonToList(post.getTags());
        List<String> images = parseJsonToList(post.getImages());

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
                false,
                false,
                false
        );
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
}
