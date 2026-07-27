package com.campuslove.api.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * {@link RealAiVideoService} 单元测试（SubTask 1.4.5）。
 *
 * <p>覆盖核心场景：</p>
 * <ul>
 *   <li>构造函数：API Key 缺失告警、超时配置应用</li>
 *   <li>API Key 缺失：generateVideo/generateImage/checkHealth 抛 {@link AiApiUnauthorizedException}</li>
 *   <li>上游 401：API Key 失效场景，抛 {@link AiApiUnauthorizedException}</li>
 *   <li>上游 4xx（非 401）：抛 {@link AiApiException}（HTTP 502）</li>
 *   <li>上游 5xx：抛 {@link AiApiException}（HTTP 502）</li>
 *   <li>网络异常/超时：抛 {@link AiApiException}（HTTP 502）</li>
 *   <li>成功响应：JSON 解析、空响应兜底、非 JSON 响应透传</li>
 *   <li>Authorization 头：Bearer token 正确附加</li>
 * </ul>
 *
 * <p>测试策略：</p>
 * <ol>
 *   <li>使用 {@link MockRestServiceServer} 模拟 Agnes AI 上游 HTTP 响应，
 *       不依赖真实外部服务，保证测试快速与隔离。</li>
 *   <li>通过 {@link ReflectionTestUtils} 将 mock 的 {@link RestClient} 注入到 service 中，
 *       替换构造函数创建的 real RestClient。</li>
 *   <li>API Key 缺失场景无需 mock HTTP，因为 {@code requireApiKey()} 在 HTTP 调用前即抛异常。</li>
 * </ol>
 */
class RealAiVideoServiceTest {

    private AiVideoConfig aiVideoConfig;
    private ObjectMapper objectMapper;
    private RealAiVideoService realAiVideoService;
    private MockRestServiceServer mockServer;

    private static final String API_BASE = "https://test.agnes-ai.com/api";
    private static final String API_KEY = "test-api-key-12345";
    private static final long TIMEOUT_MS = 5000L;

    private static final String VIDEO_URL = API_BASE + "/video/generate";
    private static final String IMAGE_URL = API_BASE + "/image/generate";
    private static final String HEALTH_URL = API_BASE + "/health";

    @BeforeEach
    void setUp() {
        aiVideoConfig = new AiVideoConfig();
        aiVideoConfig.setApiBase(API_BASE);
        aiVideoConfig.setApiKey(API_KEY);
        aiVideoConfig.setTimeoutMs(TIMEOUT_MS);
        objectMapper = new ObjectMapper();

        realAiVideoService = new RealAiVideoService(aiVideoConfig, objectMapper);

        // 将 MockRestServiceServer 绑定到新的 RestClient.Builder，构建 mock RestClient，
        // 并通过反射注入到 service 中，替换构造函数创建的 real RestClient。
        RestClient.Builder builder = RestClient.builder().baseUrl(API_BASE);
        mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient mockRestClient = builder.build();
        ReflectionTestUtils.setField(realAiVideoService, "restClient", mockRestClient);
    }

    // ==================================================================
    // 构造函数测试
    // ==================================================================

    /**
     * 场景 1：构造函数传入有效 API Key → 不抛异常，restClient 字段已初始化。
     */
    @Test
    void constructor_withValidApiKey_shouldInitializeWithoutException() {
        // Arrange & Act：在 setUp 中已构造
        // Assert
        assertNotNull(realAiVideoService, "service 实例不应为 null");
        Object restClient = ReflectionTestUtils.getField(realAiVideoService, "restClient");
        assertNotNull(restClient, "restClient 字段应已初始化");
    }

