package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
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
        RecommendationPreferencesView view =
                new RecommendationPreferencesView("08:00", "all", true);
        when(recommendationService.getPreferences()).thenReturn(view);

        // Act
        RecommendationPreferencesView result = controller.getPreferences();

        // Assert
        assertSame(view, result);
        verify(recommendationService).getPreferences();
    }

    @Test
    void updatePreferences_shouldDelegateToService() {
        // Arrange
        RecommendationPreferencesView prefs =
                new RecommendationPreferencesView("10:00", "campus", false);
        when(recommendationService.updatePreferences(prefs)).thenReturn(prefs);

        // Act
        RecommendationPreferencesView result = controller.updatePreferences(prefs);

        // Assert
        assertSame(prefs, result);
        verify(recommendationService).updatePreferences(prefs);
    }

    @Test
    void constructor_shouldAcceptService() {
        // Arrange & Act & Assert
        assertNotNull(new RecommendationController(recommendationService));
    }
}
