package com.campuslove.api.village;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostFavoriteRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

/**
 * 村口帖子视图转换器（Task 4.2.2 拆分，Task 4.2 进一步抽取）。
 *
 * <p>职责：将 {@link Post} / {@link Comment} 等实体转换为前端所需的 View 对象
 *（{@link PostSummaryView} / {@link PostDetailView} / {@link CommentItemView} /
 * {@link PostAuthorView} / {@link SimilarAuthorView}），并组装作者信息、
 * 点赞状态、同校判断等展示字段。</p>
 *
 * <p>从 {@link VillageQueryService} 抽离，避免查询服务承担过多视图组装职责。
 * 该组件不持有事务，所有方法均为纯读操作。</p>
 */
@Profile("real")
@Component
public class VillageViewMapper {

    /** 热门帖子点赞阈值（FIN-00018 修复：抽为常量，原 toPostSummaryView 中硬编码 50） */
    static final int HOT_POST_THRESHOLD = 50;

    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final PostLikeRepository postLikeRepository;
    /**
     * 2026-08-08 论坛互动真实化：帖子收藏 Repository（收藏数与已收藏判断）。
     */
    private final PostFavoriteRepository postFavoriteRepository;
    /**
     * 2026-08-08 论坛互动真实化：评论点赞 Repository（评论点赞数与已点赞判断）。
     */
    private final CommentLikeRepository commentLikeRepository;
    private final ObjectMapper objectMapper;
    /**
     * 2026-08-09 帖子关联活动 + 列表评论预览：评论/活动 Repository（最新评论预览、活动摘要单查）。
     */
    private final CommentRepository commentRepository;
    private final ActivityRepository activityRepository;

    public VillageViewMapper(
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            PostLikeRepository postLikeRepository,
            PostFavoriteRepository postFavoriteRepository,
            CommentLikeRepository commentLikeRepository,
            ObjectMapper objectMapper,
            CommentRepository commentRepository,
            ActivityRepository activityRepository) {
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.postLikeRepository = postLikeRepository;
        this.postFavoriteRepository = postFavoriteRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.objectMapper = objectMapper;
        this.commentRepository = commentRepository;
        this.activityRepository = activityRepository;
    }

    PostSummaryView toPostSummaryView(Post post) {
        return toPostSummaryView(post, "");
    }

    PostSummaryView toPostSummaryView(Post post, String myCampusName) {
        return toPostSummaryView(post, myCampusName, java.util.Collections.emptySet());
    }

    /**
     * 单条帖子摘要视图（带关注上下文，Phase Feedback3 P2.5）。
     *
     * @param post           帖子
     * @param myCampusName   当前用户校区（用于 isAlumni）
     * @param followedUserIds 当前用户关注的作者 ID 集合（可为空，isFollowed 置 false）
     */
    PostSummaryView toPostSummaryView(Post post, String myCampusName,
                                      java.util.Set<Long> followedUserIds) {
        // 单条转换：兼容单帖场景（如帖子详情、首页热门），每次 2 次查询可接受
        PostAuthorView author = getPostAuthorView(post.getAuthorId());
        List<String> tags = parseJsonToList(post.getTags());
        String summary = truncate(post.getContent(), 120);
        boolean isAlumni = !myCampusName.isEmpty() && isSameCampus(post.getAuthorId(), myCampusName);
        boolean isFollowed = followedUserIds != null && followedUserIds.contains(post.getAuthorId());
        // 2026-08-08 论坛互动真实化：收藏数与已收藏状态（单帖场景单查可接受）
        int favoriteCount = (int) postFavoriteRepository.countByPostId(post.getId());
        boolean isFavorite = false;
        if (SecurityUtils.isAuthenticated()) {
            isFavorite = postFavoriteRepository.existsByUserIdAndPostId(
                    SecurityUtils.getCurrentUserId(), post.getId());
        }
        // 2026-08-09 帖子关联活动 + 评论预览（单帖场景单查可接受）
        ActivitySummaryView activity = loadActivitySummary(post.getActivityId());
        List<CommentPreviewView> recentComments = loadRecentCommentPreviews(post.getId());
        return new PostSummaryView(post.getId(), post.getTitle(), summary, author, post.getCategory().name(),
                tags, post.getLikesCount(), post.getCommentsCount(), post.getShareCount(),
                post.getCreatedAt().toString(), post.getLikesCount() >= HOT_POST_THRESHOLD, isAlumni,
                isFollowed, favoriteCount, isFavorite, post.getViewCount(),
                post.getActivityId(), activity, Boolean.TRUE.equals(post.getIsPinned()), recentComments);
    }