    /**
     * 场景 2：构造函数传入空 API Key → 不抛异常（仅记录 warn 日志）。
     *
     * <p>API Key 缺失不应阻塞 Spring 容器启动，仅在调用时抛
     * {@link AiApiUnauthorizedException}。</p>
     */
    @Test
    void constructor_withBlankApiKey_shouldNotThrowException() {
        // Arrange
        AiVideoConfig emptyKeyConfig = new AiVideoConfig();
        emptyKeyConfig.setApiBase(API_BASE);
        emptyKeyConfig.setApiKey("");
        emptyKeyConfig.setTimeoutMs(TIMEOUT_MS);

        // Act & Assert：构造函数不应抛异常
        assertDoesNotThrow(() -> new RealAiVideoService(emptyKeyConfig, objectMapper));
    }

    /**
     * 场景 3：构造函数传入 null API Key → 不抛异常。
     */
    @Test
    void constructor_withNullApiKey_shouldNotThrowException() {
        // Arrange
        AiVideoConfig nullKeyConfig = new AiVideoConfig();
        nullKeyConfig.setApiBase(API_BASE);
        nullKeyConfig.setApiKey(null);
        nullKeyConfig.setTimeoutMs(TIMEOUT_MS);

        // Act & Assert
        assertDoesNotThrow(() -> new RealAiVideoService(nullKeyConfig, objectMapper));
    }

    // ==================================================================
    // API Key 缺失测试（不触发 HTTP 调用）
    // ==================================================================

