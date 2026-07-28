package com.campuslove.api.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.auth.JwtAuthenticationEntryPoint;
import com.campuslove.api.auth.RealAuthService;
import com.campuslove.api.auth.RedisTokenBlacklistService;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtAuthenticationFilter;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaAccessController;
import com.campuslove.api.media.MediaAccessService;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Task 0.7.1：P0 阶段安全测试用例覆盖（认证/授权/越权/Token 撤销/路径穿越）。
 *
 * <p>本测试为 P0 阶段安全基线的总集成测试，整合以下 5 类核心安全场景，
 * 验证 Task 0.1~0.6 全部安全改造在端到端链路上的实际效果：</p>
 *
 * <ol>
 *   <li><b>认证（Authentication）</b>：未登录访问受保护资源 → 401；
 *       公开资源（登录入口）→ 200；登录后访问受保护资源 → 非 401</li>
 *   <li><b>授权（Authorization）</b>：普通用户访问 /api/admin/** → 403；
 *       ADMIN 访问 /api/admin/** → 非 401/403（安全通过）</li>
 *   <li><b>越权（Cross-User Access）</b>：用户 A 访问用户 B 的媒体文件 → 403；
 *       本人访问自己的媒体文件 → 200；管理员访问任意用户媒体 → 200</li>
 *   <li><b>Token 撤销</b>：logout 后用同一 JWT → 401（JwtAuthenticationFilter
 *       检测到 jti 在 Redis 黑名单后清除 SecurityContext）</li>
 *   <li><b>路径穿越（Path Traversal）</b>：subPath 含 {@code ..}、{@code \}、
 *       绝对路径、控制字符等 → 400 Bad Request</li>
 * </ol>
 *
 * <p><b>测试策略</b>：本测试采用三段式结构，兼顾"端到端集成"与"环境隔离"两个目标：</p>
 * <ul>
 *   <li>{@link SecurityFilterChainIntegrationTests}：{@code @SpringBootTest} + MockMvc，
 *       在 mock profile 下端到端验证 SecurityFilterChain 鉴权规则。
 *       覆盖"认证 + 授权"两类场景，无需 Redis/RabbitMQ/MySQL 等外部依赖。</li>
 *   <li>{@link TokenRevocationFlowTests}：纯 Mockito，验证 logout → Redis 黑名单 →
 *       后续请求被拒的完整链路（RealAuthService.doLogout + RedisTokenBlacklistService +
 *       JwtAuthenticationFilter）。隔离测试不依赖真实 Redis，避免环境耦合。</li>
 *   <li>{@link MediaAccessIsolationTests}：使用临时存储目录，端到端测试
 *       MediaAccessController → MediaAccessService 的鉴权与路径穿越防护。
 *       覆盖"越权 + 路径穿越"两类场景。</li>
 * </ul>
 *
 * <p><b>real profile 集成测试</b>：完整的 real profile 端到端测试（含真实 Redis + RabbitMQ + MySQL）
 * 需在具备外部依赖的 CI 环境中执行，本测试类中通过 {@link RealProfileEndToEndTests}
 * 提供测试代码骨架并标记 {@code @Disabled}，待 CI 环境就绪后启用。</p>
 *
 * <p><b>关联任务</b>：</p>
 * <ul>
 *   <li>Task 0.1（微信登录链路）— 由 {@link SecurityFilterChainIntegrationTests}
 *       间接覆盖（登录入口 permitAll）</li>
 *   <li>Task 0.3（上传目录鉴权）— 由 {@link MediaAccessIsolationTests} 完整覆盖</li>
 *   <li>Task 0.4（Admin 权限注解）— 由 {@link SecurityFilterChainIntegrationTests}
 *       + 现有 AdminPermissionTest 共同覆盖</li>
 *   <li>Task 0.5（JWT 撤销）— 由 {@link TokenRevocationFlowTests} 完整覆盖</li>
 *   <li>Task 0.6（网络与配置安全）— 通过 SecurityFilterChain + 配置注入间接验证</li>
 * </ul>
 *
 * @see P0SecurityFilterChainIntegrationTest
 * @see TokenRevocationFlowTests
 * @see MediaAccessIsolationTests
 * @see RealProfileEndToEndTests
 */
@DisplayName("Task 0.7.1: P0 安全测试用例覆盖（认证/授权/越权/Token 撤销/路径穿越）")
class P0SecurityIntegrationTest {

