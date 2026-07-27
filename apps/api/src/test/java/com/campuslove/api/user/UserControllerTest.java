package com.campuslove.api.user;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.profile.ProfileService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

/**
 * 用户控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link UserController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：获取粉丝列表 → 委托 profileService.getFollowers(id)</li>
 *   <li>场景 2：获取关注列表 → 委托 profileService.getFollowing(id)</li>
 *   <li>场景 3：构造函数注入校验</li>
 * </ul>
 */
class UserControllerTest {

    @Mock private ProfileService profileService;
    @Mock private OnlineStatusService onlineStatusService;

    private UserController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new UserController(profileService, onlineStatusService);
    }

    @Test
    void constructor_shouldAcceptDependencies() {
        // Arrange & Act & Assert
        assertNotNull(new UserController(profileService, onlineStatusService));
    }

    @Test
    void getFollowers_shouldDelegateToProfileService() {
        // Arrange
        Long targetUserId = 100L;
        List<FollowUserView> views = List.of(
                new FollowUserView(1L, "粉丝1", "avatar1.png"));
        when(profileService.getFollowers(targetUserId)).thenReturn(views);

        // Act
        ApiResponse<List<FollowUserView>> result = controller.getFollowers(targetUserId);

        // Assert
        assertSame(views, result.data());
        verify(profileService).getFollowers(targetUserId);
    }

    @Test
    void getFollowing_shouldDelegateToProfileService() {
        // Arrange
        Long targetUserId = 200L;
        List<FollowUserView> views = List.of(
                new FollowUserView(2L, "关注1", "avatar2.png"));
        when(profileService.getFollowing(targetUserId)).thenReturn(views);

        // Act
        ApiResponse<List<FollowUserView>> result = controller.getFollowing(targetUserId);

        // Assert
        assertSame(views, result.data());
        verify(profileService).getFollowing(targetUserId);
    }

    @Test
    void isFollowing_shouldReturnBooleanView() {
        // Arrange
        Long currentUserId = 100L;
        Long targetUserId = 200L;
        when(profileService.isFollowing(currentUserId, targetUserId)).thenReturn(true);

        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(currentUserId);

            // Act
            ApiResponse<IsFollowingView> result = controller.isFollowing(targetUserId);

            // Assert
            assertNotNull(result.data());
            verify(profileService).isFollowing(currentUserId, targetUserId);
        }
    }
}
