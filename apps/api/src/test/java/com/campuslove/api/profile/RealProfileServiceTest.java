package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.user.FollowUserView;
import com.campuslove.api.user.FollowView;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

/**
 * RealProfileService 单元测试（Task 4.2.4 验证）。
 *
 * <p>验证 RealProfileService 在 Task 4.2.4 重构后正确委托 2 个组件：</p>
 * <ul>
 *   <li>{@link ProfileQueryService}：所有只读查询（基本/校园/日程资料、统计、关注列表、完善度计算）</li>
 *   <li>{@link ProfileUpdateService}：所有写操作（保存资料、媒体上传、关注/取关）</li>
 * </ul>
 *
 * <p>测试策略：使用内部构造器 {@code RealProfileService(queryService, updateService)}
 * 直接注入 mocked 组件，仅验证委托关系（调用次数 + 返回值透传），
 * 不验证业务逻辑（由各组件自身的单元测试覆盖）。</p>
 */
class RealProfileServiceTest {

    @Mock private ProfileQueryService queryService;
    @Mock private ProfileUpdateService updateService;

    private RealProfileService realService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // 使用内部构造器直接注入 mocked 组件，避免构造 12 个 repository/service 依赖
        realService = new RealProfileService(queryService, updateService);
    }

    // ---- 基本资料查询委托：ProfileQueryService ----

    /**
     * 场景：getBasicProfile() 应委托 queryService.getBasicProfile()。
     */
    @Test
    void getBasicProfile_delegatesToQueryService() {
        BasicProfileView expected = buildBasicProfileView();
        when(queryService.getBasicProfile()).thenReturn(expected);

        BasicProfileView result = realService.getBasicProfile();

        assertSame(expected, result);
        verify(queryService, times(1)).getBasicProfile();
    }

    /**
     * 场景：getCampusProfile() 应委托 queryService.getCampusProfile()。
     */
    @Test
    void getCampusProfile_delegatesToQueryService() {
        CampusProfileView expected = new CampusProfileView("北京", "北大", "计算机系", "verified");
        when(queryService.getCampusProfile()).thenReturn(expected);

        CampusProfileView result = realService.getCampusProfile();

        assertSame(expected, result);
        verify(queryService, times(1)).getCampusProfile();
    }

    /**
     * 场景：getScheduleProfile() 应委托 queryService.getScheduleProfile()。
     */
    @Test
    void getScheduleProfile_delegatesToQueryService() {
        ScheduleProfileView expected = new ScheduleProfileView("东校区", List.of("morning"), List.of());
        when(queryService.getScheduleProfile()).thenReturn(expected);

        ScheduleProfileView result = realService.getScheduleProfile();

        assertSame(expected, result);
        verify(queryService, times(1)).getScheduleProfile();
    }

    /**
     * 场景：getProfileStats() 应委托 queryService.getProfileStats()。
     */
    @Test
    void getProfileStats_delegatesToQueryService() {
        ProfileStatsView expected = new ProfileStatsView(10, 20, 30);
        when(queryService.getProfileStats()).thenReturn(expected);

        ProfileStatsView result = realService.getProfileStats();

        assertSame(expected, result);
        verify(queryService, times(1)).getProfileStats();
    }

    // ---- 关注关系查询委托：ProfileQueryService ----

    /**
     * 场景：getFollowers(userId) 应委托 queryService.getFollowers(userId)。
     */
    @Test
    void getFollowers_delegatesToQueryService() {
        Long userId = 100L;
        List<FollowUserView> expected = List.of(
                new FollowUserView(1L, "Alice", "/a.jpg", "bio", 5, 10));
        when(queryService.getFollowers(userId)).thenReturn(expected);

        List<FollowUserView> result = realService.getFollowers(userId);

        assertSame(expected, result);
        verify(queryService, times(1)).getFollowers(userId);
    }

    /**
     * 场景：getFollowing(userId) 应委托 queryService.getFollowing(userId)。
     */
    @Test
    void getFollowing_delegatesToQueryService() {
        Long userId = 100L;
        List<FollowUserView> expected = List.of(
                new FollowUserView(2L, "Bob", "/b.jpg", "bio2", 3, 8));
        when(queryService.getFollowing(userId)).thenReturn(expected);

        List<FollowUserView> result = realService.getFollowing(userId);

        assertSame(expected, result);
        verify(queryService, times(1)).getFollowing(userId);
    }

    /**
     * 场景：isFollowing(userId, targetUserId) 应委托 queryService.isFollowing。
     */
    @Test
    void isFollowing_delegatesToQueryService() {
        Long userId = 100L;
        Long targetUserId = 200L;
        when(queryService.isFollowing(userId, targetUserId)).thenReturn(true);

        boolean result = realService.isFollowing(userId, targetUserId);

        assertTrue(result);
        verify(queryService, times(1)).isFollowing(userId, targetUserId);
    }

    /**
     * 场景：isFollowing 返回 false 时也应正确委托。
     */
    @Test
    void isFollowing_returnsFalse_delegatesToQueryService() {
        Long userId = 100L;
        Long targetUserId = 300L;
        when(queryService.isFollowing(userId, targetUserId)).thenReturn(false);

        boolean result = realService.isFollowing(userId, targetUserId);

        assertFalse(result);
        verify(queryService, times(1)).isFollowing(userId, targetUserId);
    }

    // ---- 资料写操作委托：ProfileUpdateService ----

    /**
     * 场景：saveBasicProfile(request) 应委托 updateService.saveBasicProfile(request)。
     */
    @Test
    void saveBasicProfile_delegatesToUpdateService() {
        BasicProfileRequest request = mock(BasicProfileRequest.class);
        BasicProfileView expected = buildBasicProfileView();
        when(updateService.saveBasicProfile(request)).thenReturn(expected);

        BasicProfileView result = realService.saveBasicProfile(request);

        assertSame(expected, result);
        verify(updateService, times(1)).saveBasicProfile(request);
    }

    /**
     * 场景：uploadBackground(file) 应委托 updateService.uploadBackground(file)。
     */
    @Test
    void uploadBackground_delegatesToUpdateService() {
        MultipartFile file = new MockMultipartFile("file", "bg.jpg", "image/jpeg", new byte[]{1, 2});
        BasicProfileView expected = buildBasicProfileView();
        when(updateService.uploadBackground(file)).thenReturn(expected);

        BasicProfileView result = realService.uploadBackground(file);

        assertSame(expected, result);
        verify(updateService, times(1)).uploadBackground(file);
    }

    /**
     * 场景：uploadPhoto(file, index) 应委托 updateService.uploadPhoto(file, index)。
     */
    @Test
    void uploadPhoto_delegatesToUpdateService() {
        MultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{3, 4});
        int index = 2;
        BasicProfileView expected = buildBasicProfileView();
        when(updateService.uploadPhoto(file, index)).thenReturn(expected);

        BasicProfileView result = realService.uploadPhoto(file, index);

        assertSame(expected, result);
        verify(updateService, times(1)).uploadPhoto(file, index);
    }

    /**
     * 场景：deletePhoto(index) 应委托 updateService.deletePhoto(index)。
     */
    @Test
    void deletePhoto_delegatesToUpdateService() {
        int index = 1;
        BasicProfileView expected = buildBasicProfileView();
        when(updateService.deletePhoto(index)).thenReturn(expected);

        BasicProfileView result = realService.deletePhoto(index);

        assertSame(expected, result);
        verify(updateService, times(1)).deletePhoto(index);
    }

    /**
     * 场景：uploadVideo(file) 应委托 updateService.uploadVideo(file)。
     */
    @Test
    void uploadVideo_delegatesToUpdateService() {
        MultipartFile file = new MockMultipartFile("file", "video.mp4", "video/mp4", new byte[]{5, 6});
        BasicProfileView expected = buildBasicProfileView();
        when(updateService.uploadVideo(file)).thenReturn(expected);

        BasicProfileView result = realService.uploadVideo(file);

        assertSame(expected, result);
        verify(updateService, times(1)).uploadVideo(file);
    }

    /**
     * 场景：uploadHalfBody(file) 应委托 updateService.uploadHalfBody(file)。
     */
    @Test
    void uploadHalfBody_delegatesToUpdateService() {
        MultipartFile file = new MockMultipartFile("file", "half.jpg", "image/jpeg", new byte[]{7, 8});
        BasicProfileView expected = buildBasicProfileView();
        when(updateService.uploadHalfBody(file)).thenReturn(expected);

        BasicProfileView result = realService.uploadHalfBody(file);

        assertSame(expected, result);
        verify(updateService, times(1)).uploadHalfBody(file);
    }

    /**
     * 场景：saveCampusProfile(request) 应委托 updateService.saveCampusProfile(request)。
     */
    @Test
    void saveCampusProfile_delegatesToUpdateService() {
        CampusProfileRequest request = mock(CampusProfileRequest.class);
        CampusProfileView expected = new CampusProfileView("北京", "北大", "计算机系", "verified");
        when(updateService.saveCampusProfile(request)).thenReturn(expected);

        CampusProfileView result = realService.saveCampusProfile(request);

        assertSame(expected, result);
        verify(updateService, times(1)).saveCampusProfile(request);
    }

    /**
     * 场景：saveScheduleProfile(request) 应委托 updateService.saveScheduleProfile(request)。
     */
    @Test
    void saveScheduleProfile_delegatesToUpdateService() {
        ScheduleProfileRequest request = mock(ScheduleProfileRequest.class);
        ScheduleProfileView expected = new ScheduleProfileView("东校区", List.of("morning"), List.of());
        when(updateService.saveScheduleProfile(request)).thenReturn(expected);

        ScheduleProfileView result = realService.saveScheduleProfile(request);

        assertSame(expected, result);
        verify(updateService, times(1)).saveScheduleProfile(request);
    }

    // ---- 关注关系写操作委托：ProfileUpdateService ----

    /**
     * 场景：followUser(userId, targetUserId) 应委托 updateService.followUser。
     */
    @Test
    void followUser_delegatesToUpdateService() {
        Long userId = 100L;
        Long targetUserId = 200L;
        FollowView expected = new FollowView(true, userId, targetUserId, 11, 21);
        when(updateService.followUser(userId, targetUserId)).thenReturn(expected);

        FollowView result = realService.followUser(userId, targetUserId);

        assertSame(expected, result);
        verify(updateService, times(1)).followUser(userId, targetUserId);
    }

    /**
     * 场景：unfollowUser(userId, targetUserId) 应委托 updateService.unfollowUser。
     */
    @Test
    void unfollowUser_delegatesToUpdateService() {
        Long userId = 100L;
        Long targetUserId = 200L;
        FollowView expected = new FollowView(false, userId, targetUserId, 9, 19);
        when(updateService.unfollowUser(userId, targetUserId)).thenReturn(expected);

        FollowView result = realService.unfollowUser(userId, targetUserId);

        assertSame(expected, result);
        verify(updateService, times(1)).unfollowUser(userId, targetUserId);
    }

    // ---- 工具方法 ----

    /** 构造测试用 BasicProfileView（17 个字段全填）。 */
    private BasicProfileView buildBasicProfileView() {
        return new BasicProfileView(
                "若星", "安静而明确", "大三", "她/她",
                165, "bachelor", "never",
                "广东省", "广州市", "广州市",
                List.of("买房", "养猫"), List.of(),
                "/half.jpg", "/video.mp4", "/bg.jpg",
                85, "school");
    }
}