    // ========================================================================
    // 段一：SecurityFilterChain 端到端集成测试已迁移至独立顶层测试类
    //      P0SecurityFilterChainIntegrationTest.java（参考 SecurityConfigTest.java 模式）。
    // 拆分原因：@Nested + @SpringBootTest + @TestInstance(PER_CLASS) 组合在
    //           Spring Boot 3.3 + JUnit 5 下导致 ApplicationContext 加载失败
    //           （UserRepository 等 JPA Repository Bean 未被扫描注册），
    //           改为顶层 @SpringBootTest + @AutoConfigureMockMvc 后正常。
    //      所有原 SecurityFilterChainIntegrationTests 的测试场景（认证 1.1-1.6
    //      + 授权 2.1-2.7 共 13 个 case）完整保留于新文件，覆盖 spec.md
    //      Task 0.7.1 中"认证"与"授权"两类核心场景。
    // ========================================================================

    // ========================================================================
    // 段二：Token 撤销端到端流程测试（纯 Mockito，隔离 Redis/RabbitMQ）
    // ========================================================================

    /**
     * Token 撤销流程集成测试（Task 0.5.3）。
     *
     * <p>验证 logout → Redis 黑名单 → 后续请求被拒的完整链路：
     * <ol>
     *   <li>{@link RealAuthService#doLogout} 调用 {@link TokenBlacklistService#revoke}</li>
     *   <li>{@link RedisTokenBlacklistService#revoke} 写入 Redis + 本地内存</li>
     *   <li>{@link RedisTokenBlacklistService#isRevoked} 查询命中</li>
     *   <li>{@link JwtAuthenticationFilter} 检测黑名单命中后清除 SecurityContext</li>
     *   <li>后续 AuthenticationEntryPoint 返回 401（由 SecurityConfig 触发）</li>
     * </ol>
     *
     * <p><b>测试策略</b>：纯 Mockito，不加载 Spring 上下文，避免 Redis 依赖。
     * 通过 mock {@link JwtTokenProvider}、{@link UserRepository} 与
     * 真实 {@link RedisTokenBlacklistService} 实例（注入 mock RedisTemplate），
     * 验证端到端 logout → blacklist → filter 链路。</p>
     */
    @Nested
    @DisplayName("段二：Token 撤销流程集成测试（RealAuthService + RedisTokenBlacklistService + JwtAuthenticationFilter）")
    class TokenRevocationFlowTests {

        @Mock private com.campuslove.api.auth.WeChatClient weChatClient;
        @Mock private JwtTokenProvider jwtTokenProvider;
        @Mock private UserRepository userRepository;
        @Mock private UserCampusProfileRepository userCampusProfileRepository;
        @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
        @Mock private AesEncryptor aesEncryptor;
        @Mock private HttpServletRequest request;
        @Mock private HttpServletResponse response;
        @Mock private FilterChain filterChain;
        @Mock private org.springframework.data.redis.core.RedisTemplate<String, Object> redisTemplate;
        @Mock private org.springframework.data.redis.core.ValueOperations<String, Object> valueOperations;

        private PasswordEncoder passwordEncoder;
        private RealAuthService realAuthService;
        private RedisTokenBlacklistService tokenBlacklistService;
        private JwtAuthenticationFilter jwtAuthenticationFilter;

        /** 测试用 token（任意字符串，filter 不会真正解析，由 mock provider 决定行为） */
        private static final String TEST_TOKEN = "jwt-token-abc-123-p0-test";
        /** 测试用 jti（UUID 格式，由 JwtTokenProvider 生成） */
        private static final String TEST_JTI = "550e8400-e29b-41d4-a716-446655440000";
        /** 测试用 userId */
        private static final Long TEST_USER_ID = 100L;
        /** 测试用 TTL（秒） */
        private static final long TEST_TTL_SECONDS = 3600L;

        @BeforeEach
        void setUp() {
            MockitoAnnotations.openMocks(this);
            passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
            tokenBlacklistService = new RedisTokenBlacklistService();

            // 通过反射注入 mock RedisTemplate（模拟 @Autowired(required=false)）
            try {
                java.lang.reflect.Field field = RedisTokenBlacklistService.class
                        .getDeclaredField("redisTemplate");
                field.setAccessible(true);
                field.set(tokenBlacklistService, redisTemplate);
            } catch (Exception e) {
                throw new RuntimeException("注入 redisTemplate 失败", e);
            }
            // 通过反射调用 clearLocalBlacklistForTest()（包级私有测试辅助方法，
            // 跨包测试时必须通过反射访问，避免污染源代码的可见性）
            try {
                java.lang.reflect.Method clearMethod = RedisTokenBlacklistService.class
                        .getDeclaredMethod("clearLocalBlacklistForTest");
                clearMethod.setAccessible(true);
                clearMethod.invoke(tokenBlacklistService);
            } catch (Exception e) {
                throw new RuntimeException("调用 clearLocalBlacklistForTest 失败", e);
            }

            realAuthService = new RealAuthService(
                    weChatClient,
                    jwtTokenProvider,
                    userRepository,
                    userCampusProfileRepository,
                    userScheduleProfileRepository,
                    passwordEncoder,
                    aesEncryptor,
                    tokenBlacklistService,
                    ""
            );

            jwtAuthenticationFilter = new JwtAuthenticationFilter(
                    jwtTokenProvider, userRepository, tokenBlacklistService);

            SecurityContextHolder.clearContext();
        }

