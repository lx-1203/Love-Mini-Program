package com.campuslove.api.ai;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock AI 视频/图片生成服务。
 *
 * <p>SubTask 1.4.5：mock profile 下使用，不调用真实 Agnes AI 接口，
 * 返回伪造的成功响应，便于前端在无 API Key 环境下联调。</p>
 *
 * <p>设计原则：</p>
 * <ul>
 *   <li>不依赖外部 API Key，避免 mock 环境下的配置依赖</li>
 *   <li>返回结构合理的伪造响应，便于前端联调渲染逻辑</li>
 *   <li>记录 info 日志，便于区分 mock 调用与 real 调用</li>
 * </ul>
 */
@Service
@Profile("mock")
public class MockAiVideoService implements AiVideoService {

    private static final Logger log = LoggerFactory.getLogger(MockAiVideoService.class);

    @Override
    public Map<String, Object> generateVideo(Map<String, Object> params) {
        log.info("[Mock] 调用 AI 视频生成: {}", params);
        return Map.of(
                "id", UUID.randomUUID().toString(),
                "status", "mock_completed",
                "videoUrl", "https://example.com/mock-video.mp4",
                "posterUrl", "https://example.com/mock-poster.jpg",
                "mock", true
        );
    }

    @Override
    public Map<String, Object> generateImage(Map<String, Object> params) {
        log.info("[Mock] 调用 AI 图片生成: {}", params);
        return Map.of(
                "data", java.util.List.of(Map.of("url", "https://example.com/mock-image.jpg")),
                "url", "https://example.com/mock-image.jpg",
                "mock", true
        );
    }

    @Override
    public Map<String, Object> checkHealth() {
        log.info("[Mock] 调用 AI 健康检查");
        return Map.of(
                "code", "ok",
                "message", "mock mode",
                "data", Map.of("status", "healthy")
        );
    }
}
