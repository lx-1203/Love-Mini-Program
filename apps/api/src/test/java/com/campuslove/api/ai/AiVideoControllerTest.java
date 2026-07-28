package com.campuslove.api.ai;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * AI 视频代理控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link AiVideoController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：POST /api/ai/video/generate → 委托 aiVideoService.generateVideo</li>
 *   <li>场景 2：POST /api/ai/image/generate → 委托 aiVideoService.generateImage</li>
 *   <li>场景 3：GET /api/ai/health → 委托 aiVideoService.checkHealth</li>
 *   <li>场景 4：service 抛出 AiApiUnauthorizedException → controller 原样向上抛</li>
 *   <li>场景 5：service 抛出 AiApiException → controller 原样向上抛</li>
 * </ul>
 */
class AiVideoControllerTest {

    @Mock private AiVideoService aiVideoService;

    private AiVideoController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AiVideoController(aiVideoService);
    }

    @Test
    void generateVideo_shouldDelegateToServiceAndReturnResult() {
        // Arrange
        Map<String, Object> params = Map.of("prompt", "浪漫的校园夕阳", "duration", 5);
        Map<String, Object> expectedResult = Map.of(
                "videoUrl", "https://cdn.example.com/video/123.mp4",
                "taskId", "task-123");
        when(aiVideoService.generateVideo(any())).thenReturn(expectedResult);

        // Act
        Map<String, Object> result = controller.generateVideo(params);

        // Assert
        assertNotNull(result, "返回不应为 null");
        assertSame(expectedResult, result, "应原样返回 service 结果");
        verify(aiVideoService).generateVideo(params);
    }

    @Test
    void generateImage_shouldDelegateToServiceAndReturnResult() {
        // Arrange
        Map<String, Object> params = Map.of("prompt", "情侣卡通头像", "style", "kawaii");
        Map<String, Object> expectedResult = Map.of(
                "imageUrl", "https://cdn.example.com/img/456.png");
        when(aiVideoService.generateImage(any())).thenReturn(expectedResult);

        // Act
        Map<String, Object> result = controller.generateImage(params);

        // Assert
        assertNotNull(result);
        assertSame(expectedResult, result);
        verify(aiVideoService).generateImage(params);
    }

    @Test
    void health_shouldDelegateToServiceAndReturnResult() {
        // Arrange
        Map<String, Object> expectedHealth = Map.of(
                "status", "ok",
                "version", "1.0.0",
                "agnesAvailable", true);
        when(aiVideoService.checkHealth()).thenReturn(expectedHealth);

        // Act
        Map<String, Object> result = controller.health();

        // Assert
        assertNotNull(result);
        assertSame(expectedHealth, result);
        verify(aiVideoService).checkHealth();
    }

    @Test
    void generateVideo_shouldPropagateAiApiUnauthorizedException() {
        // Arrange
        Map<String, Object> params = Map.of("prompt", "测试");
        when(aiVideoService.generateVideo(any()))
                .thenThrow(new AiApiUnauthorizedException("video", "API Key 缺失"));

        // Act & Assert
        assertThrows(AiApiUnauthorizedException.class, () -> controller.generateVideo(params));
    }

    @Test
    void generateVideo_shouldPropagateAiApiException() {
        // Arrange
        Map<String, Object> params = Map.of("prompt", "测试");
        when(aiVideoService.generateVideo(any()))
                .thenThrow(new AiApiException("video", "上游 500 错误", null, null));

        // Act & Assert
        assertThrows(AiApiException.class, () -> controller.generateVideo(params));
    }

    @Test
    void generateImage_shouldPropagateAiApiUnauthorizedException() {
        // Arrange
        Map<String, Object> params = Map.of("prompt", "测试");
        when(aiVideoService.generateImage(any()))
                .thenThrow(new AiApiUnauthorizedException("image", "API Key 无效"));

        // Act & Assert
        assertThrows(AiApiUnauthorizedException.class, () -> controller.generateImage(params));
    }

    @Test
    void health_shouldPropagateAiApiException() {
        // Arrange
        when(aiVideoService.checkHealth())
                .thenThrow(new AiApiException("health", "上游不可达", null, null));

        // Act & Assert
        assertThrows(AiApiException.class, () -> controller.health());
    }
}
