package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.testdata.ControllerTestBase;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * 通知控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link NotificationController} 的核心场景：</p>
 * <ul>
 *   <li>GET /api/v1/notifications → 获取通知列表</li>
 *   <li>PUT /api/v1/notifications/{id}/read → 标记已读</li>
 *   <li>GET /api/v1/notifications/unread-count → 获取未读数</li>
 *   <li>GET /api/v1/notifications/list → 分页查询（含 signalType 筛选）</li>
 *   <li>PUT /api/v1/notifications/read-all → 全部标记已读</li>
 * </ul>
 */
class NotificationControllerTest extends ControllerTestBase {

    @Mock private NotificationService notificationService;

    private NotificationController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new NotificationController(notificationService);
    }

    @Test
    void getNotifications_shouldDelegateWithUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            NotificationView view = new NotificationView(
                    1L, "LIKE", null, 200L, "USER", false,
                    "2026-07-26T10:00:00", "小明喜欢了你", "SOCIAL");
            when(notificationService.getNotifications(100L)).thenReturn(List.of(view));

            // Act
            List<NotificationView> result = controller.getNotifications();

            // Assert
            assertNotNull(result);
            assertEquals(1, result.size(), "应返回 1 条通知");
            verify(notificationService).getNotifications(100L);
        });
    }

    @Test
    void markAsRead_shouldDelegateToServiceWithoutUserIdCheck() {
        // Arrange
        Long notificationId = 42L;

        // Act
        controller.markAsRead(notificationId);

        // Assert
        verify(notificationService).markAsRead(notificationId);
    }

    @Test
    void getUnreadCount_shouldReturnViewWithUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            UnreadCountView view = new UnreadCountView(5L);
            when(notificationService.getUnreadCount(100L)).thenReturn(view);

            // Act
            UnreadCountView result = controller.getUnreadCount();

            // Assert
            assertNotNull(result);
            assertSame(view, result);
            assertEquals(5L, result.count());
            verify(notificationService).getUnreadCount(100L);
        });
    }

    @Test
    void getNotificationsPaged_shouldDelegateWithFiltersAndPageable() {
        // Arrange
        withUserId(100L, () -> {
            when(notificationService.getNotifications(
                    eq(100L), anyBoolean(), anyString(), any(Pageable.class)))
                    .thenReturn(List.of());

            // Act
            List<NotificationView> result = controller.getNotificationsPaged(
                    true, "SOCIAL", 0, 20);

            // Assert
            assertNotNull(result);
            verify(notificationService).getNotifications(
                    eq(100L), eq(true), eq("SOCIAL"), any(Pageable.class));
        });
    }

    @Test
    void getUnreadCountLong_shouldReturnPrimitiveLong() {
        // Arrange
        withUserId(100L, () -> {
            UnreadCountView view = new UnreadCountView(3L);
            when(notificationService.getUnreadCount(100L)).thenReturn(view);

            // Act
            long result = controller.getUnreadCountLong();

            // Assert
            assertEquals(3L, result, "应返回 service 提供的 count 值");
        });
    }

    @Test
    void markAsReadWithUser_shouldPassUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            Long notificationId = 42L;

            // Act
            controller.markAsReadWithUser(notificationId);

            // Assert
            verify(notificationService).markAsRead(eq(notificationId), eq(100L));
        });
    }

    @Test
    void markAllAsRead_shouldPassUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            // Act
            controller.markAllAsRead();

            // Assert
            verify(notificationService).markAllAsRead(100L);
        });
    }

    @Test
    void constructor_shouldAcceptNotificationService() {
        assertNotNull(new NotificationController(notificationService));
    }
}
