package com.campuslove.api.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Agnes AI 视频/图片生成服务真实实现。
 *
 * <p>SubTask 1.4.5：通过后端代理调用 Agnes AI 接口，将 API Key 注入到请求头，
 * 前端无法直接接触 Key，避免泄露。</p>
 *
 * <p>异常处理策略：</p>
 * <ul>
 *   <li>API Key 缺失 → 抛 {@link AiApiUnauthorizedException}（HTTP 401），
 *       提示运营方补全配置</li>
 *   <li>Agnes AI 返回 401 → 抛 {@link AiApiUnauthorizedException}（HTTP 401），
 *       提示 API Key 失效或过期</li>
 *   <li>Agnes AI 返回其他 4xx/5xx → 抛 {@link AiApiException}（HTTP 502），
 *       提示上游服务异常</li>
 *   <li>网络异常 → 抛 {@link AiApiException}（HTTP 502），提示网络问题</li>
 * </ul>
 *
 * <p>Profile 说明：仅在 real profile 下激活，mock 模式无需调用真实 Agnes AI。</p>
 */
@Service
@Profile("real")
public class RealAiVideoService implements AiVideoService {

    private static final Logger log = LoggerFactory.getLogger(RealAiVideoService.class);

    /** Agnes AI 视频生成端点路径 */
    private static final String VIDEO_PATH = "/video/generate";
    /** Agnes AI 图片生成端点路径 */
    private static final String IMAGE_PATH = "/image/generate";
    /** Agnes AI 健康检查端点路径 */
    private static final String HEALTH_PATH = "/health";

    private final AiVideoConfig aiVideoConfig;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    /**
     * 构造 RealAiVideoService。
     *
     * @param aiVideoConfig AI 服务配置（API Key、API Base、超时）
     * @param objectMapper  JSON 序列化工具
     */
    public RealAiVideoService(AiVideoConfig aiVideoConfig, ObjectMapper objectMapper) {
        this.aiVideoConfig = aiVideoConfig;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(aiVideoConfig.getApiBase())
                .requestFactory(buildRequestFactory(aiVideoConfig.getTimeoutMs()))
                .build();
        if (aiVideoConfig.getApiKey() == null || aiVideoConfig.getApiKey().isBlank()) {
            log.warn("AGNES_API_KEY 未配置，AI 视频/图片生成功能将不可用。"
                    + "请在环境变量中设置 AGNES_API_KEY 后重启服务。");
        } else {
            log.info("RealAiVideoService 初始化完成，apiBase={}, timeoutMs={}ms",
                    aiVideoConfig.getApiBase(), aiVideoConfig.getTimeoutMs());
        }
    }

