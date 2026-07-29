package com.campuslove.api.ai;

import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI 视频/图片生成代理控制器。
 *
 * <p>SubTask 1.4.5：作为前端与 Agnes AI 之间的代理层，将 API Key 隐藏在后端，
 * 前端无法直接接触，避免泄露。</p>
 *
 * <p>端点设计（与前端 services/agnes-video.ts 调用路径对齐）：</p>
 * <ul>
 *   <li>{@code POST /api/ai/video/generate} → 视频生成</li>
 *   <li>{@code POST /api/ai/image/generate} → 图片生成</li>
 *   <li>{@code GET  /api/ai/health} → 健康检查</li>
 * </ul>
 *
 * <p>异常处理：由 {@link com.campuslove.api.config.GlobalExceptionHandler} 统一捕获
 * {@link AiApiUnauthorizedException}（401）与 {@link RealAiVideoService.AiApiException}（502），
 * 返回标准化 JSON 错误体。</p>
 *
 * <p>安全设计：</p>
 * <ul>
 *   <li>受 SecurityConfig 的 /api/** 规则保护，需登录后才能调用</li>
 *   <li>不暴露 API Key 给前端，仅在后端代理时附加 Authorization 头</li>
 *   <li>上游 401 转换为业务错误码 AI_API_UNAUTHORIZED，便于前端按错误码提示</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiVideoController {

    private final AiVideoService aiVideoService;

    public AiVideoController(AiVideoService aiVideoService) {
        this.aiVideoService = aiVideoService;
    }

    /**
     * 调用 Agnes AI 生成视频。
     *
     * <p>请求体透传给 Agnes AI（prompt/duration/style/resolution 等参数），
     * 响应体原样透传给前端。</p>
     *
     * @param params 视频生成参数
     * @return Agnes AI 响应体
     * @throws AiApiUnauthorizedException 当 API Key 缺失或 Agnes AI 返回 401 时
     * @throws RealAiVideoService.AiApiException 当上游返回其他错误时
     */
    @PostMapping("/video/generate")
    @PreAuthorize("hasRole('USER')")
    public Map<String, Object> generateVideo(@Valid @RequestBody Map<String, Object> params) {
        return aiVideoService.generateVideo(params);
    }

    /**
     * 调用 Agnes AI 生成图片。
     *
     * @param params 图片生成参数
     * @return Agnes AI 响应体
     * @throws AiApiUnauthorizedException 当 API Key 缺失或 Agnes AI 返回 401 时
     * @throws RealAiVideoService.AiApiException 当上游返回其他错误时
     */
    @PostMapping("/image/generate")
    @PreAuthorize("hasRole('USER')")
    public Map<String, Object> generateImage(@Valid @RequestBody Map<String, Object> params) {
        return aiVideoService.generateImage(params);
    }

    /**
     * 检查 Agnes AI 接口健康状态。
     *
     * @return 健康检查响应体
     * @throws AiApiUnauthorizedException 当 API Key 缺失或 Agnes AI 返回 401 时
     * @throws RealAiVideoService.AiApiException 当上游返回其他错误时
     */
    @GetMapping("/health")
    public Map<String, Object> health() {
        return aiVideoService.checkHealth();
    }
}
