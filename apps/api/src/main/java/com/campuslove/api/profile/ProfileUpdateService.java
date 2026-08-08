package com.campuslove.api.profile;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.user.FollowView;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 个人资料更新组件（Task 4.2.4 拆分）。
 *
 * <p>职责：所有写操作路径，包括：</p>
 * <ul>
 *   <li>{@link #saveBasicProfile}：保存基本资料（含 Phase B 扩展字段校验）</li>
 *   <li>{@link #uploadBackground} / {@link #uploadPhoto} / {@link #deletePhoto} / {@link #uploadVideo} / {@link #uploadHalfBody}：媒体上传与删除</li>
 *   <li>{@link #saveCampusProfile}：保存校园资料</li>
 *   <li>{@link #saveScheduleProfile}：保存日程资料</li>
 *   <li>{@link #followUser} / {@link #unfollowUser}：关注关系维护（含通知与计数）</li>
 *   <li>{@link #ensureBasicProfile}：媒体上传前自动创建空记录</li>
 *   <li>{@link #deleteOldMediaQuietly}：旧文件清理（失败不影响主流程）</li>
 * </ul>
 *
 * <p>该组件通过 ProfileQueryService 复用视图转换、JSON 解析与资料完善度计算逻辑，
 * 避免职责重复。所有写操作使用 {@code @Transactional} 保证事务一致性。</p>
 */
@Profile("real")
@Component
public class ProfileUpdateService {

    private static final Logger log = LoggerFactory.getLogger(ProfileUpdateService.class);

    /** 照片墙最大数量 */
    public static final int PHOTO_GALLERY_MAX = 6;

    /** height 取值范围 */
    public static final int HEIGHT_MIN = 120;
    public static final int HEIGHT_MAX = 250;

    /** educationLevel 合法取值 */
    public static final Set<String> VALID_EDUCATION_LEVELS =
            Set.of("high_school", "bachelor", "master", "phd");

    /** relationshipStatus 合法取值 */
    public static final Set<String> VALID_RELATIONSHIP_STATUS =
            Set.of("never", "married_before", "divorced", "widowed");

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final NotificationRepository notificationRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final InteractionEventService interactionEventService;
    private final MediaStorageService mediaStorageService;
    private final ProfileQueryService queryService;
    private final FollowService followService;
    private final SensitiveWordFilter sensitiveWordFilter;

    public ProfileUpdateService(
            UserRepository userRepository,
            UserFollowRepository userFollowRepository,
            NotificationRepository notificationRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            InteractionEventService interactionEventService,
            MediaStorageService mediaStorageService,
            ProfileQueryService queryService,
            FollowService followService,
            SensitiveWordFilter sensitiveWordFilter) {
        this.userRepository = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.notificationRepository = notificationRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.interactionEventService = interactionEventService;
        this.mediaStorageService = mediaStorageService;
        this.queryService = queryService;
        this.followService = followService;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    // ---- 基本资料保存 ----

    /**
     * 保存基本资料。
     * 仅当请求显式传入扩展字段时才更新（null 保留原值）。
     * 同步更新 User 表的 nickname/bio/gradeLabel/pronouns 与 profileCompletion。
     */
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

        // infra R2-00254: 昵称/简介补敏感词过滤（防止资料携带违规词）
        String filteredNickname = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(request.nickname(), currentUserId, "PROFILE_NICKNAME")
                : request.nickname();
        String filteredBio = request.bio() != null && sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(request.bio(), currentUserId, "PROFILE_BIO")
                : request.bio();

        profile.setNickname(filteredNickname);
        profile.setBio(filteredBio);
        profile.setGradeLabel(request.grade());
        profile.setPronouns(request.pronouns());
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
            profile.setFuturePlanTags(queryService.serializeListToJson(request.futurePlanTags()));
        }
        // P0-34 修复（2026-08-08）：兴趣标签写入（此前缺失 → 完善度差 20 分 → 无法解锁）
        if (request.interestTags() != null) {
            profile.setInterestTags(queryService.serializeListToJson(request.interestTags()));
        }
        profile.setUpdatedAt(now);
        userBasicProfileRepository.save(profile);

        // 同步更新 User 表
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        user.setNickname(filteredNickname);
        user.setBio(filteredBio);
        user.setGradeLabel(request.grade());
        user.setPronouns(request.pronouns());

        // 2026-08-07：头像 URL 可选更新（非空时写入 users.avatar_url）
        if (request.avatarUrl() != null && !request.avatarUrl().isBlank()) {
            user.setAvatarUrl(request.avatarUrl());
        }

        // 重新计算资料完善度并保存
        user.setProfileCompletion(queryService.calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

        return queryService.toBasicProfileView(profile, user);
    }

    // ---- 媒体上传 ----

    /**
     * 上传头像（2026-08-07 新增）。
     *
     * 头像存于 users.avatar_url，由推荐卡片（DiscoverCard.avatar）与个人主页共用。
     * 覆盖前先删除旧文件，避免文件堆积。
     */
    @Transactional
    public BasicProfileView uploadAvatar(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "avatar");
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + currentUserId));
        deleteOldMediaQuietly(user.getAvatarUrl());
        user.setAvatarUrl(result.getUrl());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        // 返回含头像 URL 的最新资料视图（含自动创建的 basic profile 记录）
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        profile.setUpdatedAt(LocalDateTime.now());
        return queryService.toBasicProfileView(profile, user);
    }

    /**
     * 上传个人主页背景图。
     * 删除旧背景图（如有），避免文件堆积。
     */
    @Transactional
    public BasicProfileView uploadBackground(MultipartFile file) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "background");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        deleteOldMediaQuietly(profile.getProfileBackgroundUrl());
        profile.setProfileBackgroundUrl(result.getUrl());
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    /**
     * 上传照片墙图片到指定索引。
     * 索引范围 0-5，覆盖前先删除旧文件。
     */
    @Transactional
    public BasicProfileView uploadPhoto(MultipartFile file, int index) {
        if (index < 0 || index >= PHOTO_GALLERY_MAX) {
            throw new IllegalArgumentException(
                    "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
        }
        Long currentUserId = SecurityUtils.getCurrentUserId();
        MediaStorageService.UploadResult result = mediaStorageService.store(currentUserId, file, "image");
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        List<String> gallery = queryService.parseStringList(profile.getPhotoGallery());
        while (gallery.size() <= index) {
            gallery.add("");
        }
        String oldUrl = gallery.get(index);
        if (oldUrl != null && !oldUrl.isBlank()) {
            deleteOldMediaQuietly(oldUrl);
        }
        gallery.set(index, result.getUrl());
        profile.setPhotoGallery(queryService.serializeListToJson(gallery));
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    /**
     * 删除指定索引的照片墙图片。
     * 索引越界或指定索引无照片时抛 {@link IllegalArgumentException}。
     */
    @Transactional
    public BasicProfileView deletePhoto(int index) {
        if (index < 0 || index >= PHOTO_GALLERY_MAX) {
            throw new IllegalArgumentException(
                    "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
        }
        Long currentUserId = SecurityUtils.getCurrentUserId();
        UserBasicProfile profile = ensureBasicProfile(currentUserId);
        List<String> gallery = queryService.parseStringList(profile.getPhotoGallery());
        if (index >= gallery.size()) {
            throw new IllegalArgumentException("指定索引无照片可删除: " + index);
        }
        String removed = gallery.remove(index);
        if (removed != null && !removed.isBlank()) {
            deleteOldMediaQuietly(removed);
        }
        profile.setPhotoGallery(queryService.serializeListToJson(gallery));
        profile.setUpdatedAt(LocalDateTime.now());
        userBasicProfileRepository.save(profile);
        return rebuildView(currentUserId, profile);
    }

    /**
     * 上传个人视频。
     * 删除旧视频（如有）。
     */
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

    /**
     * 上传半身照，用于推荐卡片大图。
     * 删除旧半身照（如有）。
     */
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

    // ---- 校园资料保存 ----

    /**
     * 保存校园资料。
     * 新记录默认 verificationStatus=pending，已有记录保留原状态。
     * 重新计算 profileCompletion 并同步到 User 表。
     */
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
        user.setProfileCompletion(queryService.calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

        return new CampusProfileView(
                profile.getCityName(),
                profile.getCampusName(),
                profile.getDepartmentName(),
                profile.getVerificationStatus());
    }

    // ---- 日程资料保存 ----

    /**
     * 保存日程资料。
     * 将 preferredTimeWindows 与 courseBlocks 序列化为 JSON 存储。
     * 重新计算 profileCompletion 并同步到 User 表。
     */
    @Transactional
    public ScheduleProfileView saveScheduleProfile(ScheduleProfileRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        String preferredTimeWindowJson = queryService.serializeListToJson(
                request.preferredTimeWindows() != null ? request.preferredTimeWindows() : List.of());
        String courseBlockJson = queryService.serializeListToJson(
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
        user.setProfileCompletion(queryService.calculateProfileCompletion(currentUserId));
        user.setUpdatedAt(now);
        userRepository.save(user);

        List<String> preferredTimeWindows = queryService.parseJsonToList(
                preferredTimeWindowJson, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        List<ScheduleBlockView> courseBlocks = queryService.parseJsonToList(
                courseBlockJson, new com.fasterxml.jackson.core.type.TypeReference<List<ScheduleBlockView>>() {});

        return new ScheduleProfileView(
                profile.getPreferredCampusArea(),
                preferredTimeWindows,
                courseBlocks);
    }

    // ---- 关注关系管理（委托至 FollowService） ----

    /**
     * 关注用户。
     * 创建关注关系，更新双方 followingCount/followersCount，并触发通知与互动事件。
     */
    @Transactional
    public FollowView followUser(Long userId, Long targetUserId) {
        return followService.followUser(userId, targetUserId);
    }

    /**
     * 取消关注用户。
     * 删除关注关系，更新双方 followingCount/followersCount（不低于 0）。
     */
    @Transactional
    public FollowView unfollowUser(Long userId, Long targetUserId) {
        return followService.unfollowUser(userId, targetUserId);
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
    public UserBasicProfile ensureBasicProfile(Long userId) {
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
    public void deleteOldMediaQuietly(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        try {
            mediaStorageService.delete(url);
        } catch (IllegalStateException e) {
            log.warn("删除旧媒体文件失败 url={}: {}", url, e.getMessage());
        }
    }

    /**
     * 重新构建 BasicProfileView（包含完善度与认证徽章）。
     * 媒体上传后重新计算完善度。
     */
    public BasicProfileView rebuildView(Long userId, UserBasicProfile profile) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("用户不存在: " + userId));
        int completion = queryService.calculateProfileCompletion(userId);
        user.setProfileCompletion(completion);
        userRepository.save(user);
        return queryService.toBasicProfileView(profile, user);
    }
}
