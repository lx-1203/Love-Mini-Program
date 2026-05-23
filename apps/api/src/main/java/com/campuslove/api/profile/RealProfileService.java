package com.campuslove.api.profile;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.PostLikeRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.user.FollowUserView;
import com.campuslove.api.user.FollowView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实个人资料服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 */
@Profile("real")
@Service
public class RealProfileService implements ProfileService {

    private static final Logger log = LoggerFactory.getLogger(RealProfileService.class);

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final NotificationRepository notificationRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final ObjectMapper objectMapper;
    private final InteractionEventService interactionEventService;

    public RealProfileService(
            UserRepository userRepository,
            UserFollowRepository userFollowRepository,
            NotificationRepository notificationRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            PostRepository postRepository,
            PostLikeRepository postLikeRepository,
            ObjectMapper objectMapper,
            InteractionEventService interactionEventService) {
        this.userRepository = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.notificationRepository = notificationRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.postRepository = postRepository;
        this.postLikeRepository = postLikeRepository;
        this.objectMapper = objectMapper;
        this.interactionEventService = interactionEventService;
    }

    // ---- 基本资料 ----

    /**
     * 获取当前用户的基本资料。
     * 从 UserBasicProfileRepository 查询，若无记录则返回空模板。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     */
    @Override
    @Transactional(readOnly = true)
    public BasicProfileView getBasicProfile() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return userBasicProfileRepository.findByUserId(currentUserId)
                .map(profile -> new BasicProfileView(
                        profile.getNickname(),
                        profile.getBio(),
                        profile.getGradeLabel(),
                        profile.getPronouns()))
                .orElseGet(() -> new BasicProfileView("", "", "", ""));
    }

    /**
     * 保存当前用户的基本资料。
     * 存在则更新，不存在则创建。同时同步更新 User 表的对应字段，
     * 并重新计算 profileCompletion。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     */
    @Override
    @Transactional
    public BasicProfileView saveBasicProfile(BasicProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        // 查找现有记录，存在则更新，不存在则创建
        UserBasicProfile profile = userBasicProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> {
                    UserBasicProfile newProfile = new UserBasicProfile();
                    newProfile.setUserId(currentUserId);
                    newProfile.setCreatedAt(now);
                    return newProfile;
                });

        profile.setNickname(request.nickname());
        profile.setBio(request.bio());
        profile.setGradeLabel(request.grade());
        profile.setPronouns(request.pronouns());
        profile.setUpdatedAt(now);
        userBasicProfileRepository.save(profile);

        // 同步更新 User 表的 nickname / bio / gradeLabel / pronouns
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        user.setNickname(request.nickname());
        user.setBio(request.bio());
        user.setGradeLabel(request.grade());
        user.setPronouns(request.pronouns());
        user.setUpdatedAt(now);

        // 重新计算资料完善度并保存
        user.setProfileCompletion(calculateProfileCompletion(currentUserId));
        userRepository.save(user);

        return new BasicProfileView(
                profile.getNickname(),
                profile.getBio(),
                profile.getGradeLabel(),
                profile.getPronouns());
    }

    // ---- 校园资料 ----

    /**
     * 获取当前用户的校园资料。
     * 从 UserCampusProfileRepository 查询，若无记录则返回空模板（verificationStatus 为 "draft"）。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     */
    @Override
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

    /**
     * 保存当前用户的校园资料。
     * 存在则更新，不存在则创建（verificationStatus 设为 "pending"）。
     * 更新后重新计算 profileCompletion。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     */
    @Override
    @Transactional
    public CampusProfileView saveCampusProfile(CampusProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        // 查找现有记录，存在则更新，不存在则创建
        UserCampusProfile profile = userCampusProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> {
                    UserCampusProfile newProfile = new UserCampusProfile();
                    newProfile.setUserId(currentUserId);
                    newProfile.setCreatedAt(now);
                    return newProfile;
                });

        profile.setCityName(request.city());
        profile.setCampusName(request.campusName());
        profile.setDepartmentName(request.department());
        // 新创建时设为 pending，已有记录保留当前状态
        if (profile.getId() == null) {
            profile.setVerificationStatus("pending");
        }
        profile.setUpdatedAt(now);
        userCampusProfileRepository.save(profile);

        // 重新计算资料完善度
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        user.setProfileCompletion(calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

        return new CampusProfileView(
                profile.getCityName(),
                profile.getCampusName(),
                profile.getDepartmentName(),
                profile.getVerificationStatus());
    }

    // ---- 日程资料 ----

    /**
     * 获取当前用户的日程资料。
     * 从 UserScheduleProfileRepository 查询，若无记录则返回空模板。
     * 需要解析 preferredTimeWindowJson 和 courseBlockJson 为对应的 Java 类型。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     */
    @Override
    @Transactional(readOnly = true)
    public ScheduleProfileView getScheduleProfile() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return userScheduleProfileRepository.findByUserId(currentUserId)
                .map(profile -> {
                    // 解析偏好时间窗口 JSON → List<String>
                    List<String> preferredTimeWindows = parseJsonToList(
                            profile.getPreferredTimeWindowJson(), new TypeReference<List<String>>() {});

                    // 解析课程安排 JSON → List<ScheduleBlockView>
                    List<ScheduleBlockView> courseBlocks = parseJsonToList(
                            profile.getCourseBlockJson(), new TypeReference<List<ScheduleBlockView>>() {});

                    return new ScheduleProfileView(
                            profile.getPreferredCampusArea(),
                            preferredTimeWindows,
                            courseBlocks);
                })
                .orElseGet(() -> new ScheduleProfileView("", List.of(), List.of()));
    }

    /**
     * 保存当前用户的日程资料。
     * 存在则更新，不存在则创建。
     * 需要将 preferredTimeWindows 和 courseBlocks 序列化为 JSON 字符串。
     * 更新后重新计算 profileCompletion。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     */
    @Override
    @Transactional
    public ScheduleProfileView saveScheduleProfile(ScheduleProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        // 序列化 preferredTimeWindows 和 courseBlocks 为 JSON
        String preferredTimeWindowJson = serializeListToJson(
                request.preferredTimeWindows() != null ? request.preferredTimeWindows() : List.of());
        String courseBlockJson = serializeListToJson(
                request.courseBlocks() != null ? request.courseBlocks() : List.of());

        // 查找现有记录，存在则更新，不存在则创建
        UserScheduleProfile profile = userScheduleProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> {
                    UserScheduleProfile newProfile = new UserScheduleProfile();
                    newProfile.setUserId(currentUserId);
                    newProfile.setCreatedAt(now);
                    return newProfile;
                });

        profile.setPreferredCampusArea(request.preferredCampusArea());
        profile.setPreferredTimeWindowJson(preferredTimeWindowJson);
        profile.setCourseBlockJson(courseBlockJson);
        profile.setUpdatedAt(now);
        userScheduleProfileRepository.save(profile);

        // 重新计算资料完善度
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        user.setProfileCompletion(calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

        // 反序列化回视图对象返回
        List<String> preferredTimeWindows = parseJsonToList(
                preferredTimeWindowJson, new TypeReference<List<String>>() {});
        List<ScheduleBlockView> courseBlocks = parseJsonToList(
                courseBlockJson, new TypeReference<List<ScheduleBlockView>>() {});

        return new ScheduleProfileView(
                profile.getPreferredCampusArea(),
                preferredTimeWindows,
                courseBlocks);
    }

    // ---- 用户统计 ----

    /**
     * 获取当前用户的统计数据。
     * followingCount 和 followersCount 来自 User 表，
     * likesCount 通过统计用户所有帖子的获赞总数计算。
     * Phase 2: 用户ID从SecurityContext获取，未认证时抛出401异常。
     */
    @Override
    @Transactional(readOnly = true)
    public ProfileStatsView getProfileStats() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));

        // 统计用户所有帖子的总获赞数
        int likesCount = calculateTotalLikesCount(currentUserId);

        return new ProfileStatsView(
                user.getFollowingCount(),
                user.getFollowersCount(),
                likesCount);
    }

    // ---- 关注关系管理实现 ----

    /**
     * 关注用户。
     * 1. 校验参数有效性（不能关注自己、用户必须存在、不能重复关注）
     * 2. 创建 UserFollow 记录
     * 3. 更新关注者的 followingCount + 1
     * 4. 更新被关注者的 followersCount + 1
     * 5. 创建 follow 类型通知
     */
    @Override
    @Transactional
    public FollowView followUser(Long userId, Long targetUserId) {
        // 参数校验
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId 和 targetUserId 不能为空");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException("不能关注自己");
        }

        // 校验用户是否存在
        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("关注者用户不存在: " + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("目标用户不存在: " + targetUserId));

        // 校验是否已关注
        if (userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException("已经关注了该用户");
        }

        // 创建关注关系
        LocalDateTime now = LocalDateTime.now();
        UserFollow userFollow = new UserFollow(userId, targetUserId);
        userFollow.setCreatedAt(now);
        userFollowRepository.save(userFollow);

        // 更新关注者的 followingCount
        follower.setFollowingCount(follower.getFollowingCount() + 1);
        follower.setUpdatedAt(now);
        userRepository.save(follower);

        // 更新被关注者的 followersCount
        target.setFollowersCount(target.getFollowersCount() + 1);
        target.setUpdatedAt(now);
        userRepository.save(target);

        // 创建关注通知
        Notification notification = new Notification();
        notification.setUserId(targetUserId);
        notification.setType(NotificationType.follow);
        notification.setSourceUserId(userId);
        notification.setReferenceId(userId);
        notification.setReferenceType(ReferenceType.user);
        notification.setIsRead(false);
        notification.setCreatedAt(now);
        notificationRepository.save(notification);

        // 记录互动事件：通知被关注用户
        interactionEventService.recordEvent(
                targetUserId, userId, "NEW_FOLLOW", userId, "USER",
                "有人关注了你"
        );

        return new FollowView(true, userId, targetUserId,
                follower.getFollowingCount(), target.getFollowersCount());
    }

    /**
     * 取消关注用户。
     * 1. 校验参数有效性
     * 2. 删除 UserFollow 记录
     * 3. 更新关注者的 followingCount - 1
     * 4. 更新被关注者的 followersCount - 1
     */
    @Override
    @Transactional
    public FollowView unfollowUser(Long userId, Long targetUserId) {
        // 参数校验
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId 和 targetUserId 不能为空");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException("不能取消关注自己");
        }

        // 校验关注关系是否存在
        if (!userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException("未关注该用户，无法取关");
        }

        // 校验用户是否存在
        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("关注者用户不存在: " + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("目标用户不存在: " + targetUserId));

        // 删除关注关系
        userFollowRepository.deleteByFollowerIdAndFollowingId(userId, targetUserId);

        // 更新关注者的 followingCount（不低于0）
        LocalDateTime now = LocalDateTime.now();
        follower.setFollowingCount(Math.max(0, follower.getFollowingCount() - 1));
        follower.setUpdatedAt(now);
        userRepository.save(follower);

        // 更新被关注者的 followersCount（不低于0）
        target.setFollowersCount(Math.max(0, target.getFollowersCount() - 1));
        target.setUpdatedAt(now);
        userRepository.save(target);

        return new FollowView(false, userId, targetUserId,
                follower.getFollowingCount(), target.getFollowersCount());
    }

    /**
     * 获取指定用户的粉丝列表。
     * 查询 user_follows 表中 following_id = userId 的所有记录，
     * 然后根据 follower_id 查询对应的用户信息。
     */
    @Override
    @Transactional(readOnly = true)
    public List<FollowUserView> getFollowers(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        List<UserFollow> follows = userFollowRepository.findByFollowingId(userId);
        return follows.stream()
                .map(follow -> {
                    User follower = userRepository.findById(follow.getFollowerId()).orElse(null);
                    return toFollowUserView(follow.getFollowerId(), follower);
                })
                .toList();
    }

    /**
     * 获取指定用户的关注列表。
     * 查询 user_follows 表中 follower_id = userId 的所有记录，
     * 然后根据 following_id 查询对应的用户信息。
     */
    @Override
    @Transactional(readOnly = true)
    public List<FollowUserView> getFollowing(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        List<UserFollow> follows = userFollowRepository.findByFollowerId(userId);
        return follows.stream()
                .map(follow -> {
                    User following = userRepository.findById(follow.getFollowingId()).orElse(null);
                    return toFollowUserView(follow.getFollowingId(), following);
                })
                .toList();
    }

    /**
     * 查询当前用户是否关注了目标用户。
     */
    @Override
    @Transactional(readOnly = true)
    public boolean isFollowing(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            return false;
        }
        return userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId);
    }

    // ---- 私有辅助方法 ----

    /**
     * 将 User 实体转换为 FollowUserView。
     * 如果用户不存在，返回默认占位视图。
     */
    private FollowUserView toFollowUserView(Long userId, User user) {
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
     * 计算用户资料完善度百分比。
     * - 有基本资料(nickname非空): +30%
     * - 有校区资料(campusName非空): +30%
     * - 有日程资料(preferredCampusArea非空): +20%
     * - 有兴趣标签(interestTags非空): +20%
     * 最大100%
     *
     * @param userId 用户 ID
     * @return 资料完善度百分比 (0-100)
     */
    private int calculateProfileCompletion(Long userId) {
        int completion = 0;

        // 检查基本资料：nickname 非空则 +30%
        UserBasicProfile basicProfile = userBasicProfileRepository.findByUserId(userId).orElse(null);
        if (basicProfile != null && basicProfile.getNickname() != null && !basicProfile.getNickname().isBlank()) {
            completion += 30;
        }

        // 检查校区资料：campusName 非空则 +30%
        UserCampusProfile campusProfile = userCampusProfileRepository.findByUserId(userId).orElse(null);
        if (campusProfile != null && campusProfile.getCampusName() != null && !campusProfile.getCampusName().isBlank()) {
            completion += 30;
        }

        // 检查日程资料：preferredCampusArea 非空则 +20%
        UserScheduleProfile scheduleProfile = userScheduleProfileRepository.findByUserId(userId).orElse(null);
        if (scheduleProfile != null && scheduleProfile.getPreferredCampusArea() != null
                && !scheduleProfile.getPreferredCampusArea().isBlank()) {
            completion += 20;
        }

        // 检查兴趣标签：interestTags 非空则 +20%
        if (basicProfile != null && basicProfile.getInterestTags() != null && !basicProfile.getInterestTags().isBlank()) {
            completion += 20;
        }

        return Math.min(100, completion);
    }

    /**
     * 统计用户所有帖子的总获赞数。
     * 先查询该用户的所有帖子，再逐个统计每篇帖子的点赞数并求和。
     *
     * @param userId 用户 ID
     * @return 总获赞数
     */
    private int calculateTotalLikesCount(Long userId) {
        List<Post> userPosts = postRepository.findByAuthorId(userId);
        int totalLikes = 0;
        for (Post post : userPosts) {
            totalLikes += postLikeRepository.countByPostId(post.getId());
        }
        return totalLikes;
    }

    /**
     * 将 JSON 字符串反序列化为指定类型的 List。
     * 如果 JSON 为空或解析失败，返回空列表。
     *
     * @param json         JSON 字符串
     * @param typeReference 目标类型的 TypeReference
     * @param <T>          列表元素类型
     * @return 反序列化后的列表，解析失败时返回空列表
     */
    private <T> List<T> parseJsonToList(String json, TypeReference<List<T>> typeReference) {
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
     * 将列表序列化为 JSON 字符串。
     * 如果序列化失败，返回空数组字符串 "[]"。
     *
     * @param list 待序列化的列表
     * @param <T>  列表元素类型
     * @return JSON 字符串
     */
    private <T> String serializeListToJson(List<T> list) {
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
}
