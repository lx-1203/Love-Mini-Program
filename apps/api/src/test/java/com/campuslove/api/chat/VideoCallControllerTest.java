package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.VideoCallService.VideoCallRecordView;
import com.campuslove.api.chat.VideoCallService.VideoCallView;
import com.campuslove.api.testdata.ControllerTestBase;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 视频通话控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link VideoCallController} 的核心场景：</p>
 * <ul>
 *   <li>POST /api/v1/chat/video-call/start → 发起通话，返回 roomId</li>
 *   <li>POST /api/v1/chat/video-call/end → 结束通话</li>
 *   <li>GET /api/v1/chat/video-call/records → 查询通话记录</li>
 * </ul>
 */
class VideoCallControllerTest extends ControllerTestBase {

    @Mock private VideoCallService videoCallService;

    private VideoCallController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new VideoCallController(videoCallService);
    }

    @Test
    void startCall_shouldUseCallerIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            Long calleeId = 200L;
            VideoCallView view = new VideoCallView(
                    1L, "room-123", 100L, calleeId, "ACTIVE",
                    "2026-07-26T10:00:00", null, 0, null, "2026-07-26T10:00:00");
            when(videoCallService.startCall(100L, calleeId)).thenReturn(view);

            StartCallRequest req = new StartCallRequest(calleeId);

            // Act
            VideoCallView result = controller.startCall(req);

            // Assert
            assertNotNull(result);
            assertSame(view, result);
            assertEquals("room-123", result.roomId());
            verify(videoCallService).startCall(100L, calleeId);
        });
    }

    @Test
    void endCall_shouldUseUserIdFromSecurityContext() {
        // Arrange
        withUserId(100L, () -> {
            String roomId = "room-123";
            String endReason = "CALLER_HANGUP";
            VideoCallView view = new VideoCallView(
                    1L, roomId, 100L, 200L, "ENDED",
                    "2026-07-26T10:00:00", "2026-07-26T10:05:00", 300,
                    endReason, "2026-07-26T10:00:00");
            when(videoCallService.endCall(eq(roomId), eq(100L), eq(endReason)))
                    .thenReturn(view);

            EndCallRequest req = new EndCallRequest(roomId, endReason);

            // Act
            VideoCallView result = controller.endCall(req);

            // Assert
            assertNotNull(result);
            assertSame(view, result);
            assertEquals("ENDED", result.status());
            verify(videoCallService).endCall(eq(roomId), eq(100L), eq(endReason));
        });
    }

    @Test
    void getRecords_shouldReturnCurrentUserRecords() {
        // Arrange
        withUserId(100L, () -> {
            VideoCallRecordView record = new VideoCallRecordView(
                    1L, "room-123", 100L, 200L,
                    "2026-07-26T10:00:00", "2026-07-26T10:05:00", 300, "ENDED",
                    "2026-07-26T10:00:00");
            when(videoCallService.getRecords(100L)).thenReturn(List.of(record));

            // Act
            List<VideoCallRecordView> result = controller.getRecords();

            // Assert
            assertEquals(1, result.size(), "应返回 1 条通话记录");
            verify(videoCallService).getRecords(100L);
        });
    }

    @Test
    void constructor_shouldAcceptService() {
        assertNotNull(new VideoCallController(videoCallService));
    }
}