    /**
     * 场景 4：generateVideo 时 API Key 为 null → 抛 AiApiUnauthorizedException，
     * 不发起 HTTP 请求。
     */
    @Test
    void generateVideo_withNullApiKey_shouldThrowAiApiUnauthorizedException() {
        // Arrange：将 apiKey 置为 null
        aiVideoConfig.setApiKey(null);

        // Act & Assert
        AiApiUnauthorizedException ex = assertThrows(AiApiUnauthorizedException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        // Assert：异常信息与 operation
        assertEquals("video", ex.getOperation(), "operation 应为 video");
        assertTrue(ex.getMessage().contains("AGNES_API_KEY"), "异常信息应包含 AGNES_API_KEY");
        assertTrue(ex.getMessage().contains("未配置"), "异常信息应提示未配置");
    }

    /**
     * 场景 5：generateImage 时 API Key 为空白字符串 → 抛 AiApiUnauthorizedException。
     */
    @Test
    void generateImage_withBlankApiKey_shouldThrowAiApiUnauthorizedException() {
        // Arrange
        aiVideoConfig.setApiKey("   ");

        // Act & Assert
        AiApiUnauthorizedException ex = assertThrows(AiApiUnauthorizedException.class,
                () -> realAiVideoService.generateImage(Map.of("prompt", "test")));

        assertEquals("image", ex.getOperation());
        assertTrue(ex.getMessage().contains("AGNES_API_KEY"));
    }

    /**
     * 场景 6：checkHealth 时 API Key 缺失 → 抛 AiApiUnauthorizedException。
     */
    @Test
    void checkHealth_withMissingApiKey_shouldThrowAiApiUnauthorizedException() {
        // Arrange
        aiVideoConfig.setApiKey("");

        // Act & Assert
        AiApiUnauthorizedException ex = assertThrows(AiApiUnauthorizedException.class,
                () -> realAiVideoService.checkHealth());

        assertEquals("health", ex.getOperation());
        assertTrue(ex.getMessage().contains("AGNES_API_KEY"));
    }

    // ==================================================================
    // 上游 401 Unauthorized 测试（API Key 失效场景）
    // ==================================================================

    /**
     * 场景 7：generateVideo 上游返回 401 → 抛 AiApiUnauthorizedException，
     * 提示 API Key 失效或已过期。
     *
     * <p>关键验证点：上游 401 不应抛 {@code AiApiException}（502），
     * 而应抛 {@code AiApiUnauthorizedException}（401），便于前端按错误码精细提示。</p>
     */
    @Test
    void generateVideo_whenUpstreamReturns401_shouldThrowAiApiUnauthorizedException() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .body("Invalid API Key")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act & Assert
        AiApiUnauthorizedException ex = assertThrows(AiApiUnauthorizedException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        // Assert
        assertEquals("video", ex.getOperation());
        assertTrue(ex.getMessage().contains("API Key 失效") || ex.getMessage().contains("已过期"),
                "异常信息应提示 API Key 失效或过期");

        // 验证 mock server 的 expectation 已被消费
        mockServer.verify();
    }

    /**
     * 场景 8：generateImage 上游返回 401 → 抛 AiApiUnauthorizedException。
     */
    @Test
    void generateImage_whenUpstreamReturns401_shouldThrowAiApiUnauthorizedException() {
        // Arrange
        mockServer.expect(requestTo(IMAGE_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .body("Unauthorized")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act & Assert
        AiApiUnauthorizedException ex = assertThrows(AiApiUnauthorizedException.class,
                () -> realAiVideoService.generateImage(Map.of("prompt", "test")));

        assertEquals("image", ex.getOperation());
        mockServer.verify();
    }

    /**
     * 场景 9：checkHealth 上游返回 401 → 抛 AiApiUnauthorizedException。
     */
    @Test
    void checkHealth_whenUpstreamReturns401_shouldThrowAiApiUnauthorizedException() {
        // Arrange
        mockServer.expect(requestTo(HEALTH_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .body("Unauthorized")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act & Assert
        AiApiUnauthorizedException ex = assertThrows(AiApiUnauthorizedException.class,
                () -> realAiVideoService.checkHealth());

        assertEquals("health", ex.getOperation());
        mockServer.verify();
    }

    // ==================================================================
    // 上游 4xx（非 401）测试
    // ==================================================================

    /**
     * 场景 10：generateVideo 上游返回 400 → 抛 AiApiException（HTTP 502）。
     *
     * <p>对应参数错误场景，上游响应体不透传给前端，仅记录在异常对象中。</p>
     */
    @Test
    void generateVideo_whenUpstreamReturns400_shouldThrowAiApiException() {
        // Arrange
        String upstreamBody = "{\"error\":\"Invalid prompt\"}";
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body(upstreamBody)
                        .contentType(MediaType.APPLICATION_JSON));

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        // Assert
        assertEquals("video", ex.getOperation());
        assertEquals(502, ex.getHttpStatus().value(), "HTTP 状态码应为 502");
        assertTrue(ex.getMessage().contains("400"), "异常信息应包含上游状态码 400");
        assertEquals(upstreamBody, ex.getUpstreamBody(), "应保留上游响应体用于日志");
        mockServer.verify();
    }

    /**
     * 场景 11：generateVideo 上游返回 403 Forbidden → 抛 AiApiException。
     */
    @Test
    void generateVideo_whenUpstreamReturns403_shouldThrowAiApiException() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.FORBIDDEN)
                        .body("Forbidden")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        assertEquals("video", ex.getOperation());
        assertEquals(502, ex.getHttpStatus().value());
        assertTrue(ex.getMessage().contains("403"));
        mockServer.verify();
    }

    /**
     * 场景 12：generateVideo 上游返回 404 Not Found → 抛 AiApiException。
     */
    @Test
    void generateVideo_whenUpstreamReturns404_shouldThrowAiApiException() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.NOT_FOUND)
                        .body("Not Found")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        assertEquals("video", ex.getOperation());
        assertTrue(ex.getMessage().contains("404"));
        mockServer.verify();
    }

    // ==================================================================
    // 上游 5xx 测试
    // ==================================================================

