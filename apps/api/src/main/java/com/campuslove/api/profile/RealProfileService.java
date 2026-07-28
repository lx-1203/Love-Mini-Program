package com.campuslove.api.profile;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.chat.InteractionEventService;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 真实个人资料服务实现（Task 4.2.4 重构）。
 *
 * <p>原 788 行 God Class 已拆分为 2 个组件：</p>
 * <ul>
 *   <li>{@link ProfileQueryService}：所有只读查询（基本/校园/日程资料、统计、关注列表、完善度计算）</li>
 *   <li>{@link ProfileUpdateService}：所有写操作（保存资料、媒体上传、关注/取关）</li>
 * </ul>
 *
 * <p>本类保留接口编排，所有 public 方法签名保持向后兼容。
 * 内部仅做权限校验与委托。</p>
 */
@Profile("real")
@Service
public class RealProfileService implements ProfileService {

    private final ProfileQueryService queryService;
    private final ProfileUpdateService updateService;

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
            CampusCertificationService campusCertificationService,
            FollowService followService) {
        this.queryService = new ProfileQueryService(
                userRepository,
                userFollowRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                postRepository,
                postLikeRepository,
                objectMapper,
                campusCertificationService);
        this.updateService = new ProfileUpdateService(
                userRepository,
                userFollowRepository,
                notificationRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                interactionEventService,
                mediaStorageService,
                this.queryService,
                followService);
    }

    /** 内部构造器：用于单元测试直接注入 query/update 组件。 */
    public RealProfileService(ProfileQueryService queryService, ProfileUpdateService updateService) {
        this.queryService = queryService;
        this.updateService = updateService;
    }

    // ---- 基本资料 ----

    @Override
    @Transactional(readOnly = true)
    public BasicProfileView getBasicProfile() {
        return queryService.getBasicProfile();
    }

    @Override
    @Transactional
    public BasicProfileView saveBasicProfile(BasicProfileRequest request) {
        return updateService.saveBasicProfile(request);
    }

    @Override
    @Transactional
    public BasicProfileView uploadBackground(MultipartFile file) {
        return updateService.uploadBackground(file);
    }

    @Override
    @Transactional
    public BasicProfileView uploadPhoto(MultipartFile file, int index) {
        return updateService.uploadPhoto(file, index);
    }

    @Override
    @Transactional
    public BasicProfileView deletePhoto(int index) {
        return updateService.deletePhoto(index);
    }

    @Override
    @Transactional
    public BasicProfileView uploadVideo(MultipartFile file) {
        return updateService.uploadVideo(file);
    }

    @Override
    @Transactional
    public BasicProfileView uploadHalfBody(MultipartFile file) {
        return updateService.uploadHalfBody(file);
    }

    // ---- 校园资料 ----

    @Override
    @Transactional(readOnly = true)
    public CampusProfileView getCampusProfile() {
        return queryService.getCampusProfile();
    }

    @Override
    @Transactional
    public CampusProfileView saveCampusProfile(CampusProfileRequest request) {
        return updateService.saveCampusProfile(request);
    }

    // ---- 日程资料 ----

    @Override
    @Transactional(readOnly = true)
    public ScheduleProfileView getScheduleProfile() {
        return queryService.getScheduleProfile();
    }

    @Override
    @Transactional
    public ScheduleProfileView saveScheduleProfile(ScheduleProfileRequest request) {
        return updateService.saveScheduleProfile(request);
    }

    // ---- 用户统计 ----

    @Override
    @Transactional(readOnly = true)
    public ProfileStatsView getProfileStats() {
        return queryService.getProfileStats();
    }

    // ---- 关注关系管理 ----

    @Override
    @Transactional
    public FollowView followUser(Long userId, Long targetUserId) {
        return updateService.followUser(userId, targetUserId);
    }

    @Override
    @Transactional
    public FollowView unfollowUser(Long userId, Long targetUserId) {
        return updateService.unfollowUser(userId, targetUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowUserView> getFollowers(Long userId) {
        return queryService.getFollowers(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowUserView> getFollowing(Long userId) {
        return queryService.getFollowing(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isFollowing(Long userId, Long targetUserId) {
        return queryService.isFollowing(userId, targetUserId);
    }
}
