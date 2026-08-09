package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.SecurityUtils;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

/**
 * 推荐控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link RecommendationController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：获取讨论推荐 → 委托 recommendationService.getDiscussions()</li>
 *   <li>场景 2：获取活动推荐 → 委托 getActivities()</li>
 *   <li>场景 3：获取推荐偏好 → 委托 getPreferences()</li>
 *   <li>场景 4：更新推荐偏好 → 委托 updatePreferences()</li>
 *   <li>场景 5：构造函数注入校验</li>
 * </ul>
 */
class RecommendationControllerTest {

    @Mock private RecommendationService recommendationService;

    private RecommendationController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new RecommendationController(recommendationService);
    }

    @Test
    void getDiscussions_shouldDelegateToService() {
        // Arrange
        List<DiscussionRecommendationView> expected = List.of(
                new DiscussionRecommendationView("d1", "话题1", "摘要", "热"));
        when(recommendationService.getDiscussions()).thenReturn(expected);

        // Act
        List<DiscussionRecommendationView> result = controller.getDiscussions();

        // Assert
        assertSame(expected, result);
        verify(recommendationService).getDiscussions();
    }

    @Test
    void getActivities_shouldDelegateToService() {
        // Arrange
        List<ActivityRecommendationView> expected = List.of(
                new ActivityRecommendationView("a1", "活动1", "操场", "今晚",
                        "描述", 10, List.of()));
        when(recommendationService.getActivities()).thenReturn(expected);

        // Act
        List<ActivityRecommendationView> result = controller.getActivities();

        // Assert
        assertSame(expected, result);
        verify(recommendationService).getActivities();
    }

    @Test
    void getPreferences_shouldDelegateToService() {
        // Arrange
        // infra R2-00202:getPreferences 改为按当前用户返回真实偏好,测试需 mock 登录上下文
        try (var mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(42L);
            RecommendationPreferencesView view =
                    new RecommendationPreferencesView("08:00", "all", true);
            when(recommendationService.getPreferences(42L)).thenReturn(view);

            // Act
            RecommendationPreferencesView result = controller.getPreferences();

            // Assert
            assertSame(view, result);
            verify(recommendationService).getPreferences(42L);
        }
    }

    @Test
    void updatePreferences_shouldDelegateToService() {
        // Arrange
        // infra R2-00203:updatePreferences 改为调用带 userId 的真实保存逻辑,测试需 mock 登录上下文
        try (var mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(42L);
            RecommendationPreferencesView prefs =
                    new RecommendationPreferencesView("10:00", "campus", false);
            when(recommendationService.savePreferences(42L, "10:00", "campus", false))
                    .thenReturn(prefs);

            // Act
            RecommendationPreferencesView result = controller.updatePreferences(prefs);

            // Assert
            assertSame(prefs, result);
            verify(recommendationService).savePreferences(42L, "10:00", "campus", false);
        }
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new RecommendationController(recommendationService));
    }

    // ------------------------------------------------------------------
    // 2026-08-09 免登录可逛：匿名请求走游客推荐分支（不抛 401）
    // ------------------------------------------------------------------

    @Test
    void getRecommendations_anonymous_shouldDelegateToGuestService() {
        // Arrange：匿名（isAuthenticated=false）→ 不解析当前用户，直接走游客推荐
        RecommendationFilter emptyFilter =
                new RecommendationFilter(null, null, Set.of(), Set.of(), null, null, null, null, null, null);
        List<RecommendedPersonView> expected = List.of();
        try (var mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::isAuthenticated).thenReturn(false);
            when(recommendationService.getRecommendationsForGuest(emptyFilter)).thenReturn(expected);

            // Act：全部筛选参数为 null
            List<RecommendedPersonView> result = controller.getRecommendations(
                    null, null, null, null, null, null, null, null, null, null);

            // Assert
            assertSame(expected, result);
            verify(recommendationService).getRecommendationsForGuest(emptyFilter);
            // 匿名场景不得走用户个性化分支
            verify(recommendationService, Mockito.never())
                    .getRecommendations(Mockito.anyLong(), Mockito.any());
        }
    }

    @Test
    void getRecommendations_authenticated_shouldDelegateToUserService() {
        // Arrange：已认证（isAuthenticated=true）→ 与旧行为一致，按当前用户个性化推荐
        RecommendationFilter emptyFilter =
                new RecommendationFilter(null, null, Set.of(), Set.of(), null, null, null, null, null, null);
        List<RecommendedPersonView> expected = List.of();
        try (var mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::isAuthenticated).thenReturn(true);
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(42L);
            when(recommendationService.getRecommendations(42L, emptyFilter)).thenReturn(expected);

            // Act
            List<RecommendedPersonView> result = controller.getRecommendations(
                    null, null, null, null, null, null, null, null, null, null);

            // Assert
            assertSame(expected, result);
            verify(recommendationService).getRecommendations(42L, emptyFilter);
            verify(recommendationService, Mockito.never()).getRecommendationsForGuest(Mockito.any());
        }
    }
}