    /**
     * 场景 13：generateVideo 上游返回 500 → 抛 AiApiException。
     */
    @Test
    void generateVideo_whenUpstreamReturns500_shouldThrowAiApiException() {
        // Arrange
        String upstreamBody = "{\"error\":\"Internal Server Error\"}";
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(upstreamBody)
                        .contentType(MediaType.APPLICATION_JSON));

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        assertEquals("video", ex.getOperation());
        assertEquals(502, ex.getHttpStatus().value());
        assertTrue(ex.getMessage().contains("500") || ex.getMessage().contains("不可用"));
        assertEquals(upstreamBody, ex.getUpstreamBody());
        mockServer.verify();
    }

    /**
     * 场景 14：generateVideo 上游返回 502 Bad Gateway → 抛 AiApiException。
     */
    @Test
    void generateVideo_whenUpstreamReturns502_shouldThrowAiApiException() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY)
                        .body("Bad Gateway")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        assertEquals("video", ex.getOperation());
        mockServer.verify();
    }

    /**
     * 场景 15：generateVideo 上游返回 503 Service Unavailable → 抛 AiApiException。
     */
    @Test
    void generateVideo_whenUpstreamReturns503_shouldThrowAiApiException() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .body("Service Unavailable")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        assertEquals("video", ex.getOperation());
        assertTrue(ex.getMessage().contains("503") || ex.getMessage().contains("不可用"));
        mockServer.verify();
    }

    // ==================================================================
    // 网络异常 / 超时测试
    // ==================================================================

    /**
     * 场景 16：generateVideo 网络异常（ResourceAccessException） → 抛 AiApiException。
     *
     * <p>对应网络不通、连接超时、读取超时等场景，RestClient 抛出
     * {@link ResourceAccessException}，service 应包装为 {@link AiApiException}（502）。</p>
     */
    @Test
    void generateVideo_whenNetworkError_shouldThrowAiApiException() {
        // Arrange：mock server 响应时抛 ResourceAccessException 模拟网络错误
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(request -> {
                    throw new ResourceAccessException("I/O error: Connection refused");
                });

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        // Assert
        assertEquals("video", ex.getOperation());
        assertEquals(502, ex.getHttpStatus().value(), "网络错误应映射为 502");
        assertNotNull(ex.getCause(), "应保留原始异常 cause");
        assertTrue(ex.getMessage().contains("AI 服务调用失败") || ex.getMessage().contains("Connection refused"),
                "异常信息应包含错误描述");
        mockServer.verify();
    }

    /**
     * 场景 17：generateVideo 读取超时（ResourceAccessException with timeout message）
     * → 抛 AiApiException。
     *
     * <p>对应 Agnes AI 接口响应超时（超过 {@code timeoutMs} 配置），
     * SimpleClientHttpRequestFactory 抛 ResourceAccessException，
     * service 应包装为 {@link AiApiException}。</p>
     */
    @Test
    void generateVideo_whenReadTimeout_shouldThrowAiApiException() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(request -> {
                    throw new ResourceAccessException("I/O error: Read timed out");
                });

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.generateVideo(Map.of("prompt", "test")));

        assertEquals("video", ex.getOperation());
        assertEquals(502, ex.getHttpStatus().value());
        assertTrue(ex.getCause() instanceof ResourceAccessException,
                "cause 应为 ResourceAccessException");
        mockServer.verify();
    }

    /**
     * 场景 18：checkHealth 网络异常 → 抛 AiApiException。
     */
    @Test
    void checkHealth_whenNetworkError_shouldThrowAiApiException() {
        // Arrange
        mockServer.expect(requestTo(HEALTH_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(request -> {
                    throw new ResourceAccessException("I/O error: Connection refused");
                });

        // Act & Assert
        AiApiException ex = assertThrows(AiApiException.class,
                () -> realAiVideoService.checkHealth());

        assertEquals("health", ex.getOperation());
        assertEquals(502, ex.getHttpStatus().value());
        mockServer.verify();
    }

    // ==================================================================
    // 成功响应测试
    // ==================================================================

    /**
     * 场景 19：generateVideo 成功返回 JSON → 解析为 Map。
     */
    @Test
    void generateVideo_withValidJsonResponse_shouldReturnParsedMap() {
        // Arrange
        String responseBody = "{\"id\":\"vid-123\",\"status\":\"completed\",\"videoUrl\":\"https://example.com/v.mp4\"}";
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        // Act
        Map<String, Object> result = realAiVideoService.generateVideo(Map.of("prompt", "test"));

        // Assert
        assertNotNull(result, "响应不应为 null");
        assertEquals("vid-123", result.get("id"));
        assertEquals("completed", result.get("status"));
        assertEquals("https://example.com/v.mp4", result.get("videoUrl"));
        mockServer.verify();
    }

    /**
     * 场景 20：generateVideo 上游返回空 body → 返回兜底 Map（status=ok）。
     */
    @Test
    void generateVideo_withEmptyBody_shouldReturnDefaultMap() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("", MediaType.APPLICATION_JSON));

        // Act
        Map<String, Object> result = realAiVideoService.generateVideo(Map.of("prompt", "test"));

        // Assert
        assertNotNull(result);
        assertEquals("ok", result.get("status"), "空响应应返回 status=ok");
        assertEquals("video", result.get("operation"), "应包含 operation 字段");
        mockServer.verify();
    }

    /**
     * 场景 21：generateVideo 上游返回非 JSON → 返回包含 raw 字段的 Map。
     */
    @Test
    void generateVideo_withNonJsonBody_shouldReturnRawMap() {
        // Arrange
        String nonJsonBody = "OK";
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(nonJsonBody, MediaType.TEXT_PLAIN));

        // Act
        Map<String, Object> result = realAiVideoService.generateVideo(Map.of("prompt", "test"));

        // Assert
        assertNotNull(result);
        assertEquals(nonJsonBody, result.get("raw"), "非 JSON 响应应原样透传到 raw 字段");
        assertEquals("video", result.get("operation"));
        mockServer.verify();
    }

    /**
     * 场景 22：generateVideo 传入 null params → 不抛异常，发送空 body。
     */
    @Test
    void generateVideo_withNullParams_shouldSendEmptyBody() {
        // Arrange
        String responseBody = "{\"id\":\"vid-456\",\"status\":\"pending\"}";
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        // Act：传入 null params 不应抛 NPE
        Map<String, Object> result = assertDoesNotThrow(
                () -> realAiVideoService.generateVideo(null));

        // Assert
        assertNotNull(result);
        assertEquals("vid-456", result.get("id"));
        mockServer.verify();
    }

    /**
     * 场景 23：generateImage 成功返回 JSON → 解析为 Map。
     */
    @Test
    void generateImage_withValidJsonResponse_shouldReturnParsedMap() {
        // Arrange
        String responseBody = "{\"data\":[{\"url\":\"https://example.com/img.jpg\"}]}";
        mockServer.expect(requestTo(IMAGE_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        // Act
        Map<String, Object> result = realAiVideoService.generateImage(Map.of("prompt", "cat"));

        // Assert
        assertNotNull(result);
        assertNotNull(result.get("data"));
        mockServer.verify();
    }

    /**
     * 场景 24：checkHealth 成功返回 JSON → 解析为 Map。
     */
    @Test
    void checkHealth_withValidJsonResponse_shouldReturnParsedMap() {
        // Arrange
        String responseBody = "{\"code\":\"ok\",\"message\":\"healthy\"}";
        mockServer.expect(requestTo(HEALTH_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        // Act
        Map<String, Object> result = realAiVideoService.checkHealth();

        // Assert
        assertNotNull(result);
        assertEquals("ok", result.get("code"));
        assertEquals("healthy", result.get("message"));
        mockServer.verify();
    }

    // ==================================================================
    // Authorization 头测试
    // ==================================================================

    /**
     * 场景 25：generateVideo 应在请求头附加 Authorization: Bearer {apiKey}。
     *
     * <p>关键安全验证点：API Key 通过后端代理附加到请求头，前端无法直接接触，
     * 避免泄露。Content-Type 应为 application/json。</p>
     */
    @Test
    void generateVideo_shouldSendAuthorizationHeader() {
        // Arrange
        String responseBody = "{\"id\":\"vid-789\"}";
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + API_KEY))
                .andExpect(header("Content-Type", "application/json"))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        // Act
        Map<String, Object> result = realAiVideoService.generateVideo(Map.of("prompt", "test"));

        // Assert
        assertNotNull(result);
        mockServer.verify();
    }

    /**
     * 场景 26：checkHealth 应在请求头附加 Authorization: Bearer {apiKey}。
     */
    @Test
    void checkHealth_shouldSendAuthorizationHeader() {
        // Arrange
        mockServer.expect(requestTo(HEALTH_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer " + API_KEY))
                .andRespond(withSuccess("{\"code\":\"ok\"}", MediaType.APPLICATION_JSON));

        // Act
        Map<String, Object> result = realAiVideoService.checkHealth();

        // Assert
        assertNotNull(result);
        mockServer.verify();
    }

    /**
     * 场景 27：generateImage 应在请求头附加 Authorization: Bearer {apiKey}。
     */
    @Test
    void generateImage_shouldSendAuthorizationHeader() {
        // Arrange
        mockServer.expect(requestTo(IMAGE_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + API_KEY))
                .andRespond(withSuccess("{\"url\":\"https://example.com/img.jpg\"}",
                        MediaType.APPLICATION_JSON));

        // Act
        Map<String, Object> result = realAiVideoService.generateImage(Map.of("prompt", "cat"));

        // Assert
        assertNotNull(result);
        mockServer.verify();
    }

    // ==================================================================
    // 异常类型区分测试
    // ==================================================================

    /**
     * 场景 28：AiApiUnauthorizedException 与 AiApiException 类型独立。
     *
     * <p>验证 AiApiUnauthorizedException 不是 AiApiException 的子类，
     * 确保 GlobalExceptionHandler 能分别处理（401 vs 502）。</p>
     */
    @Test
    void aiApiUnauthorizedException_shouldNotBeSubclassOfAiApiException() {
        // Arrange & Act & Assert
        assertFalse(AiApiException.class.isAssignableFrom(AiApiUnauthorizedException.class),
                "AiApiUnauthorizedException 不应是 AiApiException 的子类，"
                        + "确保 GlobalExceptionHandler 能分别处理 401 与 502");
    }

    /**
     * 场景 29：AiApiUnauthorizedException 的 ERROR_CODE 为 "AI_API_UNAUTHORIZED"。
     *
     * <p>验证错误码常量稳定，前端按错误码做精细化提示。</p>
     */
    @Test
    void aiApiUnauthorizedException_errorCodeShouldBeAiApiUnauthorized() {
        assertEquals("AI_API_UNAUTHORIZED", AiApiUnauthorizedException.ERROR_CODE);
    }

    /**
     * 场景 30：AiApiException 的 ERROR_CODE 为 "AI_API_ERROR"。
     */
    @Test
    void aiApiException_errorCodeShouldBeAiApiError() {
        assertEquals("AI_API_ERROR", AiApiException.ERROR_CODE);
    }

    /**
     * 场景 31：AiApiException 的 HTTP 状态码始终为 502。
     */
    @Test
    void aiApiException_httpStatusShouldAlwaysBe502() {
        // Arrange
        mockServer.expect(requestTo(VIDEO_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("error")
                        .contentType(MediaType.TEXT_PLAIN));

        // Act
        try {
            realAiVideoService.generateVideo(Map.of("prompt", "test"));
            throw new AssertionError("应抛出 AiApiException");
        } catch (AiApiException ex) {
            // Assert
            assertEquals(502, ex.getHttpStatus().value(),
                    "AiApiException HTTP 状态码应始终为 502，无论上游状态码");
        }
        mockServer.verify();
    }
}
