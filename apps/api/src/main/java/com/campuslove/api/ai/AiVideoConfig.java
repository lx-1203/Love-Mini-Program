package com.campuslove.api.ai;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 *   <li>Task 9：api-base 默认值已移除，未配置时启动失败，避免硬编码外部 URL</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.ai.agnes")
public class AiVideoConfig {

    private static final Logger log = LoggerFactory.getLogger(AiVideoConfig.class);

    /**
     * Agnes AI API 基础地址。
     *
     * <p>Task 9：默认值已移除，必须通过 {@code app.ai.agnes.api-base} 或环境变量
     * {@code AGNES_API_BASE} 显式配置。未配置时 {@link #validate()} 抛出
     * {@link IllegalStateException}，应用启动失败——避免硬编码外部 URL，
     * 同时强制运营方在部署时确认 AI 服务地址（避免误用默认值连接到错误环境）。</p>
     */
    private String apiBase = "";

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

    /**
     * 启动时校验必填配置项。
     *
     * <p>Task 9：api-base 为必填项，未配置时拒绝启动。
     * api-key 允许为空（运行时由 RealAiVideoService 抛 401 处理），
     * 便于 mock profile 下不依赖 AI 服务也能启动应用。</p>
     *
     * @throws IllegalStateException 当 api-base 未配置时抛出
     */
    @PostConstruct
    public void validate() {
        if (apiBase == null || apiBase.isBlank()) {
            throw new IllegalStateException(
                    "app.ai.agnes.api-base (env: AGNES_API_BASE) must be configured, "
                            + "no hardcoded default allowed");
        }
        log.info("Agnes AI 配置校验通过: apiBase={}, timeoutMs={}ms, apiKeyConfigured={}",
                apiBase, timeoutMs, apiKey != null && !apiKey.isBlank());
    }

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
