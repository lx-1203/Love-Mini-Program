package com.campuslove.api.village;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.PostCategoryEntity;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostCategoryRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 村口帖子查询组件（Task 4.2.2 拆分）。
 *
 * <p>职责：所有只读查询路径，包括：</p>
 * <ul>
 *   <li>帖子列表（discover / city / following / campus / 分类）</li>
 *   <li>帖子详情、评论列表、分类列表、热门帖子</li>
 *   <li>同校动态流聚合（帖子 + 活动 + 话题）</li>
 *   <li>相似作者推荐</li>
 *   <li>视图转换与辅助方法（toPostSummaryView / toPostDetailView / toCommentItemView 等）</li>
 * </ul>
 *
 * <p>不写入任何数据；写操作由 {@link VillagePostService}（发布）与
 * {@link VillageInteractionService}（点赞/评论/转发）负责。</p>
 */
@Profile("real")
@Component
public class VillageQueryService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostCategoryRepository postCategoryRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserFollowRepository userFollowRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final ObjectMapper objectMapper;
    private final ActivityRepository activityRepository;
    private final CircleTopicRepository circleTopicRepository;
    private final VillageViewMapper viewMapper;

    public VillageQueryService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostLikeRepository postLikeRepository,
            PostCategoryRepository postCategoryRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserFollowRepository userFollowRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            ObjectMapper objectMapper,
            ActivityRepository activityRepository,
            CircleTopicRepository circleTopicRepository,
            VillageViewMapper viewMapper) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postLikeRepository = postLikeRepository;
        this.postCategoryRepository = postCategoryRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userFollowRepository = userFollowRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.objectMapper = objectMapper;
        this.activityRepository = activityRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.viewMapper = viewMapper;
    }

    // ---- 帖子列表 ----

    @Transactional(readOnly = true)
    public PostListResponse getPosts(String category, String tag, String sortBy, int page, int pageSize, Long userId) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
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
        List<PostSummaryView> items = postPage.getContent().stream().map(this::toPostSummaryView).toList();
        return new PostListResponse(items, (int) postPage.getTotalElements(), page, pageSize);
    }

    @Transactional(readOnly = true)
    public PostListResponse getPosts(String tab, String category, Long userId, Pageable pageable) {
        String effectiveTab = tab != null ? tab : "discover";
        return switch (effectiveTab) {
            case "city" -> getCityPosts(category, userId, pageable);
            case "following" -> getFollowingPosts(category, userId, pageable);
            default -> getDiscoverPosts(category, pageable);
        };
    }

    @Transactional(readOnly = true)
    public PostDetailView getPost(Long postId) {
        Post post = findPostOrThrow(postId);
        Long currentUserId = null;
        try {
            currentUserId = SecurityUtils.getCurrentUserId();
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized ignored) {
            // Task 10（FIN-00157）复核：此处 catch HttpClientErrorException.Unauthorized 为
            // HTTP 鉴权异常（SecurityUtils 从 SecurityContext 读取未认证抛出），非 DB 异常；
            // 触发时 findPostOrThrow（DB 读）已完成且无写操作，不存在"事务部分提交"风险；
            // 按设计意图允许未认证用户匿名查看帖子（isLiked/isAuthor 均为 false），
            // 按 spec SubTask 10.6 提示"若是只读查询则评估是否真的需要事务"——本方法为只读查询，
            // 无需 setRollbackOnly 或重新抛出。
        }
        return toPostDetailView(post, currentUserId);
    }

    @Transactional(readOnly = true)
    public CommentListResponse getComments(Long postId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        // 修复 N+1：通过 @EntityGraph 预加载 post + 批量预加载评论作者
        Page<Comment> commentPage = commentRepository.findWithPostByPostIdOrderByCreatedAtDesc(postId, pageable);
        List<Long> authorIds = commentPage.getContent().stream()
                .map(Comment::getAuthorId).distinct().toList();
        Map<Long, User> authorMap = authorIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(authorIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        List<CommentItemView> items = commentPage.getContent().stream()
                .map(comment -> toCommentItemView(comment, authorMap)).toList();
        return new CommentListResponse(items, (int) commentPage.getTotalElements(), page, pageSize);
    }

    @Transactional(readOnly = true)
    public List<PostCategoryView> getCategories() {
        List<PostCategoryEntity> categories = postCategoryRepository.findByIsActiveTrueOrderBySortOrderAsc();
        return categories.stream()
                .map(cat -> new PostCategoryView(cat.getId(), cat.getName(), cat.getCode(),
                        cat.getIcon(), cat.getSortOrder()))
                .toList();
    }

    @Cacheable(cacheNames = CacheNames.VILLAGE_HOT_POSTS, key = "'hot'")
    @Transactional(readOnly = true)
    public List<PostSummaryView> listHotPosts() {
        Page<Post> postPage = postRepository.findByStatusOrderByLikesCountDesc(
                PostStatus.active, PageRequest.of(0, 20));
        return postPage.getContent().stream().map(this::toPostSummaryView).toList();
    }

    // ---- 同校动态流 ----

    @Transactional(readOnly = true)
    public CampusFeedView getCampusFeed(Long userId, int page, int size) {
        if (userId == null) throw new IllegalArgumentException("userId 不能为空");
        String campusName = userCampusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName).orElse("");
        List<PostSummaryView> posts = getCampusPosts(campusName);
        List<CampusActivityView> activities = getCampusActivities(campusName);
        List<CampusTopicView> topics = getCampusTopics();
        return new CampusFeedView(campusName, posts, activities, topics);
    }

    private PostListResponse getCampusCategoryPosts(Long userId, Pageable pageable) {
        if (userId == null) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        String myCampusName = userCampusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName).orElse("");
        if (myCampusName.isEmpty()) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        Page<Post> postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        List<Post> campusPosts = new ArrayList<>();
        for (Post post : postPage.getContent()) {
            if (isSameCampus(post.getAuthorId(), myCampusName)) campusPosts.add(post);
        }
        List<PostSummaryView> items = campusPosts.stream()
                .map(post -> toPostSummaryView(post, myCampusName)).toList();
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    private List<PostSummaryView> getCampusPosts(String campusName) {
        Page<Post> postPage = postRepository.findByStatusOrderByCreatedAtDesc(
                PostStatus.active, PageRequest.of(0, 50));
        List<Post> campusPosts = new ArrayList<>();
        for (Post post : postPage.getContent()) {
            if (campusPosts.size() >= 10) break;
            if (!campusName.isEmpty() && isSameCampus(post.getAuthorId(), campusName)) campusPosts.add(post);
        }
        return campusPosts.stream().map(post -> toPostSummaryView(post, campusName)).toList();
    }

    private List<CampusActivityView> getCampusActivities(String campusName) {
        if (campusName.isEmpty()) return List.of();
        Page<Activity> activityPage = activityRepository
                .findByCampusNameAndStatusOrderByActivityDateAsc(
                        campusName, ActivityStatus.upcoming, PageRequest.of(0, 5));
        return activityPage.getContent().stream()
                .map(activity -> new CampusActivityView(activity.getId(), activity.getTitle(),
                        activity.getScheduleText(), activity.getLocation(),
                        activity.getEnrollmentCount(), activity.getStatus().name()))
                .toList();
    }

    private List<CampusTopicView> getCampusTopics() {
        Page<CircleTopic> topicPage = circleTopicRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5));
        return topicPage.getContent().stream()
                .map(topic -> {
                    String authorName = userRepository.findById(topic.getAuthorId())
                            .map(User::getNickname).orElse(DisplayConstants.UNKNOWN_USER);
                    return new CampusTopicView(topic.getId(), topic.getCircle().getId(),
                            topic.getCircle().getName(), topic.getTitle(), authorName,
                            topic.getReplyCount() != null ? topic.getReplyCount() : 0,
                            topic.getCreatedAt().toString());
                }).toList();
    }

    private PostListResponse getDiscoverPosts(String category, Pageable pageable) {
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = PostCategory.valueOf(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }
        List<PostSummaryView> items = postPage.getContent().stream().map(this::toPostSummaryView).toList();
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    private PostListResponse getCityPosts(String category, Long userId, Pageable pageable) {
        final String myCampusName;
        if (userId != null) {
            myCampusName = userCampusProfileRepository.findByUserId(userId)
                    .map(UserCampusProfile::getCampusName).orElse("");
        } else {
            myCampusName = "";
        }
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = PostCategory.valueOf(category);
            postPage = postRepository.findByCategoryAndStatusOrderByCreatedAtDesc(postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByStatusOrderByCreatedAtDesc(PostStatus.active, pageable);
        }
        List<Post> allPosts = new ArrayList<>(postPage.getContent());
        if (!myCampusName.isEmpty()) {
            allPosts.sort((a, b) -> {
                boolean aSame = isSameCampus(a.getAuthorId(), myCampusName);
                boolean bSame = isSameCampus(b.getAuthorId(), myCampusName);
                if (aSame && !bSame) return -1;
                if (!aSame && bSame) return 1;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });
        }
        List<PostSummaryView> items = allPosts.stream()
                .map(post -> toPostSummaryView(post, myCampusName)).toList();
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    private PostListResponse getFollowingPosts(String category, Long userId, Pageable pageable) {
        if (userId == null) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        List<UserFollow> followingRelations = userFollowRepository.findByFollowerId(userId);
        List<Long> followingUserIds = followingRelations.stream().map(UserFollow::getFollowingId).toList();
        if (followingUserIds.isEmpty()) {
            return new PostListResponse(List.of(), 0, pageable.getPageNumber() + 1, pageable.getPageSize());
        }
        Page<Post> postPage;
        if (category != null && !"all".equals(category)) {
            PostCategory postCategory = PostCategory.valueOf(category);
            postPage = postRepository.findByAuthorIdInAndCategoryAndStatusOrderByCreatedAtDesc(
                    followingUserIds, postCategory, PostStatus.active, pageable);
        } else {
            postPage = postRepository.findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                    followingUserIds, PostStatus.active, pageable);
        }
        List<PostSummaryView> items = postPage.getContent().stream().map(this::toPostSummaryView).toList();
        return new PostListResponse(items, (int) postPage.getTotalElements(),
                pageable.getPageNumber() + 1, pageable.getPageSize());
    }

    // ---- 相似作者推荐 ----

    @Transactional(readOnly = true)
    public SimilarAuthorsResponse getSimilarAuthors(Long postId, Long userId) {
        if (postId == null || userId == null) {
            throw new IllegalArgumentException("postId and userId are required");
        }
        Post post = findPostOrThrow(postId);
        Long postAuthorId = post.getAuthorId();

        UserCampusProfile authorCampusProfile = userCampusProfileRepository.findByUserId(postAuthorId).orElse(null);
        String authorCampus = authorCampusProfile != null ? authorCampusProfile.getCampusName() : "";
        List<String> authorInterests = userBasicProfileRepository.findByUserId(postAuthorId)
                .map(UserBasicProfile::getInterestTags).map(this::parseJsonToList).orElse(List.of());

        Set<Long> followedUserIds = userFollowRepository.findByFollowerId(userId).stream()
                .map(UserFollow::getFollowingId).collect(Collectors.toSet());

        List<User> pagedUsers = userRepository.findAll(PageRequest.of(0, 50)).getContent();
        List<Long> candidateIds = pagedUsers.stream().map(User::getId)
                .filter(id -> !id.equals(postAuthorId) && !id.equals(userId) && !followedUserIds.contains(id))
                .toList();
        Map<Long, UserCampusProfile> campusProfileMap = userCampusProfileRepository.findByUserIdIn(candidateIds)
                .stream().collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p));
        Map<Long, UserBasicProfile> basicProfileMap = userBasicProfileRepository.findByUserIdIn(candidateIds)
                .stream().collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p));
        Map<Long, User> userMap = pagedUsers.stream().collect(Collectors.toMap(User::getId, u -> u));

        record CandidateScore(Long candidateId, int score) {}
        List<CandidateScore> candidates = new ArrayList<>();
        for (Long candidateId : candidateIds) {
            int score = 0;
            UserCampusProfile cp = campusProfileMap.get(candidateId);
            if (cp != null && !authorCampus.isEmpty() && authorCampus.equals(cp.getCampusName())) score += 1;
            UserBasicProfile bp = basicProfileMap.get(candidateId);
            if (bp != null) {
                List<String> candidateInterests = parseJsonToList(bp.getInterestTags());
                long commonCount = candidateInterests.stream().filter(authorInterests::contains).count();
                score += (int) commonCount;
            }
            if (score > 0) candidates.add(new CandidateScore(candidateId, score));
        }

        List<SimilarAuthorView> similarAuthors = candidates.stream()
                .sorted((a, b) -> Integer.compare(b.score(), a.score()))
                .limit(2)
                .map(cs -> viewMapper.buildSimilarAuthorView(cs.candidateId(), userMap.get(cs.candidateId()),
                        campusProfileMap.get(cs.candidateId()), basicProfileMap.get(cs.candidateId()),
                        authorCampus, authorInterests, followedUserIds.contains(cs.candidateId())))
                .toList();
        return new SimilarAuthorsResponse(similarAuthors);
    }

    // ---- 视图转换与辅助方法（委托至 VillageViewMapper，保留包级可见以兼容现有调用方） ----

    Post findPostOrThrow(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found: " + postId));
    }

    boolean isSameCampus(Long authorId, String myCampusName) {
        return viewMapper.isSameCampus(authorId, myCampusName);
    }

    PostSummaryView toPostSummaryView(Post post) {
        return viewMapper.toPostSummaryView(post);
    }

    PostSummaryView toPostSummaryView(Post post, String myCampusName) {
        return viewMapper.toPostSummaryView(post, myCampusName);
    }

    PostDetailView toPostDetailView(Post post, Long currentUserId) {
        return viewMapper.toPostDetailView(post, currentUserId);
    }

    PostDetailView toPostDetailView(Post post) {
        return viewMapper.toPostDetailView(post);
    }

    CommentItemView toCommentItemView(Comment comment) {
        return viewMapper.toCommentItemView(comment);
    }

    CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap) {
        return viewMapper.toCommentItemView(comment, authorMap);
    }

    PostAuthorView getPostAuthorView(Long authorId) {
        return viewMapper.getPostAuthorView(authorId);
    }

    List<String> parseJsonToList(String json) {
        return viewMapper.parseJsonToList(json);
    }

    String toJsonString(List<String> list) {
        if (list == null || list.isEmpty()) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    static String truncate(String text, int maxLen) {
        return VillageViewMapper.truncate(text, maxLen);
    }
}
