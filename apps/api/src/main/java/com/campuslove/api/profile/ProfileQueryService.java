package com.campuslove.api.profile;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.user.FollowUserView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 个人资料查询组件（Task 4.2.4 拆分）。
 *
 * <p>职责：所有只读查询路径，包括：</p>
 * <ul>
 *   <li>{@link #getBasicProfile()}：获取当前用户基本资料</li>
 *   <li>{@link #getCampusProfile()}：获取当前用户校园资料</li>
 *   <li>{@link #getScheduleProfile()}：获取当前用户日程资料</li>
 *   <li>{@link #getProfileStats()}：获取用户统计数据（关注/粉丝/获赞）</li>
 *   <li>{@link #getFollowers(Long)} / {@link #getFollowing(Long)}：粉丝与关注列表（批量预加载避免 N+1）</li>
 *   <li>{@link #isFollowing(Long, Long)}：查询关注关系</li>
 *   <li>资料完善度计算 {@link #calculateProfileCompletion(Long)}</li>
 *   <li>总点赞数计算 {@link #calculateTotalLikesCount(Long)}</li>
 *   <li>视图转换与 JSON 解析辅助方法（供 ProfileUpdateService 复用）</li>
 * </ul>
 *
 * <p>该组件不持久化任何状态，仅做读取与计算，便于单元测试与复用。
 * 公共方法使用 {@code @Transactional(readOnly = true)} 提示 JPA 走只读事务优化路径。</p>
 */
@Profile("real")
@Component
public class ProfileQueryService {

    private static final Logger log = LoggerFactory.getLogger(ProfileQueryService.class);

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final ObjectMapper objectMapper;
    private final CampusCertificationService campusCertificationService;
    /** JPA 实体管理器（FIN-00029 修复：批量点赞统计） */
    private final EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    public ProfileQueryService(
            UserRepository userRepository,
            UserFollowRepository userFollowRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            PostRepository postRepository,
            PostLikeRepository postLikeRepository,
            ObjectMapper objectMapper,
            CampusCertificationService campusCertificationService,
            EntityManager entityManager) {
        this.userRepository = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.postRepository = postRepository;
        this.postLikeRepository = postLikeRepository;
        this.objectMapper = objectMapper;
        this.campusCertificationService = campusCertificationService;
        this.entityManager = entityManager;
    }

    /**
     * 兼容旧测试的构造器（entityManager 为 null，批量统计回退原逻辑）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 EntityManager 的构造器。
     */
    @Deprecated
    public ProfileQueryService(
            UserRepository userRepository,
            UserFollowRepository userFollowRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            PostRepository postRepository,
            PostLikeRepository postLikeRepository,
            ObjectMapper objectMapper,
            CampusCertificationService campusCertificationService) {
        this(userRepository, userFollowRepository, userBasicProfileRepository,
                userCampusProfileRepository, userScheduleProfileRepository,
                postRepository, postLikeRepository, objectMapper,
                campusCertificationService, null);
    }

    // ---- 基本资料查询 ----

    /**
     * 获取当前用户的基本资料视图。
     * 若用户不存在抛 {@link IllegalStateException}；若无基本资料记录返回空 view。
     */
    @Transactional(readOnly = true)
    public BasicProfileView getBasicProfile() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        UserBasicProfile profile = userBasicProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> new UserBasicProfile());
        return toBasicProfileView(profile, user);
    }

    // ---- 校园资料查询 ----

    /**
     * 获取当前用户的校园资料视图。
     * 无记录时返回空字段 + draft 状态。
     */
    @Transactional(readOnly = true)
    public CampusProfileView getCampusProfile() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return userCampusProfileRepository.findByUserId(currentUserId)
                .map(profile -> new CampusProfileView(
                        profile.getCityName(),
                        profile.getCampusName(),
                        profile.getDepartmentName(),
                        profile.getVerificationStatus()))
                .orElseGet(() -> new CampusProfileView("", "", "", "draft"));
    }

    // ---- 日程资料查询 ----

    /**
     * 获取当前用户的日程资料视图。
     * 解析 JSON 字段为 List，解析失败时返回空列表。
     */
    @Transactional(readOnly = true)
    public ScheduleProfileView getScheduleProfile() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return userScheduleProfileRepository.findByUserId(currentUserId)
                .map(profile -> {
                    List<String> preferredTimeWindows = parseJsonToList(
                            profile.getPreferredTimeWindowJson(), new TypeReference<List<String>>() {});

                    List<ScheduleBlockView> courseBlocks = parseJsonToList(
                            profile.getCourseBlockJson(), new TypeReference<List<ScheduleBlockView>>() {});

                    return new ScheduleProfileView(
                            profile.getPreferredCampusArea(),
                            preferredTimeWindows,
                            courseBlocks);
                })
                .orElseGet(() -> new ScheduleProfileView("", List.of(), List.of()));
    }

    // ---- 用户统计 ----

    /**
     * 获取当前用户的统计数据（关注数 / 粉丝数 / 获赞数）。
     */
    @Transactional(readOnly = true)
    public ProfileStatsView getProfileStats() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));

        int likesCount = calculateTotalLikesCount(currentUserId);

        return new ProfileStatsView(
                user.getFollowingCount(),
                user.getFollowersCount(),
                likesCount);
    }

    // ---- 关注关系查询 ----

    /**
     * 获取指定用户的粉丝列表。
     * 批量预加载关注者用户信息，避免在循环中触发 N+1 查询（Task 2.2.1）。
     */
    @Transactional(readOnly = true)
    public List<FollowUserView> getFollowers(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        List<UserFollow> follows = userFollowRepository.findByFollowingId(userId);

        List<Long> followerIds = follows.stream()
                .map(UserFollow::getFollowerId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> followerMap = batchLoadUsers(followerIds);

        return follows.stream()
                .map(follow -> toFollowUserView(follow.getFollowerId(),
                        followerMap.get(follow.getFollowerId())))
                .toList();
    }

    /**
     * 获取指定用户的关注列表。
     * 批量预加载被关注用户信息，避免在循环中触发 N+1 查询（Task 2.2.1）。
     */
    @Transactional(readOnly = true)
    public List<FollowUserView> getFollowing(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        List<UserFollow> follows = userFollowRepository.findByFollowerId(userId);

        List<Long> followingIds = follows.stream()
                .map(UserFollow::getFollowingId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> followingMap = batchLoadUsers(followingIds);

        return follows.stream()
                .map(follow -> toFollowUserView(follow.getFollowingId(),
                        followingMap.get(follow.getFollowingId())))
                .toList();
    }

    /**
     * 查询当前用户是否关注了目标用户。
     * 任一参数为 null 时返回 false。
     */
    @Transactional(readOnly = true)
    public boolean isFollowing(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            return false;
        }
        return userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId);
    }

    // ---- 计算辅助方法 ----

    /**
     * 计算用户资料完善度百分比。
     * <ul>
     *   <li>有基本资料（nickname 非空）: +30%</li>
     *   <li>有校区资料（campusName 非空）: +30%</li>
     *   <li>有日程资料（preferredCampusArea 非空）: +20%</li>
     *   <li>有兴趣标签（interestTags 非空且非 []）: +20%</li>
     * </ul>
     * 最大 100%。
     */
    public int calculateProfileCompletion(Long userId) {
        int completion = 0;

        UserBasicProfile basicProfile = userBasicProfileRepository.findByUserId(userId).orElse(null);
        if (basicProfile != null && basicProfile.getNickname() != null
                && !basicProfile.getNickname().isBlank()) {
            completion += 30;
        }

        UserCampusProfile campusProfile = userCampusProfileRepository.findByUserId(userId).orElse(null);
        if (campusProfile != null && campusProfile.getCampusName() != null
                && !campusProfile.getCampusName().isBlank()) {
            completion += 30;
        }

        UserScheduleProfile scheduleProfile = userScheduleProfileRepository.findByUserId(userId).orElse(null);
        if (scheduleProfile != null && scheduleProfile.getPreferredCampusArea() != null
                && !scheduleProfile.getPreferredCampusArea().isBlank()) {
            completion += 20;
        }

        if (basicProfile != null && basicProfile.getInterestTags() != null
                && !basicProfile.getInterestTags().isBlank()
                && !"[]".equals(basicProfile.getInterestTags())) {
            completion += 20;
        }

        return Math.min(100, completion);
    }

    /**
     * 计算用户所有帖子的总点赞数。
     *
     * <p>FIN-00029 修复：原实现每帖一次 {@code countByPostId}（N+1），
     * 改为一次 IN 聚合查询后求和。</p>
     */
    public int calculateTotalLikesCount(Long userId) {
        List<Post> userPosts = postRepository.findByAuthorId(userId);
        if (userPosts.isEmpty()) {
            return 0;
        }
        if (entityManager == null) {
            // 兼容旧测试构造器（entityManager 为 null）：回退每帖一次 count 的原逻辑
            int totalLikes = 0;
            for (Post post : userPosts) {
                totalLikes += postLikeRepository.countByPostId(post.getId());
            }
            return totalLikes;
        }
        List<Long> postIds = userPosts.stream().map(Post::getId).toList();
        Long total = entityManager.createQuery(
                        "SELECT COUNT(l) FROM PostLike l WHERE l.postId IN :postIds", Long.class)
                .setParameter("postIds", postIds)
                .getSingleResult();
        return total != null ? total.intValue() : 0;
    }

    // ---- 视图转换与辅助方法（公开供 ProfileUpdateService 复用） ----

    /**
     * 将 UserBasicProfile + User 实体组装为 BasicProfileView。
     */
    public BasicProfileView toBasicProfileView(UserBasicProfile profile, User user) {
        String badgeLevel = campusCertificationService.getVerificationBadgeLevel(user.getId());
        int completion = user.getProfileCompletion() != null ? user.getProfileCompletion() : 0;
        return new BasicProfileView(
                profile.getNickname() != null ? profile.getNickname() : "",
                profile.getBio() != null ? profile.getBio() : "",
                profile.getGradeLabel() != null ? profile.getGradeLabel() : "",
                profile.getPronouns() != null ? profile.getPronouns() : "",
                profile.getHeight(),
                profile.getEducationLevel(),
                profile.getRelationshipStatus(),
                profile.getHometownProvince(),
                profile.getHometownCity(),
                profile.getFutureCity(),
                parseStringList(profile.getFuturePlanTags()),
                parseStringList(profile.getPhotoGallery()),
                profile.getHalfBodyPhotoUrl(),
                profile.getPersonalVideoUrl(),
                profile.getProfileBackgroundUrl(),
                completion,
                badgeLevel
        );
    }

    /**
     * 转换为 FollowUserView（user 为 null 时返回 unknown 占位）。
     */
    public FollowUserView toFollowUserView(Long userId, User user) {
        if (user == null) {
            return new FollowUserView(userId, DisplayConstants.UNKNOWN_USER, null, null, 0, 0);
        }
        return new FollowUserView(
                user.getId(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getFollowingCount(),
                user.getFollowersCount()
        );
    }

    /**
     * 批量查询用户信息，避免 N+1 查询（Task 2.2.1）。
     */
    public Map<Long, User> batchLoadUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> distinctIds = userIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (distinctIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(distinctIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    /**
     * 将 JSON 字符串反序列化为 List<String>。
     * 解析失败时返回空列表，避免影响主流程。
     */
    public List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> result = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return result != null ? result : List.of();
        } catch (JsonProcessingException e) {
            log.warn("JSON 反序列化失败: {}", json, e);
            return List.of();
        }
    }

    /**
     * 将 JSON 字符串反序列化为泛型 List。
     * 解析失败时返回空列表。
     */
    public <T> List<T> parseJsonToList(String json, TypeReference<List<T>> typeReference) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<T> result = objectMapper.readValue(json, typeReference);
            return result != null ? result : List.of();
        } catch (JsonProcessingException e) {
            log.warn("JSON 反序列化失败: {}", json, e);
            return List.of();
        }
    }

    /**
     * 将 List 序列化为 JSON 字符串。
     * 序列化失败时返回 "[]"，避免影响主流程。
     */
    public <T> String serializeListToJson(List<T> list) {
        if (list == null || list.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.warn("JSON 序列化失败: {}", list, e);
            return "[]";
        }
    }

    // ---- 仅供 ProfileUpdateService 使用的内部依赖访问器 ----

    /**
     * 内部访问器：暴露 UserRepository 供 ProfileUpdateService 复用。
     * 该方法仅供同包内 ProfileUpdateService 使用，外部不应调用。
     */
    public UserRepository getUserRepository() {
        return userRepository;
    }

    /**
     * 内部访问器：暴露 UserBasicProfileRepository 供 ProfileUpdateService 复用。
     */
    public UserBasicProfileRepository getUserBasicProfileRepository() {
        return userBasicProfileRepository;
    }

    /**
     * 内部访问器：暴露 UserCampusProfileRepository 供 ProfileUpdateService 复用。
     */
    public UserCampusProfileRepository getUserCampusProfileRepository() {
        return userCampusProfileRepository;
    }

    /**
     * 内部访问器：暴露 UserScheduleProfileRepository 供 ProfileUpdateService 复用。
     */
    public UserScheduleProfileRepository getUserScheduleProfileRepository() {
        return userScheduleProfileRepository;
    }

    /**
     * 内部访问器：暴露 UserFollowRepository 供 ProfileUpdateService 复用。
     */
    public UserFollowRepository getUserFollowRepository() {
        return userFollowRepository;
    }
}