    /**
     * 批量转换帖子摘要视图（FIN-00019 N+1 修复）。
     *
     * <p>列表场景（帖子列表/同校流）一次性预加载作者与校区资料，
     * 将原本每帖 2 次查询（findById + findByUserId）压缩为 3 次批量查询，
     * 避免 N+1。</p>
     *
     * @param posts     帖子列表
     * @param myCampusName 当前用户校区（用于 isAlumni 判断，可为空字符串）
     * @param authorMap 作者 User 批量映射（authorId -> User）
     * @param campusMap 作者校区资料批量映射（userId -> UserCampusProfile）
     * @return 帖子摘要视图列表
     */
    List<PostSummaryView> toPostSummaryViews(List<Post> posts, String myCampusName,
                                              Map<Long, User> authorMap,
                                              Map<Long, UserCampusProfile> campusMap) {
        return toPostSummaryViews(posts, myCampusName, authorMap, campusMap,
                java.util.Collections.emptySet(), java.util.Collections.emptyMap(),
                java.util.Collections.emptyMap());
    }

    /**
     * 批量转换帖子摘要视图（带关注上下文，Phase Feedback3 P2.5）。
     *
     * <p>2026-08-09 扩展：activityMap / recentCommentsByPost 由调用方（VillageQueryService）
     * 批量预加载传入（防 N+1）；为空 Map 时对应字段按 null / 空列表兜底。</p>
     *
     * @param followedUserIds 当前用户关注的作者 ID 集合（为空时所有帖子 isFollowed=false）
     * @param activityMap     关联活动批量映射（activityId -> ActivitySummaryView，可为空 Map）
     * @param recentCommentsByPost 最新评论预览批量映射（postId -> List<CommentPreviewView>，可为空 Map）
     */
    List<PostSummaryView> toPostSummaryViews(List<Post> posts, String myCampusName,
                                              Map<Long, User> authorMap,
                                              Map<Long, UserCampusProfile> campusMap,
                                              java.util.Set<Long> followedUserIds,
                                              Map<Long, ActivitySummaryView> activityMap,
                                              Map<Long, List<CommentPreviewView>> recentCommentsByPost) {
        // P1-16：批量预加载作者基础资料（一次查询），避免逐帖查库（N+1），
        // 供 age/education 字段映射使用
        List<Long> authorIds = posts.stream()
                .map(Post::getAuthorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, UserBasicProfile> basicProfileMap = authorIds.isEmpty()
                ? java.util.Collections.emptyMap()
                : userBasicProfileRepository.findByUserIdIn(authorIds).stream()
                        .collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p, (a, b) -> a));
        // 2026-08-08 论坛互动真实化：批量预加载收藏数与当前用户已收藏集合（防 N+1）
        List<Long> postIds = posts.stream().map(Post::getId).filter(Objects::nonNull).toList();
        Map<Long, Integer> favoriteCountMap = postIds.isEmpty() ? java.util.Collections.emptyMap()
                : postFavoriteRepository.countByPostIds(postIds).stream()
                        .collect(Collectors.toMap(r -> (Long) r[0], r -> ((Number) r[1]).intValue()));
        Set<Long> favoritedPostIds;
        if (postIds.isEmpty() || !SecurityUtils.isAuthenticated()) {
            favoritedPostIds = java.util.Collections.emptySet();
        } else {
            favoritedPostIds = Set.copyOf(postFavoriteRepository
                    .findPostIdsByUserIdAndPostIdIn(SecurityUtils.getCurrentUserId(), postIds));
        }
        return posts.stream()
                .map(post -> toPostSummaryView(post, myCampusName, authorMap, campusMap,
                        basicProfileMap, followedUserIds, favoriteCountMap, favoritedPostIds,
                        activityMap, recentCommentsByPost))
                .toList();
    }

    /**
     * 批量转换单条帖子摘要视图（预加载数据版，供 {@link #toPostSummaryViews} 内部使用）。
     *
     * @param favoriteCountMap 收藏数批量预加载 Map（postId -> count，可为空则按 0 处理）
     * @param favoritedPostIds 当前用户已收藏的帖子 ID 集合（可为空则全部 false）
     * @param activityMap      关联活动批量映射（activityId -> ActivitySummaryView，可为空 Map）
     * @param recentCommentsByPost 最新评论预览批量映射（postId -> List<CommentPreviewView>，可为空 Map）
     */
    private PostSummaryView toPostSummaryView(Post post, String myCampusName,
                                              Map<Long, User> authorMap,
                                              Map<Long, UserCampusProfile> campusMap,
                                              Map<Long, UserBasicProfile> basicProfileMap,
                                              java.util.Set<Long> followedUserIds,
                                              Map<Long, Integer> favoriteCountMap,
                                              Set<Long> favoritedPostIds,
                                              Map<Long, ActivitySummaryView> activityMap,
                                              Map<Long, List<CommentPreviewView>> recentCommentsByPost) {
        User author = authorMap != null ? authorMap.get(post.getAuthorId()) : null;
        String nickname = author != null && author.getNickname() != null
                ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = author != null ? author.getAvatarUrl() : null;
        String campusName = "";
        String city = null;
        if (campusMap != null) {
            UserCampusProfile cp = campusMap.get(post.getAuthorId());
            if (cp != null && cp.getCampusName() != null) {
                campusName = cp.getCampusName();
            }
            if (cp != null && cp.getCityName() != null) {
                city = cp.getCityName();
            }
        }
        // P1-16：作者年龄/学历来自基本资料（批量预加载，无 N+1）
        UserBasicProfile bp = basicProfileMap != null ? basicProfileMap.get(post.getAuthorId()) : null;
        Integer age = bp != null
                ? PostAuthorView.deriveAgeFromGradeLabel(bp.getGradeLabel()) : null;
        String education = bp != null ? bp.getEducationLevel() : null;
        PostAuthorView authorView = new PostAuthorView(
                post.getAuthorId(), nickname, avatarUrl, campusName, age, city, education);
        List<String> tags = parseJsonToList(post.getTags());
        String summary = truncate(post.getContent(), 120);
        boolean isAlumni = !myCampusName.isEmpty() && myCampusName.equals(campusName);
        boolean isFollowed = followedUserIds != null && followedUserIds.contains(post.getAuthorId());
        // 2026-08-08 论坛互动真实化：收藏数/已收藏状态（批量预加载 Map，无 N+1）
        int favoriteCount = favoriteCountMap != null
                ? favoriteCountMap.getOrDefault(post.getId(), 0) : 0;
        boolean isFavorite = favoritedPostIds != null && favoritedPostIds.contains(post.getId());
        // 2026-08-09 帖子关联活动 + 评论预览（批量预加载 Map，无 N+1；空 Map 按 null/空列表兜底）
        ActivitySummaryView activity = activityMap != null ? activityMap.get(post.getActivityId()) : null;
        List<CommentPreviewView> recentComments = recentCommentsByPost != null
                ? recentCommentsByPost.getOrDefault(post.getId(), List.of()) : List.of();
        return new PostSummaryView(post.getId(), post.getTitle(), summary, authorView, post.getCategory().name(),
                tags, post.getLikesCount(), post.getCommentsCount(), post.getShareCount(),
                post.getCreatedAt().toString(), post.getLikesCount() >= HOT_POST_THRESHOLD, isAlumni,
                isFollowed, favoriteCount, isFavorite, post.getViewCount(),
                post.getActivityId(), activity, Boolean.TRUE.equals(post.getIsPinned()), recentComments);
    }

    PostDetailView toPostDetailView(Post post, Long currentUserId) {
        PostAuthorView author = getPostAuthorView(post.getAuthorId());
        List<String> tags = parseJsonToList(post.getTags());
        List<String> images = parseJsonToList(post.getImages());
        boolean isLiked = false;
        if (currentUserId != null) {
            isLiked = postLikeRepository.existsByUserIdAndPostId(currentUserId, post.getId());
        }
        boolean isAuthor = currentUserId != null && currentUserId.equals(post.getAuthorId());
        boolean isAlumni = false;
        if (currentUserId != null) {
            String currentUserCampus = userCampusProfileRepository.findByUserId(currentUserId)
                    .map(UserCampusProfile::getCampusName).orElse("");
            String authorCampus = userCampusProfileRepository.findByUserId(post.getAuthorId())
                    .map(UserCampusProfile::getCampusName).orElse("");
            isAlumni = !currentUserCampus.isBlank() && currentUserCampus.equals(authorCampus);
        }
        // 2026-08-08 论坛互动真实化：收藏数/已收藏状态（详情单帖，单查可接受）
        int favoriteCount = (int) postFavoriteRepository.countByPostId(post.getId());
        boolean isFavorite = currentUserId != null
                && postFavoriteRepository.existsByUserIdAndPostId(currentUserId, post.getId());
        // 2026-08-09 帖子关联活动：详情单查活动摘要（无关联则为 null）
        ActivitySummaryView activity = loadActivitySummary(post.getActivityId());
        return new PostDetailView(post.getId(), post.getTitle(), post.getContent(), author,
                post.getCategory().name(), tags, images, post.getLikesCount(),
                post.getCommentsCount(), post.getShareCount(), post.getCreatedAt().toString(),
                post.getUpdatedAt().toString(), isLiked, isAuthor, isAlumni,
                favoriteCount, isFavorite, post.getViewCount(),
                post.getActivityId(), activity);
    }

    PostDetailView toPostDetailView(Post post) {
        return toPostDetailView(post, null);
    }

    CommentItemView toCommentItemView(Comment comment) {
        // 2026-08-08：点赞数真实统计（单查）；isAuthor/isLiked 无当前用户上下文时 false
        int likeCount = (int) commentLikeRepository.countByCommentId(comment.getId());
        return toCommentItemView(comment, null, null, java.util.List.of(), likeCount, false);
    }

    CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap) {
        return toCommentItemView(comment, authorMap, null, java.util.List.of());
    }

    /**
     * P1-02 / A-12 楼中楼：转换为评论项视图（带回复对象昵称与楼中楼回复列表）。
     * 2026-08-08：likeCount 真实统计、isLiked 单查（无 currentUserId 上下文时 false）。
     *
     * @param comment  评论实体
     * @param authorMap 作者批量预加载 Map
     * @param replyTo  回复对象昵称（楼中楼回复场景）
     * @param replies  楼中楼回复列表（根评论携带，子评论为空）
     */
    CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap,
                                      String replyTo, java.util.List<CommentItemView> replies) {
        int likeCount = (int) commentLikeRepository.countByCommentId(comment.getId());
        return toCommentItemView(comment, authorMap, replyTo, replies, likeCount, false);
    }

    /**
     * 批量预加载版评论项视图（2026-08-08 评论区点赞数真实化，防 N+1）。
     *
     * <p>评论区列表场景（根评论 + 楼中楼回复）一次性批量查询点赞数与已点赞集合，
     * 再逐条组装，避免每条评论 2 次单查。</p>
     *
     * @param comment   评论实体
     * @param authorMap 作者批量预加载 Map
     * @param replyTo   回复对象昵称（楼中楼回复场景）
     * @param replies   楼中楼回复列表（根评论携带，子评论为空）
     * @param currentUserId 当前用户 ID（null 时 isLiked=false）
     * @param likeCountMap  评论点赞数批量预加载 Map（commentId -> count）
     * @param likedCommentIds 当前用户已点赞的评论 ID 集合
     */
    CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap,
                                      String replyTo, java.util.List<CommentItemView> replies,
                                      Long currentUserId, Map<Long, Integer> likeCountMap,
                                      Set<Long> likedCommentIds) {
        int likeCount = likeCountMap != null
                ? likeCountMap.getOrDefault(comment.getId(), 0)
                : (int) commentLikeRepository.countByCommentId(comment.getId());
        boolean isLiked = currentUserId != null
                && (likedCommentIds != null
                        ? likedCommentIds.contains(comment.getId())
                        : commentLikeRepository.existsByUserIdAndCommentId(currentUserId, comment.getId()));
        return toCommentItemView(comment, authorMap, replyTo, replies, likeCount, isLiked);
    }

    /**
     * 最终组装版评论项视图。
     */
    private CommentItemView toCommentItemView(Comment comment, Map<Long, User> authorMap,
                                              String replyTo, java.util.List<CommentItemView> replies,
                                              int likeCount, boolean isLiked) {
        User author = authorMap != null ? authorMap.get(comment.getAuthorId()) : null;
        CommentAuthorView authorView = new CommentAuthorView(comment.getAuthorId(),
                author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER,
                author != null ? author.getAvatarUrl() : null);
        return new CommentItemView(comment.getId(), comment.getPost().getId(), comment.getParentId(), authorView,
                comment.getContent(), likeCount, comment.getCreatedAt().toString(), false, isLiked,
                replyTo, replies != null ? replies : java.util.List.of());
    }

    PostAuthorView getPostAuthorView(Long authorId) {
        User author = userRepository.findById(authorId).orElse(null);
        String nickname = author != null ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = author != null ? author.getAvatarUrl() : null;
        // P1-16：作者城市来自校园资料，年龄/学历来自基本资料（单条场景，直接查询）
        UserCampusProfile campusProfile = userCampusProfileRepository.findByUserId(authorId).orElse(null);
        String campusName = campusProfile != null && campusProfile.getCampusName() != null
                ? campusProfile.getCampusName() : "";
        String city = campusProfile != null ? campusProfile.getCityName() : null;
        UserBasicProfile basicProfile = userBasicProfileRepository.findByUserId(authorId).orElse(null);
        Integer age = basicProfile != null
                ? PostAuthorView.deriveAgeFromGradeLabel(basicProfile.getGradeLabel()) : null;
        String education = basicProfile != null ? basicProfile.getEducationLevel() : null;
        return new PostAuthorView(authorId, nickname, avatarUrl, campusName, age, city, education);
    }

    SimilarAuthorView buildSimilarAuthorView(Long candidateId, User user,
                                              UserCampusProfile campusProfile, UserBasicProfile basicProfile,
                                              String authorCampus, List<String> authorInterests,
                                              boolean isFollowed) {
        String nickname = user != null ? user.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = user != null ? user.getAvatarUrl() : null;
        String headline = user != null ? user.getBio() : "";
        String candidateCampus = campusProfile != null ? campusProfile.getCampusName() : "";
        boolean isAlumni = !authorCampus.isEmpty() && authorCampus.equals(candidateCampus);
        List<String> candidateInterests = basicProfile != null
                ? parseJsonToList(basicProfile.getInterestTags()) : List.of();
        List<String> commonInterests = candidateInterests.stream().filter(authorInterests::contains).toList();
        return new SimilarAuthorView(candidateId, nickname, avatarUrl, candidateCampus,
                headline, isAlumni, commonInterests, isFollowed);
    }

    /** 判断给定作者与当前用户的校区是否一致。 */
    boolean isSameCampus(Long authorId, String myCampusName) {
        if (myCampusName == null || myCampusName.isEmpty()) return false;
        return userCampusProfileRepository.findByUserId(authorId)
                .map(campus -> myCampusName.equals(campus.getCampusName())).orElse(false);
    }

    // ---- 2026-08-09 帖子关联活动 + 列表评论预览（单帖场景辅助） ----

    /**
     * 加载活动摘要视图（单帖场景单查可接受；无关联或活动不存在返回 null）。
     */
    private ActivitySummaryView loadActivitySummary(Long activityId) {
        if (activityId == null) {
            return null;
        }
        return activityRepository.findById(activityId)
                .map(this::toActivitySummaryView)
                .orElse(null);
    }

    /**
     * 将活动实体转换为活动摘要视图（coverImage 实体暂无字段，恒 null 兜底）。
     */
    ActivitySummaryView toActivitySummaryView(Activity activity) {
        return new ActivitySummaryView(
                activity.getId(),
                activity.getTitle(),
                activity.getLocation(),
                activity.getScheduleText(),
                activity.getActivityDate() != null ? activity.getActivityDate().toString() : null,
                activity.getStatus() != null ? activity.getStatus().name() : null,
                activity.getEnrollmentCount() != null ? activity.getEnrollmentCount() : 0,
                null);
    }

    /**
     * 加载单帖最新 2 条根评论预览（单帖场景单查可接受）。
     */
    private List<CommentPreviewView> loadRecentCommentPreviews(Long postId) {
        if (postId == null) {
            return List.of();
        }
        List<Comment> roots = commentRepository
                .findByPostIdAndParentIdIsNullOrderByCreatedAtDesc(postId, PageRequest.of(0, 2))
                .getContent();
        return buildCommentPreviews(roots);
    }

    /**
     * 组装评论预览视图列表（作者昵称/头像批量预加载 + 楼中楼回复数批量统计，防 N+1）。
     *
     * @param roots 根评论列表（最新在前）
     */
    List<CommentPreviewView> buildCommentPreviews(List<Comment> roots) {
        if (roots == null || roots.isEmpty()) {
            return List.of();
        }
        List<Long> rootIds = roots.stream().map(Comment::getId).toList();
        Map<Long, Integer> replyCountMap = rootIds.isEmpty() ? java.util.Collections.emptyMap()
                : commentRepository.countByParentIdIn(rootIds).stream()
                        .collect(Collectors.toMap(r -> (Long) r[0], r -> ((Number) r[1]).intValue()));
        List<Long> authorIds = roots.stream().map(Comment::getAuthorId)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, User> authorMap = authorIds.isEmpty() ? java.util.Collections.emptyMap()
                : userRepository.findAllById(authorIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        return roots.stream()
                .map(c -> {
                    User author = authorMap.get(c.getAuthorId());
                    String nickname = author != null && author.getNickname() != null
                            ? author.getNickname() : DisplayConstants.UNKNOWN_USER;
                    return new CommentPreviewView(c.getId(),
                            new CommentAuthorView(c.getAuthorId(), nickname,
                                    author != null ? author.getAvatarUrl() : null),
                            c.getContent(),
                            c.getCreatedAt().toString(),
                            replyCountMap.getOrDefault(c.getId(), 0));
                })
                .toList();
    }

    List<String> parseJsonToList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    static String truncate(String text, int maxLen) {
        if (text == null) return null;
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
