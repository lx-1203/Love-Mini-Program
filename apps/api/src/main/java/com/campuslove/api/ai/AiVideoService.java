package com.campuslove.api.ai;

import java.util.Map;

/**
 * AI 视频/图片生成服务接口。
 *
 * <p>SubTask 1.4.5：定义 Agnes AI 调用契约，由 {@link RealAiVideoService}
 * 提供真实实现，调用 Agnes AI 接口并将响应透传给前端。</p>
 *
 * <p>所有方法均通过后端代理调用 Agnes AI，API Key 由后端环境变量注入，
 * 前端无法直接接触，避免泄露。</p>
 */
public interface AiVideoService {

    /**
     * 调用 Agnes AI 生成视频。
     *
     * @param params 视频生成参数（prompt 必填，duration/style/resolution 可选）
     * @return Agnes AI 响应体（透传给前端）
     * @throws AiApiUnauthorizedException 当 API Key 缺失或 Agnes AI 返回 401 时
     */
    Map<String, Object> generateVideo(Map<String, Object> params);

    /**
     * 调用 Agnes AI 生成图片。
     *
     * @param params 图片生成参数（prompt 必填，n/size 可选）
     * @return Agnes AI 响应体（透传给前端）
     * @throws AiApiUnauthorizedException 当 API Key 缺失或 Agnes AI 返回 401 时
     */
    Map<String, Object> generateImage(Map<String, Object> params);

    /**
     * 检查 Agnes AI 接口健康状态。
     *
     * @return 健康检查响应体
     * @throws AiApiUnauthorizedException 当 API Key 缺失或 Agnes AI 返回 401 时
     */
    Map<String, Object> checkHealth();
}
