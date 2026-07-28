package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.testdata.ControllerTestBase;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * 互动提醒事件控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link InteractionEventController} 的核心场景：</p>
 * <ul>
 *   <li>GET /api/v1/notifications/interactions → 分页查询事件列表</li>
 *   <li>GET /api/v1/notifications/interactions/unread-count → 未读数</li>
 *   <li>PUT /api/v1/notifications/interactions/{eventId}/read → 标记单条已读</li>
 *   <li>PUT /api/v1/notifications/interactions/read-all → 标记全部已读</li>
 *   <li>异常路径：IllegalArgumentException → 400 Bad Request</li>
 * </ul>
 */
class InteractionEventControllerTest extends ControllerTestBase {

    @Mock private InteractionEventService interactionEventService;

    private InteractionEventController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new InteractionEventController(interactionEventService);
    }

    @Test
    void getInteractionEvents_shouldReturnOkWithEvents() {
        // Arrange
        withUserId(100L, () -> {
            InteractionTriggerUserView triggerUser = new InteractionTriggerUserView(
                    200L, "小明", "https://cdn.example.com/avatar.png");
            InteractionEventView event = new InteractionEventView(
                    1L, triggerUser, "LIKE", 300L, "POST",
                    "赞了你的帖子", false, "2026-07-26T10:00:00");
            when(interactionEventService.getInteractionEvents(eq(100L), anyInt(), anyInt()))
                    .thenReturn(List.of(event));

            // Act
            ResponseEntity<List<InteractionEventView>> resp =
                    controller.getInteractionEvents(0, 20);

            // Assert
            assertEquals(HttpStatus.OK, resp.getStatusCode());
            assertEquals(1, resp.getBody().size(), "应返回 1 条互动事件");
        });
    }

    @Test
    void getInteractionEvents_shouldReturnBadRequestWhenServiceThrowsIllegalArgument() {
        // Arrange
        withUserId(100L, () -> {
            when(interactionEventService.getInteractionEvents(anyLong(), anyInt(), anyInt()))
                    .thenThrow(new IllegalArgumentException("无效参数"));

            // Act
            ResponseEntity<List<InteractionEventView>> resp =
                    controller.getInteractionEvents(-1, 20);

            // Assert
            assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        });
    }

    @Test
    void getUnreadCount_shouldReturnOkWithCountMap() {
        // Arrange
        withUserId(100L, () -> {
            when(interactionEventService.getUnreadCount(100L)).thenReturn(5L);

            // Act
            ResponseEntity<java.util.Map<String, Long>> resp = controller.getUnreadCount();

            // Assert
            assertEquals(HttpStatus.OK, resp.getStatusCode());
            assertEquals(5L, resp.getBody().get("count"));
        });
    }

    @Test
    void markAsRead_shouldReturnOkOnSuccess() {
        // Arrange
        withUserId(100L, () -> {
            Long eventId = 42L;

            // Act
            ResponseEntity<Void> resp = controller.markAsRead(eventId);

            // Assert
            assertEquals(HttpStatus.OK, resp.getStatusCode());
            verify(interactionEventService).markAsRead(eq(eventId), eq(100L));
        });
    }

    @Test
    void markAsRead_shouldReturnBadRequestWhenServiceThrowsIllegalArgument() {
        // Arrange
        withUserId(100L, () -> {
            Long eventId = 42L;
            doThrow(new IllegalArgumentException("事件不存在"))
                    .when(interactionEventService).markAsRead(anyLong(), anyLong());

            // Act
            ResponseEntity<Void> resp = controller.markAsRead(eventId);

            // Assert
            assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        });
    }

    @Test
    void markAllAsRead_shouldReturnOkOnSuccess() {
        // Arrange
        withUserId(100L, () -> {
            // Act
            ResponseEntity<Void> resp = controller.markAllAsRead();

            // Assert
            assertEquals(HttpStatus.OK, resp.getStatusCode());
            verify(interactionEventService).markAllAsRead(100L);
        });
    }

    @Test
    void constructor_shouldAcceptService() {
        assertNotNull(new InteractionEventController(interactionEventService));
    }
}
