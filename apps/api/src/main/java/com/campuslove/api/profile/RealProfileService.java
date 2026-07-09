package com.campuslove.api.profile;

import com.campuslove.api.campus.CampusCertificationService;
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
import com.campuslove.api.media.MediaStorageService;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 真实个人资料服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 *
 * <p>Phase B 扩展：实现媒体绑定方法（背景图/照片墙/视频/半身照），
 * 通过注入的 {@link MediaStorageService} 完成文件上传并写回 UserBasicProfile。</p>
 */
@Profile("real")
@Service
public class RealProfileService implements ProfileService {

    private static final Logger log = LoggerFactory.getLogger(RealProfileService.class);

    /** 照片墙最大数量 */
    private static final int PHOTO_GALLERY_MAX = 6;

    /** height 取值范围 */
    private static final int HEIGHT_MIN = 120;
    private static final int HEIGHT_MAX = 250;

    /** educationLevel 合法取值 */
    private static final Set<String> VALID_EDUCATION_LEVELS =
            Set.of("high_school", "bachelor", "master", "phd");

    /** relationshipStatus 合法取值 */
    private static final Set<String> VALID_RELATIONSHIP_STATUS =
            Set.of("never", "married_before", "divorced", "widowed");

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
    private final MediaStorageService mediaStorageService;
    private final CampusCertificationService campusCertificationService;

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
            InteractionEventService interactionEventService,
            MediaStorageService mediaStorageService,
            CampusCertificationService campusCertificationService) {
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
        this.mediaStorageService = mediaStorageService;
        this.campusCertificationService = campusCertificationService;
    }

    // ---- 基本资料 ----

    @Override
    @Transactional(readOnly = true)
    public BasicProfileView getBasicProfile() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        UserBasicProfile profile = userBasicProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> new UserBasicProfile());
        return toBasicProfileView(profile, user);
    }

    @Override
    @Transactional
    public BasicProfileView saveBasicProfile(BasicProfileRequest request) {
        validateExtendedFields(request);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        UserBasicProfile profile = userBasicProfileRepository.findByUserId(currentUserId)
                .orElseGet(() -> {
                    UserBasicProfile newProfile = new UserBasicProfile();
                    newProfile.setUserId(currentUserId);
                    newProfile.setCreatedAt(now);
                    newProfile.setPhotoGallery("[]");
                    newProfile.setFuturePlanTags("[]");
                    newProfile.setInterestTags("[]");
                    return newProfile;
                });

        profile.setNickname(request.nickname());
        profile.setBio(request.bio());
        profile.setGradeLabel(request.grade());
        profile.setPronouns(request.pronouns());
        // Phase B 扩展字段：仅当请求显式传入时更新，未传保留原值
        if (request.height() != null) {
            profile.setHeight(request.height());
        }
        if (request.educationLevel() != null) {
            profile.setEducationLevel(request.educationLevel());
        }
        if (request.relationshipStatus() != null) {
            profile.setRelationshipStatus(request.relationshipStatus());
        }
        if (request.hometownProvince() != null) {
            profile.setHometownProvince(request.hometownProvince());
        }
        if (request.hometownCity() != null) {
            profile.setHometownCity(request.hometownCity());
        }
        if (request.futureCity() != null) {
            profile.setFutureCity(request.futureCity());
        }
        if (request.futurePlanTags() != null) {
            profile.setFuturePlanTags(serializeListToJson(request.futurePlanTags()));
        }
        profile.setUpdatedAt(now);
        userBasicProfileRepository.save(profile);

        // 同步更新 User 表的 nickname / bio / gradeLabel / pronouns
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        user.setNickname(request.nickname());
        user.setBio(request.bio());
        user.setGradeLabel(request.grade());
        user.setPronouns(request.pronouns());

        // 重新计算资料完善度并保存
        user.setProfileCompletion(calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

        return toBasicProfileView(profile, user);
    }

    @Override
    @Transactional
    public BasicProfileView uploadBackground(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "background");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        // 删除旧背景图（如有），避免文件堆积
        deleteOldMediaQuietly(profile.getProfileBackgroundUrl());
        profile.setProfileBackgroundUrl(result.getUrl());
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    @Override
    @Transactional
    public BasicProfileView uploadPhoto(MultipartFile file, int index) {
        if (index < 0 || index >= PHOTO_GALLERY_MAX) {
            throw new IllegalArgumentException(
                    "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
        }
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "image");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        List<String> gallery = parseStringList(profile.getPhotoGallery());
        while (gallery.size() <= index) {
            gallery.add("");
        }
        // 覆盖前先删除旧文件（如有）
        String oldUrl = gallery.get(index);
        if (oldUrl != null && !oldUrl.isBlank()) {
            deleteOldMediaQuietly(oldUrl);
        }
        gallery.set(index, result.getUrl());
        profile.setPhotoGallery(serializeListToJson(gallery));
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    @Override
    @Transactional
    public BasicProfileView deletePhoto(int index) {
        if (index < 0 || index >= PHOTO_GALLERY_MAX) {
            throw new IllegalArgumentException(
                    "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
        }
        Long currentUserId = SecurityUtils.getCurrentUserId();
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        List<String> gallery = parseStringList(profile.getPhotoGallery());
        if (index >= gallery.size()) {
            throw new IllegalArgumentException("指定索引无照片可删除: " + index);
        }
        String removed = gallery.remove(index);
        if (removed != null && !removed.isBlank()) {
            deleteOldMediaQuietly(removed);
        }
        profile.setPhotoGallery(serializeListToJson(gallery));
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    @Override
    @Transactional
    public BasicProfileView uploadVideo(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "video");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        deleteOldMediaQuietly(profile.getPersonalVideoUrl());
        profile.setPersonalVideoUrl(result.getUrl());
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    @Override
    @Transactional
    public BasicProfileView uploadHalfBody(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "image");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        deleteOldMediaQuietly(profile.getHalfBodyPhotoUrl());
        profile.setHalfBodyPhotoUrl(result.getUrl());
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    // ---- 校园资料 ----

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

    @Override
    @Transactional
    public CampusProfileView saveCampusProfile(CampusProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

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
        if (profile.getId() == null) {
            profile.setVerificationStatus("pending");
        }
        profile.setUpdatedAt(now);
        userCampusProfileRepository.save(profile);

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

    @Override
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

    @Override
    @Transactional
    public ScheduleProfileView saveScheduleProfile(ScheduleProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        String preferredTimeWindowJson = serializeListToJson(
                request.preferredTimeWindows() != null ? request.preferredTimeWindows() : List.of());
        String courseBlockJson = serializeListToJson(
                request.courseBlocks() != null ? request.courseBlocks() : List.of());

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

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        user.setProfileCompletion(calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

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

    @Override
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

    // ---- 关注关系管理实现 ----

    @Override
    @Transactional
    public FollowView followUser(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId 和 targetUserId 不能为空");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException("不能关注自己");
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("关注者用户不存在: " + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("目标用户不存在: " + targetUserId));

        if (userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException("已经关注了该用户");
        }

        LocalDateTime now = LocalDateTime.now();
        UserFollow userFollow = new UserFollow(userId, targetUserId);
        userFollow.setCreatedAt(now);
        userFollowRepository.save(userFollow);

        follower.setFollowingCount(follower.getFollowingCount() + 1);
        follower.setUpdatedAt(now);
        userRepository.save(follower);

        target.setFollowersCount(target.getFollowersCount() + 1);
        target.setUpdatedAt(now);
        userRepository.save(target);

        Notification notification = new Notification();
        notification.setUserId(targetUserId);
        notification.setType(NotificationType.follow);
        notification.setSourceUserId(userId);
        notification.setReferenceId(userId);
        notification.setReferenceType(ReferenceType.user);
        notification.setIsRead(false);
        notification.setCreatedAt(now);
        notificationRepository.save(notification);

        interactionEventService.recordEvent(
                targetUserId, userId, "NEW_FOLLOW", userId, "USER",
                "有人关注了你"
        );

        return new FollowView(true, userId, targetUserId,
                follower.getFollowingCount(), target.getFollowersCount());
    }

    @Override
    @Transactional
    public FollowView unfollowUser(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId 和 targetUserId 不能为空");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException("不能取消关注自己");
        }

        if (!userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException("未关注该用户，无法取关");
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("关注者用户不存在: " + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("目标用户不存在: " + targetUserId));

        userFollowRepository.deleteByFollowerIdAndFollowingId(userId, targetUserId);

        LocalDateTime now = LocalDateTime.now();
        follower.setFollowingCount(Math.max(0, follower.getFollowingCount() - 1));
        follower.setUpdatedAt(now);
        userRepository.save(follower);

        target.setFollowersCount(Math.max(0, target.getFollowersCount() - 1));
        target.setUpdatedAt(now);
        userRepository.save(target);

        return new FollowView(false, userId, targetUserId,
                follower.getFollowingCount(), target.getFollowersCount());
    }

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
     * 校验 Phase B 扩展字段范围。
     * 字段为 null 时跳过校验（可选字段）。
     */
    private void validateExtendedFields(BasicProfileRequest request) {
        if (request.height() != null) {
            int h = request.height();
            if (h < HEIGHT_MIN || h > HEIGHT_MAX) {
                throw new IllegalArgumentException(
                        "height 越界，仅支持 " + HEIGHT_MIN + "-" + HEIGHT_MAX + "，当前: " + h);
            }
        }
        if (request.educationLevel() != null && !request.educationLevel().isBlank()) {
            if (!VALID_EDUCATION_LEVELS.contains(request.educationLevel())) {
                throw new IllegalArgumentException(
                        "educationLevel 取值非法，仅支持 high_school/bachelor/master/phd，当前: "
                                + request.educationLevel());
            }
        }
        if (request.relationshipStatus() != null && !request.relationshipStatus().isBlank()) {
            if (!VALID_RELATIONSHIP_STATUS.contains(request.relationshipStatus())) {
                throw new IllegalArgumentException(
                        "relationshipStatus 取值非法，仅支持 never/married_before/divorced/widowed，当前: "
                                + request.relationshipStatus());
            }
        }
    }

    /**
     * 获取或创建当前用户的基本资料记录。
     * 媒体上传端点不要求用户先填写基本资料，故自动创建空白记录以便写入 URL。
     */
    private UserBasicProfile ensureBasicProfile(Long userId) {
        return userBasicProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserBasicProfile newProfile = new UserBasicProfile();
                    newProfile.setUserId(userId);
                    newProfile.setNickname("");
                    newProfile.setBio("");
                    newProfile.setGradeLabel("");
                    newProfile.setPronouns("");
                    newProfile.setInterestTags("[]");
                    newProfile.setFuturePlanTags("[]");
                    newProfile.setPhotoGallery("[]");
                    newProfile.setCreatedAt(LocalDateTime.now());
                    return newProfile;
                });
    }

    /**
     * 删除旧媒体文件，失败时仅记日志不抛异常，避免主流程被影响。
     */
    private void deleteOldMediaQuietly(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        try {
            mediaStorageService.delete(url);
        } catch (Exception e) {
            log.warn("删除旧媒体文件失败 url={}: {}", url, e.getMessage());
        }
    }

    /**
     * 重新构建 BasicProfileView（包含完善度与认证徽章）。
     */
    private BasicProfileView rebuildView(Long userId, UserBasicProfile profile) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + userId));
        // 媒体上传后重新计算完善度
        int completion = calculateProfileCompletion(userId);
        user.setProfileCompletion(completion);
        userRepository.save(user);
        return toBasicProfileView(profile, user);
    }

    /**
     * 将 UserBasicProfile + User 实体组装为 BasicProfileView。
     */
    private BasicProfileView toBasicProfileView(UserBasicProfile profile, User user) {
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
     */
    private int calculateProfileCompletion(Long userId) {
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

    private int calculateTotalLikesCount(Long userId) {
        List<Post> userPosts = postRepository.findByAuthorId(userId);
        int totalLikes = 0;
        for (Post post : userPosts) {
            totalLikes += postLikeRepository.countByPostId(post.getId());
        }
        return totalLikes;
    }

    /**
     * 将 JSON 字符串反序列化为 List<String>。
     * 解析失败时返回空列表，避免影响主流程。
     */
    private List<String> parseStringList(String json) {
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

    /** 占位以保持 import 不被移除（Collections 在历史代码中曾用于 follow 相关）。 */
    @SuppressWarnings("unused")
    private List<Object> unusedKeepImport() {
        return new ArrayList<>(Collections.emptyList());
    }
}