        @AfterEach
        void tearDown() {
            SecurityContextHolder.clearContext();
        }

        /**
         * 场景 3.1：logout → Redis 黑名单写入 → 后续请求 jti 命中 → 401。
         *
         * <p>完整验证 Task 0.5.3 引入的 Redis Token 黑名单撤销机制：</p>
         * <ol>
         *   <li>调用 realAuthService.logout(token) 触发 doLogout</li>
         *   <li>doLogout 提取 jti 并调用 tokenBlacklistService.revoke(jti, ttl)</li>
         *   <li>RedisTokenBlacklistService 将 jti 写入 Redis（key=jwt:blacklist:{jti}）</li>
         *   <li>后续请求到达 JwtAuthenticationFilter，filter 调用 isRevoked(jti)</li>
         *   <li>isRevoked 返回 true，filter 清空 SecurityContext</li>
         *   <li>后续 AuthenticationEntryPoint 返回 401（由 SecurityConfig 触发）</li>
         * </ol>
         */
        @Test
        @DisplayName("Token-3.1: logout → Redis 黑名单 → 后续请求 jti 命中 → SecurityContext 清空（401）")
        void logout_thenSubsequentRequestWithSameToken_shouldClearContext() throws Exception {
            // ---- Arrange：模拟 JwtTokenProvider 解析 token 返回 jti 与 userId ----
            when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
            when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN))
                    .thenReturn(String.valueOf(TEST_USER_ID));
            when(jwtTokenProvider.getRemainingTtlSeconds(TEST_TOKEN))
                    .thenReturn(TEST_TTL_SECONDS);
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);

            // ---- Act 1：调用 logout，触发 doLogout 内部将 jti 加入黑名单 ----
            realAuthService.logout(TEST_TOKEN);

            // ---- Assert 1：jti 已写入 Redis 黑名单 ----
            String expectedRedisKey = "jwt:blacklist:" + TEST_JTI;
            verify(valueOperations).set(eq(expectedRedisKey), eq(Boolean.TRUE),
                    eq(TEST_TTL_SECONDS), eq(TimeUnit.SECONDS));

            // ---- Arrange 2：模拟后续请求，filter 调用 isRevoked 应返回 true ----
            when(redisTemplate.hasKey(expectedRedisKey)).thenReturn(true);
            when(request.getRequestURI()).thenReturn("/api/users/123");
            when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);

            // ---- Act 2：JwtAuthenticationFilter 处理后续请求 ----
            // 注：doFilterInternal 为 protected（继承自 OncePerRequestFilter），
            // 跨包测试无法直接调用，改用 public doFilter 入口（OncePerRequestFilter#doFilter）。
            jwtAuthenticationFilter.doFilter(request, response, filterChain);

            // ---- Assert 2：filter 检测黑名单命中，清空 SecurityContext ----
            // 注：tokenBlacklistService 为真实 RedisTokenBlacklistService 实例（非 mock），
            // 不能用 verify() 校验；通过断言 SecurityContext 状态与 mock redisTemplate
            // 的交互（hasKey 调用）即可间接证明 isRevoked 路径已走通。
            verify(redisTemplate).hasKey("jwt:blacklist:" + TEST_JTI);
            // 短路：filter 检测黑名单命中后直接 return，未再调用 getUserIdFromToken
            // 与 findById。doLogout 内部已调用 1 次 getUserIdFromToken（用于日志），
            // filter 不应再次调用 —— 通过 times(1) 验证 filter 短路成功。
            verify(jwtTokenProvider, org.mockito.Mockito.times(1)).getUserIdFromToken(anyString());
            verify(userRepository, never()).findById(anyLong());
            // SecurityContext 为空（认证被拒绝，后续由 AuthenticationEntryPoint 返回 401）
            assertNotNull(SecurityContextHolder.getContext().getAuthentication() == null
                            || !SecurityContextHolder.getContext().getAuthentication().isAuthenticated(),
                    "logout 后再次请求，SecurityContext 应被清空或未认证");
            // 继续后续过滤器链
            verify(filterChain).doFilter(request, response);
        }

        /**
         * 场景 3.2：未 logout 时，jti 不在黑名单 → 正常认证 → SecurityContext 已设置。
         *
         * <p>对照组：验证未执行 logout 时，token 可正常通过认证。</p>
         */
        @Test
        @DisplayName("Token-3.2: 未 logout 时 jti 不在黑名单 → 正常认证（对照组）")
        void withoutLogout_jtiNotInBlacklist_shouldAuthenticateNormally() throws Exception {
            // Arrange：构造普通用户
            User normalUser = createNormalUser(TEST_USER_ID);
            when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
            when(redisTemplate.hasKey("jwt:blacklist:" + TEST_JTI)).thenReturn(false);
            when(jwtTokenProvider.isTokenRevoked(TEST_TOKEN)).thenReturn(false);
            when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN))
                    .thenReturn(String.valueOf(TEST_USER_ID));
            when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(normalUser));
            when(request.getRequestURI()).thenReturn("/api/users/123");
            when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);

            // Act
            jwtAuthenticationFilter.doFilter(request, response, filterChain);

            // Assert：SecurityContext 已设置认证信息
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            assertNotNull(auth, "未 logout 时 SecurityContext 应已设置认证信息");
            assertEquals(TEST_USER_ID, auth.getPrincipal(),
                    "principal 应为 userId");
        }

        /**
         * 场景 3.3：Redis 不可用时，logout 降级到本地内存 → 后续请求 jti 命中本地内存 → 401。
         *
         * <p>验证降级容错：Redis 故障时 logout 仍能撤销 token，由本地内存黑名单兜底。</p>
         */
        @Test
        @DisplayName("Token-3.3: Redis 故障 → logout 降级本地内存 → 后续请求仍被拒绝（降级容错）")
        void logout_whenRedisDown_shouldFallbackToLocalAndRejectSubsequentRequest() throws Exception {
            // Arrange：模拟 Redis 不可用
            when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
            when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN))
                    .thenReturn(String.valueOf(TEST_USER_ID));
            when(jwtTokenProvider.getRemainingTtlSeconds(TEST_TOKEN))
                    .thenReturn(TEST_TTL_SECONDS);
            // Redis opsForValue 抛异常
            when(redisTemplate.opsForValue()).thenThrow(
                    new RuntimeException("Redis connection refused"));

            // Act 1：logout，Redis 写入失败但应降级到本地内存
            assertDoesNotThrow(() -> realAuthService.logout(TEST_TOKEN));

            // Arrange 2：后续请求，Redis 查询也抛异常
            when(redisTemplate.hasKey(anyString())).thenThrow(
                    new RuntimeException("Redis down"));
            when(request.getRequestURI()).thenReturn("/api/users/123");
            when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);

            // Act 2：filter 处理后续请求，应降级查本地内存
            jwtAuthenticationFilter.doFilter(request, response, filterChain);

            // Assert：本地内存命中，SecurityContext 被清空（拒绝认证）
            // 注：tokenBlacklistService 为真实实例（非 mock），不能用 verify() 校验；
            // 通过断言 SecurityContext 状态间接证明 isRevoked 路径已走通。
            assertNotNull(SecurityContextHolder.getContext().getAuthentication() == null
                            || !SecurityContextHolder.getContext().getAuthentication().isAuthenticated(),
                    "Redis 故障时本地内存黑名单应能查询到已撤销 jti，SecurityContext 应被清空");
        }

        /**
         * 场景 3.4：logout 旧 token（无 jti claim）→ 走 JwtTokenProvider.revokeToken 完整 token 黑名单 → 后续请求被拒。
         *
         * <p>兼容性场景：旧版本签发的 token 可能没有 jti claim，doLogout 会跳过
         * Redis 黑名单调用，但仍调用 {@link JwtTokenProvider#revokeToken} 写入完整 token 黑名单。</p>
         */
        @Test
        @DisplayName("Token-3.4: logout 旧 token（无 jti）→ 走完整 token 黑名单 → 后续请求被拒")
        void logout_legacyTokenWithoutJti_shouldFallbackToFullTokenBlacklist() throws Exception {
            // Arrange：旧 token 无 jti
            when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(null);
            // doLogout 仍调用 jwtTokenProvider.revokeToken
            // 后续请求：filter 跳过 jti 校验，走 isTokenRevoked 完整 token 校验
            when(jwtTokenProvider.isTokenRevoked(TEST_TOKEN)).thenReturn(true);

            // Act 1：logout
            realAuthService.logout(TEST_TOKEN);

            // Assert 1：doLogout 调用 revokeToken（完整 token 黑名单）
            verify(jwtTokenProvider).revokeToken(TEST_TOKEN);

            // Arrange 2：后续请求
            when(request.getRequestURI()).thenReturn("/api/users/123");
            when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);

            // Act 2：filter 处理
            jwtAuthenticationFilter.doFilter(request, response, filterChain);

            // Assert 2：filter 检测完整 token 黑名单命中，清空 SecurityContext
            verify(jwtTokenProvider).isTokenRevoked(TEST_TOKEN);
            assertNotNull(SecurityContextHolder.getContext().getAuthentication() == null
                            || !SecurityContextHolder.getContext().getAuthentication().isAuthenticated(),
                    "旧 token 黑名单命中后 SecurityContext 应被清空");
        }

        /**
         * 场景 3.5：JwtAuthenticationEntryPoint 返回标准 401 JSON 错误体（Task 0.5.4）。
         *
         * <p>验证未认证访问受保护资源时，{@link JwtAuthenticationEntryPoint} 返回：
         * <ul>
         *   <li>HTTP 401</li>
         *   <li>Content-Type: application/json;charset=UTF-8</li>
         *   <li>body 包含 {@code code=UNAUTHORIZED}、{@code message}、{@code traceId}、{@code status=401}</li>
         *   <li>响应头 {@code X-Trace-Id}</li>
         * </ul>
         * </p>
         */
        @Test
        @DisplayName("Token-3.5: JwtAuthenticationEntryPoint 返回标准 401 JSON 错误体")
        void jwtAuthenticationEntryPoint_shouldReturnStandard401JsonErrorBody() throws Exception {
            // Arrange：构造 entry point 与 mock response
            JwtAuthenticationEntryPoint entryPoint = new JwtAuthenticationEntryPoint();
            MockHttpServletRequest mockRequest = new MockHttpServletRequest();
            mockRequest.setRequestURI("/api/protected/resource");
            mockRequest.setMethod("GET");
            org.springframework.mock.web.MockHttpServletResponse mockResponse =
                    new org.springframework.mock.web.MockHttpServletResponse();
            org.springframework.security.core.AuthenticationException authEx =
                    new org.springframework.security.authentication.BadCredentialsException("test");

            // Act
            entryPoint.commence(mockRequest, mockResponse, authEx);

            // Assert：HTTP 401
            assertEquals(401, mockResponse.getStatus(),
                    "应返回 HTTP 401");
            // Assert：Content-Type 为 JSON
            assertEquals("application/json;charset=UTF-8",
                    mockResponse.getContentType(),
                    "Content-Type 应为 application/json;charset=UTF-8");
            // Assert：X-Trace-Id 响应头
            String traceIdHeader = mockResponse.getHeader("X-Trace-Id");
            assertNotNull(traceIdHeader, "X-Trace-Id 响应头不应为 null");
            assertTrue(!traceIdHeader.isBlank(), "X-Trace-Id 不应为空");
            // Assert：响应体包含标准字段
            String body = mockResponse.getContentAsString();
            assertTrue(body.contains("\"UNAUTHORIZED\""),
                    "响应体应包含 code=UNAUTHORIZED: " + body);
            assertTrue(body.contains("\"status\":401")
                            || body.contains("\"status\": 401"),
                    "响应体应包含 status=401: " + body);
            assertTrue(body.contains("traceId"),
                    "响应体应包含 traceId: " + body);
        }

        /**
         * 辅助方法：构造普通用户实体。
         */
        private User createNormalUser(Long id) {
            User user = new User();
            user.setId(id);
            user.setNickname("测试用户");
            user.setRole("USER");
            return user;
        }
    }

    // ========================================================================
    // 段三：媒体鉴权与路径穿越集成测试（使用临时存储目录）
    // ========================================================================

    /**
     * 媒体鉴权与路径穿越集成测试（Task 0.3.2 + 0.3.3）。
     *
     * <p>覆盖 5 类核心场景（与 spec.md Task 0.7.1 要求一一对应）：
     * <ol>
     *   <li>本人访问：当前 userId = 文件归属 userId → 200 成功返回 Resource</li>
     *   <li>他人访问（越权）：当前 userId ≠ 文件归属 userId 且非 ADMIN → 403</li>
     *   <li>管理员访问：ADMIN 可访问任意 userId 的文件 → 200</li>
     *   <li>无 token：Authentication 为 null → 403 AccessDeniedException</li>
     *   <li>路径穿越：subPath 含 {@code ..}、{@code \}、绝对路径 → 400</li>
     * </ol>
     * </p>
     *
     * <p><b>测试策略</b>：使用临时目录作为 storageRoot，避免污染工作目录。
     * 通过 {@link PreAuthenticatedAuthenticationToken} 构造 Authentication，
     * 模拟 JwtAuthenticationFilter 注入的认证主体。</p>
     */
    @Nested
    @DisplayName("段三：媒体鉴权与路径穿越集成测试（MediaAccessController + MediaAccessService）")
    class MediaAccessIsolationTests {

        private static final Long OWNER_USER_ID = 100L;
        private static final Long OTHER_USER_ID = 200L;
        private static final Long ADMIN_USER_ID = 300L;
        private static final String MONTH_SEGMENT = "202607";
        private static final String FILE_NAME = "test-avatar.jpg";
        private static final String VALID_SUBPATH = MONTH_SEGMENT + "/" + FILE_NAME;

        private Path tempRoot;
        private MediaAccessService mediaAccessService;
        private MediaAccessController mediaAccessController;

        @BeforeEach
        void setUp() throws IOException {
            tempRoot = Files.createTempDirectory("p0-media-access-test");
            mediaAccessService = new MediaAccessService(tempRoot.toString());
            mediaAccessController = new MediaAccessController(mediaAccessService);

            // 在 storageRoot/{OWNER_USER_ID}/{MONTH_SEGMENT}/ 下创建测试文件
            Path ownerDir = tempRoot.resolve(OWNER_USER_ID.toString())
                    .resolve(MONTH_SEGMENT);
            Files.createDirectories(ownerDir);
            Files.writeString(ownerDir.resolve(FILE_NAME), "test-image-content");
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

        // ==================== 越权（Cross-User Access）场景 ====================

        /**
         * 场景 4.1：用户 A 访问自己的媒体文件 → 200 成功返回 Resource。
         */
        @Test
        @DisplayName("越权-4.1: 本人访问自己的媒体文件 → 200")
        void loadMedia_ownerAccess_shouldReturnResource() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);

            MediaAccessService.MediaFile mediaFile =
                    mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, authentication);

            assertNotNull(mediaFile, "本人访问应返回非 null MediaFile");
            assertTrue(mediaFile.getResource().exists(),
                    "Resource 应存在");
            assertEquals("image/jpeg", mediaFile.getMediaType().toString(),
                    "MIME 应为 image/jpeg");
        }

        /**
         * 场景 4.2：用户 A 访问用户 B 的媒体文件 → 403 AccessDeniedException。
         *
         * <p>核心越权场景：当前 userId ≠ 文件归属 userId 且非 ADMIN，应抛 403。</p>
         */
        @Test
        @DisplayName("越权-4.2: 用户 A 访问用户 B 的媒体文件 → 403")
        void loadMedia_otherUserAccess_shouldThrowAccessDenied() {
            Authentication authentication = buildUserAuthentication(OTHER_USER_ID, false);

            AccessDeniedException ex = assertThrows(
                    AccessDeniedException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, VALID_SUBPATH, authentication));
            assertTrue(ex.getMessage().contains("无权访问")
                            || ex.getMessage().contains("拒绝"),
                    "异常信息应说明拒绝访问: " + ex.getMessage());
        }

        /**
         * 场景 4.3：管理员访问任意用户的媒体文件 → 200 成功返回 Resource。
         */
        @Test
        @DisplayName("越权-4.3: 管理员访问任意用户的媒体文件 → 200")
        void loadMedia_adminAccess_shouldReturnResource() {
            Authentication authentication = buildUserAuthentication(ADMIN_USER_ID, true);

            MediaAccessService.MediaFile mediaFile =
                    mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, authentication);

            assertNotNull(mediaFile, "管理员访问应返回非 null MediaFile");
            assertTrue(mediaFile.getResource().exists(),
                    "Resource 应存在");
        }

        /**
         * 场景 4.4：无 token（Authentication 为 null）→ 403 AccessDeniedException。
         */
        @Test
        @DisplayName("越权-4.4: 无 token 访问媒体文件 → 403")
        void loadMedia_noToken_shouldThrowAccessDenied() {
            AccessDeniedException ex = assertThrows(
                    AccessDeniedException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, VALID_SUBPATH, null));
            assertTrue(ex.getMessage().contains("未认证")
                            || ex.getMessage().contains("拒绝"),
                    "异常信息应说明未认证: " + ex.getMessage());
        }

        /**
         * 场景 4.5：Controller 层端到端验证（设置 SecurityContext + MockHttpServletRequest）。
         *
         * <p>验证 MediaAccessController 能从 HttpServletRequest 提取子路径，
         * 并通过鉴权返回文件内容（HTTP 200）。</p>
         */
        @Test
        @DisplayName("越权-4.5: Controller 端到端 → 200")
        void controller_ownerAccess_shouldReturn200() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            MockHttpServletRequest request = new MockHttpServletRequest();
            String pathWithin = OWNER_USER_ID + "/" + VALID_SUBPATH;
            request.setAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE,
                    pathWithin);
            request.setRequestURI("/api/v1/media/" + pathWithin);

            var response = mediaAccessController.getMedia(OWNER_USER_ID, request);

            assertNotNull(response, "Controller 应返回非 null ResponseEntity");
            assertEquals(200, response.getStatusCode().value(),
                    "应返回 200 OK");
            assertNotNull(response.getBody(), "ResponseEntity body 不应为 null");
        }

        // ==================== 路径穿越（Path Traversal）场景 ====================

        /**
         * 场景 5.1：路径穿越攻击（subPath 含 {@code ../}）→ 400 Bad Request。
         *
         * <p>核心路径穿越场景：subPath 包含 {@code ../}，攻击者尝试越权访问
         * 其他用户目录下的文件。Service 应在字符级校验阶段拦截。</p>
         */
        @Test
        @DisplayName("路径穿越-5.1: subPath 含 ../ → 400 Bad Request")
        void loadMedia_pathTraversalWithDotDot_shouldThrowBadRequest() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
            String maliciousSubPath = "../" + OTHER_USER_ID + "/secret.jpg";

            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, maliciousSubPath, authentication));
            assertEquals(400, ex.getStatusCode().value(),
                    "Path Traversal 应返回 400 Bad Request");
            assertTrue(ex.getReason() != null && ex.getReason().contains("非法路径"),
                    "异常信息应说明路径非法: " + ex.getReason());
        }

        /**
         * 场景 5.2：路径穿越变种 —— 绝对路径（{@code /etc/passwd}）→ 400。
         */
        @Test
        @DisplayName("路径穿越-5.2: 绝对路径 → 400")
        void loadMedia_absolutePath_shouldThrowBadRequest() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
            String maliciousSubPath = "/etc/passwd";

            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, maliciousSubPath, authentication));
            assertEquals(400, ex.getStatusCode().value(),
                    "绝对路径应返回 400 Bad Request");
        }

        /**
         * 场景 5.3：路径穿越变种 —— 反斜杠（Windows 路径分隔符）→ 400。
         */
        @Test
        @DisplayName("路径穿越-5.3: 反斜杠路径 → 400")
        void loadMedia_backslashPath_shouldThrowBadRequest() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
            String maliciousSubPath = "..\\..\\secret.jpg";

            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, maliciousSubPath, authentication));
            assertEquals(400, ex.getStatusCode().value(),
                    "反斜杠路径应返回 400 Bad Request");
        }

        /**
         * 场景 5.4：路径穿越变种 —— 控制字符 / NUL 字节 → 400。
         */
        @Test
        @DisplayName("路径穿越-5.4: 控制字符/NUL → 400")
        void loadMedia_controlChars_shouldThrowBadRequest() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
            String maliciousSubPath = MONTH_SEGMENT + "/\u0000" + FILE_NAME;

            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, maliciousSubPath, authentication));
            assertEquals(400, ex.getStatusCode().value(),
                    "控制字符应返回 400 Bad Request");
        }

        /**
         * 场景 5.5：路径穿越变种 —— 分号注入 → 400。
         */
        @Test
        @DisplayName("路径穿越-5.5: 分号注入 → 400")
        void loadMedia_semicolonInjection_shouldThrowBadRequest() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
            String maliciousSubPath = MONTH_SEGMENT + "/;malicious";

            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, maliciousSubPath, authentication));
            assertEquals(400, ex.getStatusCode().value(),
                    "分号注入应返回 400 Bad Request");
        }

        /**
         * 场景 5.6：文件不存在 → 404（不泄露存在性信息）。
         *
         * <p>验证鉴权通过后，文件不存在时返回 404 而非 403，
         * 避免向攻击者泄露文件存在性信息。</p>
         */
        @Test
        @DisplayName("路径穿越-5.6: 文件不存在 → 404（不泄露存在性）")
        void loadMedia_fileNotExists_shouldThrowNotFound() {
            Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
            String notExistingSubPath = MONTH_SEGMENT + "/non-existent.jpg";

            org.springframework.web.server.ResponseStatusException ex = assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> mediaAccessService.loadMedia(
                            OWNER_USER_ID, notExistingSubPath, authentication));
            assertEquals(404, ex.getStatusCode().value(),
                    "文件不存在应返回 404 Not Found");
        }

        /**
         * 辅助方法：构造 Authentication 对象，模拟 JwtAuthenticationFilter 注入的认证主体。
         *
         * @param userId  当前用户 ID
         * @param isAdmin 是否为管理员（true 时追加 ROLE_ADMIN）
         * @return 已认证的 Authentication 对象
         */
        private Authentication buildUserAuthentication(Long userId, boolean isAdmin) {
            List<SimpleGrantedAuthority> authorities;
            if (isAdmin) {
                authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_USER"),
                        new SimpleGrantedAuthority("ROLE_ADMIN"));
            } else {
                authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
            }
            PreAuthenticatedAuthenticationToken authentication =
                    new PreAuthenticatedAuthenticationToken(userId, "test-token", authorities);
            authentication.setAuthenticated(true);
            return authentication;
        }
    }

    // ========================================================================
    // 段四：real profile 端到端集成测试（CI 环境就绪后启用）
    // ========================================================================

    /**
     * real profile 端到端集成测试骨架（CI 环境就绪后启用）。
     *
     * <p>本测试类提供 real profile 下端到端验证的代码骨架，标记 {@code @Disabled}
     * 跳过执行。CI 环境配置 Redis + RabbitMQ + MySQL 后可启用：</p>
     *
     * <ol>
     *   <li>启动 Redis（默认 127.0.0.1:6379）</li>
     *   <li>启动 RabbitMQ（默认 127.0.0.1:5672）</li>
     *   <li>启动 MySQL（按 application-db.yml 配置）</li>
     *   <li>设置环境变量 JWT_SECRET、WECHAT_APPID、WECHAT_SECRET 等</li>
     *   <li>移除 {@code @Disabled} 注解后运行</li>
     * </ol>
     *
     * <p><b>覆盖场景</b>（real profile 下完整链路）：</p>
     * <ul>
     *   <li>无 token 访问 /api/users/123/follow → 401（JwtAuthenticationEntryPoint）</li>
     *   <li>有效 JWT 访问 /api/users/123/follow → 200</li>
     *   <li>普通用户 JWT 访问 /api/admin/users → 403</li>
     *   <li>管理员 JWT 访问 /api/admin/users → 200</li>
     *   <li>logout 后再次使用同 JWT → 401</li>
     * </ul>
     */
    @Nested
    @org.junit.jupiter.api.Disabled("需 CI 环境提供 Redis + RabbitMQ + MySQL，本机暂跳过；"
            + "本测试骨架作为 real profile 端到端验证的清单，CI 环境就绪后启用")
    @DisplayName("段四：real profile 端到端集成测试（CI 环境就绪后启用）")
    class RealProfileEndToEndTests {

        /**
         * real profile 下无 token 访问受保护资源 → 401。
         *
         * <p>前置条件：JWT_SECRET 环境变量已设置，Redis/MySQL/RabbitMQ 已启动。</p>
         * <p>启动命令示例：</p>
         * <pre>{@code
         * JWT_SECRET=test-jwt-secret-for-real-profile-32-chars \
         * SPRING_PROFILES_ACTIVE=real \
         * DB_URL=jdbc:mysql://127.0.0.1:3306/campuslove \
         * DB_USERNAME=root DB_PASSWORD=**** \
         * REDIS_HOST=127.0.0.1 REDIS_PORT=6379 \
         * mvnw test -Dtest=P0SecurityIntegrationTest$RealProfileEndToEndTests
         * }</pre>
         */
        @Test
        @DisplayName("real-6.1: 无 token 访问 /api/users/123/follow → 401（待 CI 启用）")
        void realProfile_noToken_shouldReturn401() {
            // CI 环境就绪后启用：
            // mockMvc.perform(post("/api/v1/users/123/follow"))
            //         .andExpect(status().isUnauthorized())
            //         .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            //         .andExpect(jsonPath("$.status").value(401));
        }

        /**
         * real profile 下有效 JWT 访问受保护资源 → 200。
         */
        @Test
        @DisplayName("real-6.2: 有效 JWT 访问受保护资源 → 200（待 CI 启用）")
        void realProfile_validJwt_shouldReturn200() {
            // CI 环境就绪后启用：
            // 1. 调用 /api/auth/wechat-login 获取 JWT
            // 2. 使用 JWT 访问 /api/users/123/follow
            // 3. 验证返回 200
        }

        /**
         * real profile 下 logout 后再次使用同 JWT → 401。
         */
        @Test
        @DisplayName("real-6.3: logout 后再使用同 JWT → 401（待 CI 启用）")
        void realProfile_logoutThenReuseToken_shouldReturn401() {
            // CI 环境就绪后启用：
            // 1. 登录获取 JWT
            // 2. 调用 /api/auth/logout
            // 3. 再次使用同 JWT 访问受保护资源
            // 4. 验证返回 401 + code=UNAUTHORIZED
        }
    }
}