    /**
     * 构建请求工厂，设置连接与读取超时。
     *
     * @param timeoutMs 超时时间（毫秒）
     * @return 配置好超时的 ClientHttpRequestFactory
     */
    private ClientHttpRequestFactory buildRequestFactory(long timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofMillis(timeoutMs).toMillis());
        factory.setReadTimeout((int) Duration.ofMillis(timeoutMs).toMillis());
        return factory;
    }

    @Override
    public Map<String, Object> generateVideo(Map<String, Object> params) {
        return callAgnesAiPost("video", VIDEO_PATH, params);
    }

    @Override
    public Map<String, Object> generateImage(Map<String, Object> params) {
        return callAgnesAiPost("image", IMAGE_PATH, params);
    }

    @Override
    public Map<String, Object> checkHealth() {
        return callAgnesAiGet("health", HEALTH_PATH);
    }

    /**
     * 调用 Agnes AI POST 接口（视频/图片生成）。
     *
     * @param operation 操作名称（video/image），用于日志
     * @param path      Agnes AI 端点路径
     * @param params    请求参数
     * @return Agnes AI 响应体
     * @throws AiApiUnauthorizedException API Key 缺失或 Agnes AI 返回 401
     * @throws AiApiException             其他上游异常
     */
    private Map<String, Object> callAgnesAiPost(String operation, String path, Map<String, Object> params) {
        String apiKey = requireApiKey(operation);
        try {
            String responseBody = restClient.post()
                    .uri(path)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .body(params != null ? params : Map.of())
                    .retrieve()
                    .body(String.class);
            return parseResponse(operation, responseBody);
        } catch (HttpClientErrorException.Unauthorized ex) {
            throw new AiApiUnauthorizedException(operation,
                    "AI 服务 API Key 失效或已过期，请联系管理员重新生成", ex);
        } catch (HttpClientErrorException ex) {
            log.warn("Agnes AI [{}] 返回客户端错误: status={}, body={}",
                    operation, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AiApiException(operation,
                    "AI 服务请求失败: " + ex.getStatusCode().value(),
                    ex.getResponseBodyAsString(), ex);
        } catch (HttpServerErrorException ex) {
            log.error("Agnes AI [{}] 返回服务端错误: status={}, body={}",
                    operation, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AiApiException(operation,
                    "AI 服务暂时不可用: " + ex.getStatusCode().value(),
                    ex.getResponseBodyAsString(), ex);
        } catch (RestClientException ex) {
            // 网络异常、连接超时、反序列化失败等非 HTTP 状态码异常
            log.error("调用 Agnes AI [{}] 发生未预期异常", operation, ex);
            throw new AiApiException(operation,
                    "AI 服务调用失败: " + ex.getMessage(), null, ex);
        }
    }

    /**
     * 调用 Agnes AI GET 接口（健康检查）。
     *
     * @param operation 操作名称（health），用于日志
     * @param path      Agnes AI 端点路径
     * @return Agnes AI 响应体
     * @throws AiApiUnauthorizedException API Key 缺失或 Agnes AI 返回 401
     * @throws AiApiException             其他上游异常
     */
    private Map<String, Object> callAgnesAiGet(String operation, String path) {
        String apiKey = requireApiKey(operation);
        try {
            String responseBody = restClient.get()
                    .uri(path)
                    .header("Authorization", "Bearer " + apiKey)
                    .retrieve()
                    .body(String.class);
            return parseResponse(operation, responseBody);
        } catch (HttpClientErrorException.Unauthorized ex) {
            throw new AiApiUnauthorizedException(operation,
                    "AI 服务 API Key 失效或已过期，请联系管理员重新生成", ex);
        } catch (HttpClientErrorException ex) {
            log.warn("Agnes AI [{}] 返回客户端错误: status={}, body={}",
                    operation, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AiApiException(operation,
                    "AI 服务请求失败: " + ex.getStatusCode().value(),
                    ex.getResponseBodyAsString(), ex);
        } catch (HttpServerErrorException ex) {
            log.error("Agnes AI [{}] 返回服务端错误: status={}, body={}",
                    operation, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AiApiException(operation,
                    "AI 服务暂时不可用: " + ex.getStatusCode().value(),
                    ex.getResponseBodyAsString(), ex);
        } catch (RestClientException ex) {
            // 网络异常、连接超时、反序列化失败等非 HTTP 状态码异常
            log.error("调用 Agnes AI [{}] 发生未预期异常", operation, ex);
            throw new AiApiException(operation,
                    "AI 服务调用失败: " + ex.getMessage(), null, ex);
        }
    }

    /**
     * 校验 API Key 是否已配置。
     *
     * @param operation 操作名称（用于日志）
     * @return API Key
     * @throws AiApiUnauthorizedException 当 API Key 缺失时
     */
    private String requireApiKey(String operation) {
        String apiKey = aiVideoConfig.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.error("调用 Agnes AI [{}] 失败：AGNES_API_KEY 未配置", operation);
            throw new AiApiUnauthorizedException(operation,
                    "AI 服务未配置 API Key，请联系管理员补全 AGNES_API_KEY 环境变量");
        }
        return apiKey;
    }

    /**
     * 解析 Agnes AI 响应体为 Map。
     *
     * @param operation    操作名称（用于日志）
     * @param responseBody 响应体字符串
     * @return 解析后的 Map；解析失败返回包含 raw 字段的 Map
     */
    private Map<String, Object> parseResponse(String operation, String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return Map.of("status", "ok", "operation", operation);
        }
        try {
            return objectMapper.readValue(responseBody, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException ex) {
            // 响应体非合法 JSON 格式（解析失败、字段类型不匹配等）
            log.warn("Agnes AI [{}] 响应体非 JSON 格式，原样透传: {}",
                    operation, responseBody);
            return Map.of("raw", responseBody, "operation", operation);
        }
    }
}
