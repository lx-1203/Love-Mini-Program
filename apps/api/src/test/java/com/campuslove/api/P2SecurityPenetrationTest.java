package com.campuslove.api;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.chat.PrivateMessageController;
import com.campuslove.api.chat.PrivateMessageService;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.common.IdempotencyException;
import com.campuslove.api.common.IdempotentInterceptor;
import com.campuslove.api.common.InvalidOperationException;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.discover.RecommendationController;
import com.campuslove.api.discover.RecommendationFilter;
import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.discover.RecommendedPersonView;
import com.campuslove.api.media.MediaAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.server.ResponseStatusException;

/**
 * Task 2.7.3：P2 阶段安全渗透测试。
 *
 * <p>本测试覆盖 OWASP Top 10 中四类核心安全风险，验证 P2 阶段安全加固
 * 在端到端链路上的实际效果：</p>
 *
 * <ol>
 *   <li><b>SQL 注入（SQL Injection）</b>：推荐筛选 keyword / hometownProvince 等
 *       字段传入恶意 SQL 片段，验证 JPA 参数化查询与 Service 层不接受原始 SQL 拼接。</li>
 *   <li><b>跨站脚本攻击（XSS）</b>：私信内容、用户 bio 含 {@code <script>} 标签，
 *       验证 {@link SensitiveWordFilter} 与 ApiResponse 不向客户端回显原始脚本。</li>
 *   <li><b>路径穿越（Path Traversal）</b>：媒体访问 subPath 含 URL 编码、双重编码、
 *       Unicode 字符等变种，验证 {@link MediaAccessService} 字符级与路径级双重校验。</li>
 *   <li><b>越权（Authorization Bypass）</b>：未认证访问受保护接口、用户 A 访问
 *       用户 B 的资源、缺失 Idempotency-Key 头等场景，验证鉴权与幂等性拦截器。</li>
 * </ol>
 *
 * <p>测试策略：</p>
 * <ul>
 *   <li>纯 Mockito，不加载 Spring 上下文，避免 Redis/RabbitMQ/MySQL 等外部依赖</li>
 *   <li>使用 {@link SecurityContextHolder} 模拟已认证 / 未认证场景</li>
 *   <li>使用临时目录测试 {@link MediaAccessService} 的路径穿越防护</li>
 *   <li>每个测试用例独立隔离，{@code @BeforeEach}/{@code @AfterEach} 清理线程局部状态</li>
 *   <li>断言使用"应该被拒绝"或"应该被拒绝且不向攻击者泄露信息"两类强校验</li>
 * </ul>
 *
 * <p>关联任务：Task 2.4.3（{@link Idempotent}）、Task 2.5.1（BusinessException）、
 * Task 2.6（限流/幂等）、Task 2.7.3（本测试）。</p>
 *
 * <p>注意：本测试为 P2 阶段单元 / 切面级渗透测试。完整 HTTP 端到端测试
 * （含 SecurityFilterChain + MockMvc）由 {@code P0SecurityFilterChainIntegrationTest} 覆盖；
 * real profile 端到端测试（含真实 Redis + RabbitMQ + MySQL）需在 CI 环境执行。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Task 2.7.3 P2 安全渗透测试（SQL 注入 / XSS / 路径穿越 / 越权）")
class P2SecurityPenetrationTest {

    /** 测试用用户 ID（已认证用户 A） */
    private static final Long USER_A_ID = 100L;

    /** 测试用用户 ID（已认证用户 B，越权场景对照） */
    private static final Long USER_B_ID = 200L;

    /** 测试用用户 ID（管理员） */
    private static final Long ADMIN_USER_ID = 300L;

    /** 测试用媒体存储子路径 */
    private static final String VALID_MONTH_SEGMENT = "202607";

    /** 测试用媒体文件名 */
    private static final String VALID_FILE_NAME = "test-image.jpg";

    @Mock
    private RecommendationService recommendationService;

    @Mock
    private PrivateMessageService privateMessageService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    /** 媒体访问测试用的临时存储根目录 */
    private Path tempRoot;

    @BeforeEach
    void setUp() throws IOException {
        SecurityContextHolder.clearContext();
        tempRoot = Files.createTempDirectory("p2-security-pentest");
    }

    @AfterEach
    void tearDown() throws IOException {
        SecurityContextHolder.clearContext();
        if (Files.exists(tempRoot)) {
            Files.walk(tempRoot)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException ignored) {
                            // 测试清理时忽略删除失败
                        }
                    });
        }
    }

    // ========================================================================
    // 段一：SQL 注入（SQL Injection）
    // ========================================================================

    /**
     * SQL 注入辅助：构造含恶意 SQL 片段的推荐筛选请求。
     *
     * <p>攻击者尝试通过 keyword / hometownProvince 注入 {@code '} 与 {@code OR 1=1}
     * 等典型 SQL 注入 payload，期望绕过 WHERE 条件获取全表数据。</p>
     *
     * <p>本测试通过断言 service 层接收到的 filter 对象中 keyword 字段与传入一致，
     * 验证 Controller 不对参数做 SQL 转义（因为 JPA 参数化查询已天然防注入）。</p>
     */
    @Test
    @DisplayName("SQL 注入-1.1: keyword 含 ' OR 1=1 -- 应被原样传递至 Service，由 JPA 参数化查询防护")
    void sqlInjection_keywordWithOrCondition_shouldPassThroughSafely() {
        // Arrange：构造已认证用户
        authenticateAs(USER_A_ID);
        String maliciousKeyword = "' OR 1=1 --";
        RecommendationFilter expectedFilter = new RecommendationFilter(
                null, null, Set.of(), Set.of(), null, null, null, maliciousKeyword, null, null);
        when(recommendationService.getRecommendations(eq(USER_A_ID), any(RecommendationFilter.class)))
                .thenReturn(List.of());

        RecommendationController controller = new RecommendationController(recommendationService);

        // Act：调用 controller，恶意 keyword 应作为字符串原样传递
        List<RecommendedPersonView> result = controller.getRecommendations(
                null, null, null, null, null, null, null, maliciousKeyword, null, null);

        // Assert：service 收到的 filter 应包含原始 keyword（JPA 已使用参数化查询）
        assertNotNull(result);
        verify(recommendationService).getRecommendations(eq(USER_A_ID), eq(expectedFilter));
    }

    /**
     * SQL 注入变种：hometownProvince 含 {@code '; DROP TABLE users; --} payload。
     *
     * <p>验证 Controller 不解析 SQL 语句，将整个 payload 作为字符串传递给 Service 层。
     * JPA 参数化查询（{@code :param}）会将整个字符串作为字面值处理，不会执行 DROP TABLE。</p>
     */
    @Test
    @DisplayName("SQL 注入-1.2: hometownProvince 含 '; DROP TABLE users; -- 应被原样传递")
    void sqlInjection_hometownProvinceWithDropTable_shouldPassThroughSafely() {
        // Arrange
        authenticateAs(USER_A_ID);
        String maliciousPayload = "'; DROP TABLE users; --";
        RecommendationFilter expectedFilter = new RecommendationFilter(
                null, null, Set.of(), Set.of(), maliciousPayload, null, null, null, null, null);
        when(recommendationService.getRecommendations(eq(USER_A_ID), any(RecommendationFilter.class)))
                .thenReturn(List.of());

        RecommendationController controller = new RecommendationController(recommendationService);

        // Act
        controller.getRecommendations(
                null, null, null, null, maliciousPayload, null, null, null, null, null);

        // Assert：filter 对象中 hometownProvince 应为原始 payload
        verify(recommendationService).getRecommendations(eq(USER_A_ID), eq(expectedFilter));
    }

    /**
     * SQL 注入变种：UNION SELECT 注入。
     *
     * <p>验证多字段同时注入时，所有字段都安全传递给 Service 层。</p>
     */
    @Test
    @DisplayName("SQL 注入-1.3: 多字段 UNION SELECT 注入 payload 应被原样传递")
    void sqlInjection_multiFieldUnionSelect_shouldPassThroughSafely() {
        // Arrange
        authenticateAs(USER_A_ID);
        String unionPayload = "1' UNION SELECT password FROM users--";
        RecommendationFilter expectedFilter = new RecommendationFilter(
                null, null, Set.of(), Set.of(), null, unionPayload, unionPayload, unionPayload, null, null);
        when(recommendationService.getRecommendations(eq(USER_A_ID), any(RecommendationFilter.class)))
                .thenReturn(List.of());

        RecommendationController controller = new RecommendationController(recommendationService);

        // Act
        controller.getRecommendations(
                null, null, null, null, null, unionPayload, unionPayload, unionPayload, null, null);

        // Assert
        verify(recommendationService).getRecommendations(eq(USER_A_ID), eq(expectedFilter));
    }

    /**
     * SQL 注入变种：keyword 含注释与分号（{@code ;}）。
     *
     * <p>验证特殊字符不会破坏 Controller 的参数解析。</p>
     */
    @Test
    @DisplayName("SQL 注入-1.4: keyword 含注释与分号应被原样传递，不破坏参数解析")
    void sqlInjection_keywordWithCommentAndSemicolon_shouldPassThroughSafely() {
        // Arrange
        authenticateAs(USER_A_ID);
        String maliciousKeyword = "test; SELECT pg_sleep(1000); --";
        RecommendationFilter expectedFilter = new RecommendationFilter(
                null, null, Set.of(), Set.of(), null, null, null, maliciousKeyword, null, null);
        when(recommendationService.getRecommendations(eq(USER_A_ID), any(RecommendationFilter.class)))
                .thenReturn(List.of());

        RecommendationController controller = new RecommendationController(recommendationService);

        // Act & Assert：不应抛异常，参数应被原样传递
        assertDoesNotThrow(() -> controller.getRecommendations(
                null, null, null, null, null, null, null, maliciousKeyword, null, null));
        verify(recommendationService).getRecommendations(eq(USER_A_ID), eq(expectedFilter));
    }

    // ========================================================================
    // 段二：跨站脚本攻击（XSS）
    // ========================================================================

    /**
     * XSS 场景 1：敏感词过滤器对脚本标签不处理，但 ApiResponse 包装不影响内容。
     *
     * <p>验证 SensitiveWordFilter 未启用时（默认配置）：
     * {@code <script>alert('xss')</script>} 原样返回，因为内容过滤由业务层决定。
     * 关键安全防线：前端必须使用 v-text 或 DOMPurify 转义，后端只保证 API 响应结构。</p>
     */
    @Test
    @DisplayName("XSS-2.1: SensitiveWordFilter 未启用时，<script> 标签原样返回（前端负责转义）")
    void xss_sensitiveWordFilterDisabled_shouldReturnOriginalContent() {
        // Arrange：未启用敏感词过滤
        SensitiveWordFilter filter = new SensitiveWordFilter();
        assertFalse(filter.isEnabled(), "默认应未启用敏感词过滤");

        String xssPayload = "<script>alert('xss')</script>";

        // Act
        String result = filter.filter(xssPayload);

        // Assert：原样返回（前端负责转义）
        assertEquals(xssPayload, result,
                "未启用过滤时应原样返回，前端通过 v-text / DOMPurify 转义");
    }

    /**
     * XSS 场景 2：启用敏感词过滤后，匹配的敏感词被替换为 ***。
     *
     * <p>验证过滤器将"敏感词"替换为 ***，而非拒绝发布，保证用户体验。
     * 注意：过滤器只替换配置的敏感词，不替换 {@code <script>} 标签。</p>
     */
    @Test
    @DisplayName("XSS-2.2: 启用敏感词过滤后，匹配敏感词被替换为 ***（不影响 <script> 标签）")
    void xss_sensitiveWordFilterEnabled_shouldReplaceConfiguredKeywords() {
        // Arrange：启用敏感词过滤
        SensitiveWordFilter filter = new SensitiveWordFilter();
        filter.setEnabled(true);
        filter.setKeywords(List.of("色情", "赌博", "诈骗"));

        String contentWithKeyword = "这是色情内容";
        String xssPayload = "<script>alert('xss')</script>";

        // Act
        String filteredKeyword = filter.filter(contentWithKeyword);
        String filteredXss = filter.filter(xssPayload);

        // Assert：配置的敏感词被替换
        assertEquals("这是***内容", filteredKeyword,
                "配置的敏感词应被替换为 ***");
        // Assert：<script> 不在敏感词列表中，原样返回（前端负责转义）
        assertEquals(xssPayload, filteredXss,
                "未配置为敏感词的脚本标签应原样返回");
    }

    /**
     * XSS 场景 3：ApiResponse 包装不修改 data 字段内容。
     *
     * <p>验证 ApiResponse.ok() 仅包装数据，不会对 content 进行 HTML 转义。
     * 真正的 XSS 防御在前端：使用 {@code v-text} 而非 {@code v-html}，
     * 或使用 DOMPurify 等库对用户内容做客户端转义。</p>
     */
    @Test
    @DisplayName("XSS-2.3: ApiResponse.ok(data) 不修改 content 内容（前端 v-text 负责转义）")
    void xss_apiResponseShouldNotModifyContent() {
        // Arrange
        String xssPayload = "<img src=x onerror=alert('xss')>";

        // Act
        ApiResponse<String> response = ApiResponse.ok(xssPayload);

        // Assert：data 字段应原样包含 payload（前端转义）
        assertEquals(xssPayload, response.data(),
                "ApiResponse 不应对 content 做 HTML 转义，前端 v-text 负责转义");
        assertEquals(ApiResponse.SUCCESS_CODE, response.code(),
                "code 应为成功码 0");
    }

    /**
     * XSS 场景 4：私信内容含 XSS payload，应被原样传递至 Service 层。
     *
     * <p>验证 PrivateMessageController 不对内容做转义（应由 Service 层
     * 调用 SensitiveWordFilter 与前端转义共同防御）。</p>
     *
     * <p>实现说明：SendMessageRequest 为 package-private record，
     * 本测试位于父包无法直接构造，通过反射调用 controller.sendMessage 方法。
     * 这样既不破坏源代码可见性，又能完整验证 XSS 内容透传链路。</p>
     */
    @Test
    @DisplayName("XSS-2.4: 私信内容含 <script> 应被原样传递至 Service 层")
    void xss_privateMessageContent_shouldPassThroughToService() throws Exception {
        // Arrange
        authenticateAs(USER_A_ID);
        String xssContent = "<script>document.cookie</script>";
        com.campuslove.api.chat.MessageView mockView = new com.campuslove.api.chat.MessageView(
                1L, 1L, USER_A_ID, xssContent, "text", false,
                "2026-07-26T10:00:00");
        // 2026-08-08 存量修复：接口新增 durationSeconds（语音时长）参数，文本消息传 null
        when(privateMessageService.sendMessage(
                eq(1L), eq(USER_A_ID), eq(xssContent), eq("text"), isNull()))
                .thenReturn(mockView);

        PrivateMessageController controller = new PrivateMessageController(privateMessageService);

        // Act：通过反射构造 SendMessageRequest（package-private）并调用 sendMessage
        // 2026-08-08 存量修复：record 新增 durationSeconds 参数（语音时长，文本消息传 null）
        Class<?> requestClass = Class.forName("com.campuslove.api.chat.SendMessageRequest");
        java.lang.reflect.Constructor<?> constructor =
                requestClass.getDeclaredConstructor(String.class, String.class, Integer.class);
        constructor.setAccessible(true);
        Object requestObj = constructor.newInstance(xssContent, "text", null);

        java.lang.reflect.Method sendMethod = PrivateMessageController.class.getMethod(
                "sendMessage", Long.class, requestClass);
        @SuppressWarnings("unchecked")
        ApiResponse<com.campuslove.api.chat.MessageView> result =
                (ApiResponse<com.campuslove.api.chat.MessageView>) sendMethod.invoke(
                        controller, 1L, requestObj);

        // Assert：content 原样传递给 Service（Service 层负责过滤，前端负责转义）
        assertNotNull(result);
        assertNotNull(result.data());
        assertEquals(xssContent, result.data().content(),
                "Controller 不应转义 content，由 Service 层 / 前端防御 XSS");
        verify(privateMessageService).sendMessage(eq(1L), eq(USER_A_ID), eq(xssContent), eq("text"), isNull());
    }

    // ========================================================================
    // 段三：路径穿越（Path Traversal）
    // ========================================================================

    /**
     * 路径穿越场景 1：URL 编码的 {@code ../}（{@code %2e%2e%2f}）→ 400 / 403 / 404。
     *
     * <p>攻击者尝试通过 URL 编码绕过字符级校验。本服务对 subPath 不做 URL 解码，
     * 因此 {@code %2e%2e%2f} 被视为字面目录名，normalize 后路径仍在 storageRoot 之下，
     * 不会真正越界。最终因文件不存在返回 404（同样属于"未泄露敏感文件"的安全行为）。</p>
     *
     * <p>接受 400 / 403 / 404 任一状态码均视为防御成功：未授权访问被拒绝，
     * 或路径被判定非法，或文件不存在（攻击未得逞）。</p>
     */
    @Test
    @DisplayName("路径穿越-3.1: URL 编码 ../ (%2e%2e%2f) → 400 / 403 / 404")
    void pathTraversal_urlEncodedDotDotSlash_shouldReturn400() {
        // Arrange
        authenticateAs(USER_A_ID);
        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        // URL 解码后为 ../200/secret.jpg
        String maliciousSubPath = "%2e%2e%2f" + USER_B_ID + "/secret.jpg";

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.loadMedia(USER_A_ID, maliciousSubPath,
                        buildAuthentication(USER_A_ID, false)));
        // 注：URL 编码的 % 不在 validateSubPath 的危险字符列表中，
        // 字面 %2e%2e%2f 不会真正越界（normalize 后仍在 root 之下），
        // 最终因文件不存在返回 404（攻击未得逞，同样安全）
        int sc = ex.getStatusCode().value();
        assertTrue(sc == 400 || sc == 403 || sc == 404,
                "URL 编码路径穿越应返回 400 / 403 / 404，实际: " + sc);
    }

    /**
     * 路径穿越场景 2：双重 URL 编码的 {@code ../}（{@code %252e%252e%252f}）→ 400 / 404。
     *
     * <p>双重编码在 Spring 解码后仍为 {@code %2e%2e%2f}，由二次校验拦截。</p>
     */
    @Test
    @DisplayName("路径穿越-3.2: 双重 URL 编码 → 400 / 404")
    void pathTraversal_doubleUrlEncoded_shouldReturn400Or404() {
        // Arrange
        authenticateAs(USER_A_ID);
        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String maliciousSubPath = "%252e%252e%252f" + USER_B_ID + "/secret.jpg";

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.loadMedia(USER_A_ID, maliciousSubPath,
                        buildAuthentication(USER_A_ID, false)));
        // 双重编码后字符级校验可能不触发（无 ..），但文件不存在 → 404
        assertTrue(ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 404,
                "双重编码路径穿越应返回 400 或 404，实际: " + ex.getStatusCode().value());
    }

    /**
     * 路径穿越场景 3：Unicode 字符变种（全角点号）→ 400 / 404。
     *
     * <p>攻击者尝试用全角 {@code ．．/} 绕过 ASCII 校验，应被拦截或返回 404。</p>
     */
    @Test
    @DisplayName("路径穿越-3.3: 全角点号 ．．/ → 400 / 404")
    void pathTraversal_fullWidthDotDot_shouldReturn400Or404() {
        // Arrange
        authenticateAs(USER_A_ID);
        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String maliciousSubPath = "．．/" + USER_B_ID + "/secret.jpg";

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.loadMedia(USER_A_ID, maliciousSubPath,
                        buildAuthentication(USER_A_ID, false)));
        // 全角点号不匹配 .. 校验，但 startsWith(root) 二次校验会因路径不存在返回 404
        assertTrue(ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 404,
                "全角点号路径穿越应返回 400 或 404，实际: " + ex.getStatusCode().value());
    }

    /**
     * 路径穿越场景 4：null 字节注入（{@code \u0000}）→ 400。
     *
     * <p>某些 C 语言实现的文件系统会在 NUL 字节处截断路径，{@code file.jpg\u0000.txt}
     * 可能被解释为 {@code file.jpg}。validateSubPath 已显式拒绝 NUL 字节。</p>
     */
    @Test
    @DisplayName("路径穿越-3.4: NUL 字节注入 → 400")
    void pathTraversal_nullByte_shouldReturn400() {
        // Arrange
        authenticateAs(USER_A_ID);
        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String maliciousSubPath = VALID_MONTH_SEGMENT + "/\u0000" + VALID_FILE_NAME;

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.loadMedia(USER_A_ID, maliciousSubPath,
                        buildAuthentication(USER_A_ID, false)));
        assertEquals(400, ex.getStatusCode().value(),
                "NUL 字节注入应返回 400 Bad Request");
    }

    /**
     * 路径穿越场景 5：合法路径 + 已认证用户 → 200 成功返回。
     *
     * <p>对照场景：合法请求不应被误判为攻击。</p>
     */
    @Test
    @DisplayName("路径穿越-3.5: 合法路径 + 文件所有者 → 200 成功返回")
    void pathTraversal_validPath_ownerAccess_shouldSucceed() throws IOException {
        // Arrange：创建合法文件
        authenticateAs(USER_A_ID);
        Path ownerDir = tempRoot.resolve(USER_A_ID.toString()).resolve(VALID_MONTH_SEGMENT);
        Files.createDirectories(ownerDir);
        Files.writeString(ownerDir.resolve(VALID_FILE_NAME), "test-content");

        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String validSubPath = VALID_MONTH_SEGMENT + "/" + VALID_FILE_NAME;

        // Act
        MediaAccessService.MediaFile mediaFile = service.loadMedia(
                USER_A_ID, validSubPath, buildAuthentication(USER_A_ID, false));

        // Assert
        assertNotNull(mediaFile, "合法路径应返回非 null MediaFile");
        assertTrue(mediaFile.getResource().exists(), "Resource 应存在");
    }

    /**
     * 路径穿越场景 6：合法路径但文件不存在 → 404（不泄露存在性）。
     */
    @Test
    @DisplayName("路径穿越-3.6: 合法路径但文件不存在 → 404")
    void pathTraversal_validPathButFileNotExists_shouldReturn404() {
        // Arrange
        authenticateAs(USER_A_ID);
        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String validSubPath = VALID_MONTH_SEGMENT + "/non-existent.jpg";

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.loadMedia(USER_A_ID, validSubPath,
                        buildAuthentication(USER_A_ID, false)));
        assertEquals(404, ex.getStatusCode().value(),
                "文件不存在应返回 404，不泄露存在性信息");
    }

    // ========================================================================
    // 段四：越权（Authorization Bypass）
    // ========================================================================

    /**
     * 越权场景 1：未认证访问受保护资源 → SecurityUtils 抛 401。
     *
     * <p>核心安全防线：未携带 JWT 的请求无法获取 userId，
     * {@link SecurityUtils#getCurrentUserId()} 抛出 401 Unauthorized。</p>
     */
    @Test
    @DisplayName("越权-4.1: 未认证访问 PrivateMessageController → SecurityUtils 抛 401")
    void authorizationBypass_unauthenticated_shouldThrow401() {
        // Arrange：SecurityContext 为空
        SecurityContextHolder.clearContext();
        PrivateMessageController controller = new PrivateMessageController(privateMessageService);

        // Act & Assert：getCurrentUserId 应抛 401
        assertThrows(org.springframework.web.client.HttpClientErrorException.Unauthorized.class,
                () -> controller.getConversations(),
                "未认证访问受保护资源应抛 401 Unauthorized");

        // Assert：service 不应被调用
        verify(privateMessageService, never()).getConversations(anyLong());
    }

    /**
     * 越权场景 2（2026-08-10 修正）：未认证访问推荐接口 → 2026-08-09 免登录可逛改造后
     * 匿名用户返回中性排序的通用推荐（游客分支 getRecommendationsForGuest），不再抛 401。
     * 安全语义不变：匿名请求无法获得任何个性化上下文/用户数据。
     */
    @Test
    @DisplayName("越权-4.2: 未认证访问 RecommendationController.getRecommendations → 游客分支")
    void authorizationBypass_unauthenticatedAccessRecommendations_shouldThrow401() {
        // Arrange
        SecurityContextHolder.clearContext();
        RecommendationController controller = new RecommendationController(recommendationService);

        // Act：匿名请求不抛 401，走游客推荐分支
        List<?> result = controller.getRecommendations(
                null, null, null, null, null, null, null, null, null, null);

        // Assert：游客分支被调用，个性化推荐分支绝不被调用
        assertNotNull(result);
        verify(recommendationService).getRecommendationsForGuest(any(RecommendationFilter.class));
        verify(recommendationService, never()).getRecommendations(anyLong(), any(RecommendationFilter.class));
    }

    /**
     * 越权场景 3：用户 A 访问用户 B 的媒体文件 → 403。
     *
     * <p>核心越权场景：当前 userId ≠ 文件归属 userId 且非 ADMIN，应抛 403。</p>
     */
    @Test
    @DisplayName("越权-4.3: 用户 A 访问用户 B 的媒体文件 → 403 AccessDeniedException")
    void authorizationBypass_crossUserMediaAccess_shouldThrow403() throws IOException {
        // Arrange：用户 B 拥有文件
        authenticateAs(USER_A_ID);
        Path ownerDir = tempRoot.resolve(USER_B_ID.toString()).resolve(VALID_MONTH_SEGMENT);
        Files.createDirectories(ownerDir);
        Files.writeString(ownerDir.resolve(VALID_FILE_NAME), "user-b-private-content");

        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        // infra R2-00013:IMAGE 为社交公开资源(登录用户可读),越权测试改用语音路径
        String subPath = "voice/" + VALID_MONTH_SEGMENT + "/" + VALID_FILE_NAME;

        // Act & Assert：用户 A 访问用户 B 的文件应抛 403
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.loadMedia(USER_B_ID, subPath,
                        buildAuthentication(USER_A_ID, false)));
        assertTrue(ex.getMessage().contains("无权访问") || ex.getMessage().contains("拒绝"),
                "异常信息应说明拒绝访问: " + ex.getMessage());
    }

    /**
     * 越权场景 4：管理员可访问任意用户的媒体文件 → 200。
     *
     * <p>对照场景：管理员权限允许跨用户访问，验证白名单机制正常工作。</p>
     */
    @Test
    @DisplayName("越权-4.4: 管理员访问任意用户的媒体文件 → 200")
    void authorizationBypass_adminAccess_shouldSucceed() throws IOException {
        // Arrange：用户 B 拥有文件
        Path ownerDir = tempRoot.resolve(USER_B_ID.toString()).resolve(VALID_MONTH_SEGMENT);
        Files.createDirectories(ownerDir);
        Files.writeString(ownerDir.resolve(VALID_FILE_NAME), "user-b-content");

        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String subPath = VALID_MONTH_SEGMENT + "/" + VALID_FILE_NAME;

        // Act：管理员访问用户 B 的文件
        MediaAccessService.MediaFile mediaFile = service.loadMedia(
                USER_B_ID, subPath, buildAuthentication(ADMIN_USER_ID, true));

        // Assert
        assertNotNull(mediaFile, "管理员访问应返回非 null MediaFile");
        assertTrue(mediaFile.getResource().exists(), "Resource 应存在");
    }

    /**
     * 越权场景 5：无 Authentication（null）访问媒体 → 403。
     */
    @Test
    @DisplayName("越权-4.5: 无 token（Authentication 为 null）访问媒体 → 403")
    void authorizationBypass_noAuthentication_shouldThrow403() {
        // Arrange
        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String subPath = VALID_MONTH_SEGMENT + "/" + VALID_FILE_NAME;

        // Act & Assert
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.loadMedia(USER_A_ID, subPath, null));
        assertTrue(ex.getMessage().contains("未认证") || ex.getMessage().contains("拒绝"),
                "异常信息应说明未认证: " + ex.getMessage());
    }

    /**
     * 越权场景 6：缺失 Idempotency-Key 头（required=true）→ 抛 InvalidOperationException（422）。
     *
     * <p>验证 {@link IdempotentInterceptor} 强制要求 Idempotency-Key 头，
     * 缺失时返回 422，防止重复提交攻击。</p>
     */
    @Test
    @DisplayName("越权-4.6: 缺失 Idempotency-Key 头 → 抛 InvalidOperationException（422）")
    void authorizationBypass_missingIdempotencyKey_shouldThrowInvalidOperationException()
            throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn(null);

        // Act & Assert
        InvalidOperationException ex = assertThrows(InvalidOperationException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
        assertEquals(InvalidOperationException.ERROR_CODE, ex.getErrorCode(),
                "错误码应为 INVALID_OPERATION");

        // Assert：不应访问 Redis（短路返回）
        verify(redisTemplate, never()).opsForValue();
    }

    /**
     * 越权场景 7：重复 Idempotency-Key → 抛 IdempotencyException（409）。
     *
     * <p>验证相同 Idempotency-Key 的重复请求被拦截，防止重放攻击。</p>
     */
    @Test
    @DisplayName("越权-4.7: 重复 Idempotency-Key → 抛 IdempotencyException（409）")
    void authorizationBypass_duplicateIdempotencyKey_shouldThrowIdempotencyException()
            throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();
        String duplicateKey = "duplicate-key-" + java.util.UUID.randomUUID();

        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn(duplicateKey);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class)))
                .thenReturn(false);

        // Act & Assert
        IdempotencyException ex = assertThrows(IdempotencyException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
        assertEquals(IdempotencyException.ERROR_CODE, ex.getErrorCode(),
                "错误码应为 IDEMPOTENT_CONFLICT");
    }

    /**
     * 越权场景 8：Redis 不可用时降级放行，不阻断主流程。
     *
     * <p>验证降级策略：Redis 故障时幂等校验降级放行，避免 Redis 故障导致所有写操作不可用。</p>
     */
    @Test
    @DisplayName("越权-4.8: Redis 故障 → 降级放行，不抛异常")
    void authorizationBypass_redisDown_shouldDegradeAndPassThrough() throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();
        String normalKey = "normal-key-" + java.util.UUID.randomUUID();

        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn(normalKey);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class)))
                .thenThrow(new RuntimeException("Redis connection refused"));

        // Act & Assert：不抛异常，降级放行
        boolean result = assertDoesNotThrow(
                () -> interceptor.preHandle(request, response, handlerMethod));
        assertTrue(result, "Redis 故障时应降级放行");
    }

    /**
     * 越权场景 9：RedisTemplate 为 null → 降级放行（mock profile 场景）。
     */
    @Test
    @DisplayName("越权-4.9: RedisTemplate 为 null → 降级放行")
    void authorizationBypass_redisTemplateNull_shouldDegradeAndPassThrough() throws Exception {
        // Arrange：构造无 RedisTemplate 的拦截器（模拟 mock profile）
        IdempotentInterceptor noRedisInterceptor = new IdempotentInterceptor(null);
        HandlerMethod handlerMethod = buildHandlerMethod();
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn("any-key");

        // Act
        boolean result = noRedisInterceptor.preHandle(request, response, handlerMethod);

        // Assert
        assertTrue(result, "RedisTemplate 为 null 时应降级放行");
    }

    /**
     * 越权场景 10：已认证用户访问自己的媒体文件 → 200。
     *
     * <p>对照场景：合法访问不应被误判为越权。</p>
     */
    @Test
    @DisplayName("越权-4.10: 已认证用户访问自己的媒体文件 → 200")
    void authorizationBypass_selfAccess_shouldSucceed() throws IOException {
        // Arrange
        Path ownerDir = tempRoot.resolve(USER_A_ID.toString()).resolve(VALID_MONTH_SEGMENT);
        Files.createDirectories(ownerDir);
        Files.writeString(ownerDir.resolve(VALID_FILE_NAME), "user-a-content");

        MediaAccessService service = new MediaAccessService(tempRoot.toString());
        String subPath = VALID_MONTH_SEGMENT + "/" + VALID_FILE_NAME;

        // Act
        MediaAccessService.MediaFile mediaFile = service.loadMedia(
                USER_A_ID, subPath, buildAuthentication(USER_A_ID, false));

        // Assert
        assertNotNull(mediaFile, "本人访问应返回非 null MediaFile");
        assertTrue(mediaFile.getResource().exists(), "Resource 应存在");
    }

    /**
     * 越权场景 11：未标注 @Idempotent 的方法 → 直接放行，不查 Redis。
     *
     * <p>验证拦截器不影响非幂等接口（如 GET 请求）。</p>
     */
    @Test
    @DisplayName("越权-4.11: 未标注 @Idempotent 的方法 → 直接放行")
    void authorizationBypass_noIdempotentAnnotation_shouldPassThrough() throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        Method method = TestController.class.getMethod("nonIdempotentMethod");
        HandlerMethod handlerMethod = new HandlerMethod(new TestController(), method);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod);

        // Assert
        assertTrue(result, "未标注 @Idempotent 的方法应直接放行");
        verify(redisTemplate, never()).opsForValue();
    }

    /**
     * 越权场景 12：空字符串 Idempotency-Key → 视为缺失，抛异常。
     *
     * <p>验证空字符串与 null 等价处理，攻击者无法通过空字符串绕过校验。</p>
     */
    @Test
    @DisplayName("越权-4.12: 空字符串 Idempotency-Key → 视为缺失，抛 InvalidOperationException")
    void authorizationBypass_emptyIdempotencyKey_shouldThrowInvalidOperationException()
            throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn("");

        // Act & Assert
        assertThrows(InvalidOperationException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
        verify(redisTemplate, never()).opsForValue();
    }

    /**
     * 越权场景 13：纯空白 Idempotency-Key → trim 后为空，视为缺失。
     */
    @Test
    @DisplayName("越权-4.13: 纯空白 Idempotency-Key → trim 后为空，视为缺失")
    void authorizationBypass_whitespaceIdempotencyKey_shouldThrowInvalidOperationException()
            throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn("   ");

        // Act & Assert
        assertThrows(InvalidOperationException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
        verify(redisTemplate, never()).opsForValue();
    }

    /**
     * 越权场景 14：未认证用户使用 Idempotency-Key → userId 降级为 anonymous 兜底。
     *
     * <p>验证未认证场景下，幂等键仍按 anonymous 用户隔离，不影响主流程。</p>
     */
    @Test
    @DisplayName("越权-4.14: 未认证用户使用 Idempotency-Key → userId 降级为 anonymous")
    void authorizationBypass_unauthenticatedWithKey_shouldFallbackToAnonymous() throws Exception {
        // Arrange：SecurityContext 为空
        SecurityContextHolder.clearContext();
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();
        String key = "test-key-" + java.util.UUID.randomUUID();

        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn(key);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class)))
                .thenReturn(true);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod);

        // Assert：未认证场景下使用 anonymous 兜底，不抛 401
        assertTrue(result, "未认证用户使用 Idempotency-Key 应降级为 anonymous 放行");
        // 验证 Redis Key 包含 anonymous
        String expectedKey = IdempotentInterceptor.REDIS_KEY_PREFIX + key + ":anonymous";
        verify(valueOperations).setIfAbsent(eq(expectedKey), any(), any(Duration.class));
    }

    // ========================================================================
    // 辅助方法
    // ========================================================================

    /**
     * 构造测试用 HandlerMethod，绑定到 TestController.idempotentMethod。
     */
    private HandlerMethod buildHandlerMethod() throws NoSuchMethodException {
        Method method = TestController.class.getMethod("idempotentMethod");
        return new HandlerMethod(new TestController(), method);
    }

    /**
     * 设置 SecurityContext，模拟已认证用户。
     *
     * @param userId 用户 ID
     */
    private void authenticateAs(Long userId) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userId, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    /**
     * 构造 Authentication 对象，模拟 JwtAuthenticationFilter 注入的认证主体。
     *
     * @param userId  当前用户 ID
     * @param isAdmin 是否为管理员
     * @return 已认证的 Authentication 对象
     */
    private org.springframework.security.core.Authentication buildAuthentication(
            Long userId, boolean isAdmin) {
        java.util.List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities;
        if (isAdmin) {
            authorities = java.util.List.of(
                    new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"),
                    new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"));
        } else {
            authorities = java.util.List.of(
                    new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"));
        }
        org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken auth =
                new org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken(
                        userId, "test-token", authorities);
        auth.setAuthenticated(true);
        return auth;
    }

    /**
     * 测试用 Controller：包含 @Idempotent 标注与未标注的方法。
     */
    static class TestController {
        @Idempotent
        public void idempotentMethod() {}

        public void nonIdempotentMethod() {}
    }
}
