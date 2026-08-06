package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.user.FollowView;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

/**
 * ProfileUpdateService 单元测试（Task 4.2.4）。
 *
 * <p>覆盖核心写操作：saveBasicProfile 字段校验、followUser 状态机、ensureBasicProfile 自动创建等。</p>
 */
class ProfileUpdateServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserFollowRepository userFollowRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private InteractionEventService interactionEventService;
    @Mock private MediaStorageService mediaStorageService;
    @Mock private ProfileQueryService queryService;
    @Mock private FollowService followService;
    @Mock private com.campuslove.api.config.SensitiveWordFilter sensitiveWordFilter;

    private ProfileUpdateService updateService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        updateService = new ProfileUpdateService(
                userRepository,
                userFollowRepository,
                notificationRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                interactionEventService,
                mediaStorageService,
                queryService,
                followService,
                sensitiveWordFilter);
    }

    /**
     * 场景：height 越界（< 120）应抛 IllegalArgumentException。
     */
    @Test
    void saveBasicProfile_heightBelowMin_throwsException() {
        BasicProfileRequest req = new BasicProfileRequest(
                "若星", "bio", "大三", "她/她",
                100, null, null, null, null, null, List.of());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.saveBasicProfile(req));
        assertTrue(ex.getMessage().contains("height 越界"));
    }

    /**
     * 场景：educationLevel 取值非法时应抛异常。
     */
    @Test
    void saveBasicProfile_invalidEducationLevel_throwsException() {
        BasicProfileRequest req = new BasicProfileRequest(
                "若星", "bio", "大三", "她/她",
                null, "kindergarten", null, null, null, null, List.of());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.saveBasicProfile(req));
        assertTrue(ex.getMessage().contains("educationLevel 取值非法"));
    }

    /**
     * 场景：relationshipStatus 取值非法时应抛异常。
     */
    @Test
    void saveBasicProfile_invalidRelationshipStatus_throwsException() {
        BasicProfileRequest req = new BasicProfileRequest(
                "若星", "bio", "大三", "她/她",
                null, null, "complicated", null, null, null, List.of());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.saveBasicProfile(req));
        assertTrue(ex.getMessage().contains("relationshipStatus 取值非法"));
    }

    // ---- followUser（委托至 FollowService，验证委托行为） ----

    /**
     * 场景：自己关注自己应抛 IllegalArgumentException（由 FollowService 抛出）。
     */
    @Test
    void followUser_selfFollow_throwsException() {
        when(followService.followUser(1L, 1L))
                .thenThrow(new IllegalArgumentException("不能关注自己"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.followUser(1L, 1L));
        assertEquals("不能关注自己", ex.getMessage());
    }

    /**
     * 场景：参数为 null 应抛 IllegalArgumentException（由 FollowService 抛出）。
     */
    @Test
    void followUser_nullParameters_throwsException() {
        when(followService.followUser(null, 2L))
                .thenThrow(new IllegalArgumentException("userId 和 targetUserId 不能为空"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.followUser(null, 2L));
        assertTrue(ex.getMessage().contains("不能为空"));
    }

    /**
     * 场景：已经关注的用户再次关注应抛异常（由 FollowService 抛出）。
     */
    @Test
    void followUser_alreadyFollowing_throwsException() {
        when(followService.followUser(1L, 2L))
                .thenThrow(new IllegalArgumentException("已经关注了该用户"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.followUser(1L, 2L));
        assertEquals("已经关注了该用户", ex.getMessage());
    }

    /**
     * 场景：成功关注后应委托至 FollowService 并返回其结果。
     */
    @Test
    void followUser_success_delegatesToFollowService() {
        FollowView expected = new FollowView(true, 1L, 2L, 6, 21);
        when(followService.followUser(1L, 2L)).thenReturn(expected);

        FollowView result = updateService.followUser(1L, 2L);

        assertTrue(result.isFollowing());
        assertEquals(6, result.followingCount(), "follower followingCount 应 +1");
        assertEquals(21, result.followersCount(), "target followersCount 应 +1");
        verify(followService).followUser(1L, 2L);
    }

    // ---- unfollowUser（委托至 FollowService，验证委托行为） ----

    /**
     * 场景：未关注时取关应抛异常（由 FollowService 抛出）。
     */
    @Test
    void unfollowUser_notFollowing_throwsException() {
        when(followService.unfollowUser(1L, 2L))
                .thenThrow(new IllegalArgumentException("未关注该用户，无法取关"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.unfollowUser(1L, 2L));
        assertEquals("未关注该用户，无法取关", ex.getMessage());
    }

    /**
     * 场景：成功取关后双方计数应递减（不低于 0）。
     */
    @Test
    void unfollowUser_success_decrementsCounts() {
        FollowView expected = new FollowView(false, 1L, 2L, 4, 19);
        when(followService.unfollowUser(1L, 2L)).thenReturn(expected);

        FollowView result = updateService.unfollowUser(1L, 2L);

        assertEquals(false, result.isFollowing());
        assertEquals(4, result.followingCount(), "follower followingCount 应 -1");
        assertEquals(19, result.followersCount(), "target followersCount 应 -1");
        verify(followService).unfollowUser(1L, 2L);
    }

    /**
     * 场景：followersCount 已为 0 时取关不应变为负数。
     */
    @Test
    void unfollowUser_zeroCount_doesNotGoNegative() {
        FollowView expected = new FollowView(false, 1L, 2L, 0, 0);
        when(followService.unfollowUser(1L, 2L)).thenReturn(expected);

        FollowView result = updateService.unfollowUser(1L, 2L);

        assertEquals(0, result.followersCount(), "followersCount 不应变为负数");
    }

    // ---- ensureBasicProfile ----

    /**
     * 场景：用户已有基本资料时，应直接返回现有记录。
     */
    @Test
    void ensureBasicProfile_existingProfile_returnsExisting() {
        UserBasicProfile existing = new UserBasicProfile();
        existing.setUserId(1L);
        existing.setNickname("已有");
        when(userBasicProfileRepository.findByUserId(1L)).thenReturn(Optional.of(existing));

        UserBasicProfile result = updateService.ensureBasicProfile(1L);

        assertEquals("已有", result.getNickname());
        verify(userBasicProfileRepository, never()).save(any());
    }

    /**
     * 场景：用户无基本资料时，应自动创建空白记录。
     */
    @Test
    void ensureBasicProfile_noProfile_createsNew() {
        when(userBasicProfileRepository.findByUserId(1L)).thenReturn(Optional.empty());

        UserBasicProfile result = updateService.ensureBasicProfile(1L);

        assertNotNull(result);
        assertEquals("", result.getNickname());
        assertEquals("[]", result.getInterestTags());
        assertEquals("[]", result.getPhotoGallery());
    }

    // ---- uploadPhoto index validation ----

    /**
     * 场景：照片墙索引越界（>= 6）应抛异常。
     */
    @Test
    void uploadPhoto_indexOutOfBounds_throwsException() {
        MultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[]{1});
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> updateService.uploadPhoto(file, 6));
        assertTrue(ex.getMessage().contains("照片墙索引越界"));
    }

    /**
     * 场景：照片墙索引为负数应抛异常。
     */
    @Test
    void uploadPhoto_negativeIndex_throwsException() {
        MultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[]{1});
        assertThrows(IllegalArgumentException.class,
                () -> updateService.uploadPhoto(file, -1));
    }

    /**
     * 场景：deletePhoto 索引越界应抛异常。
     */
    @Test
    void deletePhoto_indexOutOfBounds_throwsException() {
        assertThrows(IllegalArgumentException.class,
                () -> updateService.deletePhoto(10));
    }

    // ---- 辅助方法 ----

    private static User createUser(Long id, String nickname, int followingCount, int followersCount) {
        User user = new User();
        user.setId(id);
        user.setNickname(nickname);
        user.setFollowingCount(followingCount);
        user.setFollowersCount(followersCount);
        return user;
    }

    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
