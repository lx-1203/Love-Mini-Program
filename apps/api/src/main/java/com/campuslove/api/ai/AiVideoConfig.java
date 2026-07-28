package com.campuslove.api.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Agnes AI 视频/图片生成服务配置属性。
 *
 * <p>SubTask 1.4.5：将 AI 视频 API Key 从前端硬编码迁移到后端环境变量，
 * 通过此配置类绑定 application.yml 中 app.ai.agnes.* 前缀的配置项。</p>
 *
 * <p>绑定关系：</p>
 * <ul>
 *   <li>{@code app.ai.agnes.api-base} ← {@code AGNES_API_BASE} 环境变量</li>
 *   <li>{@code app.ai.agnes.api-key} ← {@code AGNES_API_KEY} 环境变量</li>
 *   <li>{@code app.ai.agnes.timeout-ms} ← {@code AGNES_TIMEOUT_MS} 环境变量（可选）</li>
 * </ul>
 *
 * <p>安全设计：</p>
 * <ul>
 *   <li>API Key 仅在后端持有，前端无法直接接触，避免泄露</li>
 *   <li>调用 Agnes AI 时由后端代理附加 Authorization 头</li>
 *   <li>API Key 缺失时返回 503 Service Unavailable，不向客户端暴露 Key 缺失事实</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.ai.agnes")
public class AiVideoConfig {

    /**
     * Agnes AI API 基础地址。
     * 默认值与文档 https://agnes-ai.com/zh-Hans/docs/agnes-video-v20 一致。
     */
    private String apiBase = "https://api.agnes-ai.com/api";

    /**
     * Agnes AI API Key。
     *
     * <p>必须通过环境变量 AGNES_API_KEY 配置，禁止硬编码到代码或配置文件。
     * 申请地址：https://agnes-ai.com/dashboard/api-keys</p>
     *
     * <p>当 apiKey 为空字符串时，{@link RealAiVideoService} 会抛出
     * {@link AiApiUnauthorizedException}（HTTP 401），提示运营方补全配置。</p>
     */
    private String apiKey = "";

    /**
     * 调用 Agnes AI 接口的超时时间（毫秒）。
     * 默认 30 秒，覆盖视频生成等耗时接口的最大容忍时长。
     */
    private long timeoutMs = 30000L;

    public String getApiBase() {
        return apiBase;
    }

    public void setApiBase(String apiBase) {
        this.apiBase = apiBase;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public long getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}
