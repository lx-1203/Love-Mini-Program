package com.campuslove.api.security;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Task 0.7.1 段四：real profile 端到端鉴权链集成测试。
 *
 * <p>本类把原先位于 {@code P0SecurityIntegrationTest.RealProfileEndToEndTests} 的
 * 三个「空断言骨架」替换为真实可执行断言。骨架的三个 {@code @Test} 方法体里所有判点
 * 都被注释掉（{@code // CI 环境就绪后启用:}），也就是说 real profile 的鉴权链
 * （401 未认证 / 403 非管理员 / 登出后令牌失效）此前在任何环境里都没有被真正跑过——
 * 属于「覆盖率是假的」的典型形态。本类补上真实断言，由 CI 的 db-integration job
 * 传 {@code -Dreal.it.test=true} 时执行（只有它传；e2e-real 跑 Playwright 流程，不跑本类）。</p>
 *
 * <p><b>为什么必须是顶层类</b>：{@code @Nested} + {@code @SpringBootTest} +
 * {@code @TestInstance(PER_CLASS)} 组合在 Spring Boot 3.3 + JUnit 5 下会导致
 * ApplicationContext 加载失败（JPA Repository Bean 未注册）。参考既有先例
 * {@link P0SecurityFilterChainIntegrationTest}，改为顶层 {@code @SpringBootTest}。</p>
 *
 * <p><b>为什么必须是 real profile</b>：mock profile 下 {@code JwtAuthenticationFilter}
 * 不激活、{@code RedisTokenBlacklistService} 不装配、{@code JwtAccessDeniedHandler} /
 * {@code JwtAuthenticationEntryPoint} 未注册（由 {@code MockSecurityConfig} 顶替），
 * mock 测试证明不了生产鉴权链。只有 real profile 才让
 * {@link com.campuslove.api.config.SecurityConfig} 的 {@code JwtAuthenticationFilter} +
 * {@code RedisTokenBlacklistService} + {@code JwtAuthenticationEntryPoint} 全套生效。</p>
 *
 * <p><b>覆盖场景</b>（全部走 MockMvc 打 real profile 的真实过滤器链）：</p>
 * <ol>
 *   <li>无 {@code Authorization} 头访问受保护端点 → 401 + 标准 JSON 错误体
 *       （{@code code=UNAUTHORIZED} + {@code status=401}）；</li>
 *   <li>普通用户有效 JWT 访问同一受保护端点 → 非 401/403（真实业务响应）；</li>
 *   <li>普通用户 JWT 访问管理端点 {@code /api/v1/admin/users} → 403 +
 *       {@code code=FORBIDDEN} + {@code status=403}；</li>
 *   <li>管理员 JWT 访问同一管理端点 → 非 401/403；</li>
 *   <li>登出（写 Redis/jti 黑名单）后复用同一 token 访问受保护端点 → 401
 *       （证明黑名单确实接进了 real 过滤器链）。</li>
 * </ol>
 *
 * <p><b>自给自足</b>：测试用 {@link UserRepository} 在 {@code @Transactional} 内自建
 * 用户行（回滚，绝不污染共享 dev 库），绝不依赖任何预置行；绝不执行任何 DDL
 * （{@code spring.flyway.enabled=false}）。JWT 等启动必需值以 CI-safe 的一次性
 * {@code properties} 注入，除 DB/Redis 连接外不需要任何真实密钥。</p>
 *
 * <p><b>读数状态（2026-10-31 记）</b>：本类在本机【从未跑出过绿】——不是判点写错，
 * 而是本机拿不到 real 上下文：MySQL 可用，Redis 只有 Windows 版 3.0.504
 * （Redisson 握手即 {@code RedisConnectionException: Unable to connect to Redis server}），
 * Memurai 服务未安装、Docker 引擎未运行 ⇒ 没有 Redis ≥ 6.x 可用。
 * 编译与树级 testCompile 已在本机验证通过。第一份真实读数来自 CI 的
 * db-integration job（redis:7.2.5-alpine + mysql:8.0.39）。
 * 也就是说：CI 那一发若红，是【新暴露的缺陷】而不是环境抖动——不要就地关属性，
 * 要查过滤器/黑名单接线。</p>
 *
 * @see P0SecurityIntegrationTest
 * @see P0SecurityFilterChainIntegrationTest
 */
@SpringBootTest(properties = {
        // 禁用启动期 Flyway 迁移：shared dev 库已迁移到 head，测试绝不需要、也绝不触发任何 DDL。
        "spring.flyway.enabled=false",
        // 关闭 Hibernate 启动期 schema 校验（ddl-auto=none）：本测试只碰 users / admin 查询，
        // 不依赖 outbox_event 等其它表；shared live 库里可能存在他人 WIP 实体与存量 schema 的
        // 漂移（如尚未迁移的列），validate 会因此拒绝启动。既不建表也不校验，仅按需读写。
        "spring.jpa.hibernate.ddl-auto=none",
        // CI-safe 一次性启动密钥（非生产值；JwtConfig 仅要求 >=32 字符且非已知弱默认值）。
        "JWT_SECRET=it-real-profile-authchain-test-secret-32chars-min-aaaa",
        // AesEncryptor 在 real profile 下无兜底密钥，缺失即拒绝启动；给一次性测试密钥。
        "app.security.aes-secret=it-real-profile-aes-test-secret-32chars-min-bbbb",
        // DatabaseConfigValidator / AdminPasswordValidator 读取 flyway placeholder（非空即通过）；
        // 用严格模式关闭 + 占位 throwaway，使本测试除 DB/Redis 外不依赖任何 ADMIN_* 生产密钥。
        "spring.flyway.placeholders.admin_password_hash=$2a$10$itRealProfileTestPlaceholderHashAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "spring.flyway.placeholders.admin_openid=it-real-profile-test-admin-openid",
        "app.admin.strict-password=false",
        "app.admin.strict-openid=false",
        // 不扫描共享库里的存量 active 后台账号做口令审计（与本测试无关，且会因脏数据 fail-fast）。
        "app.admin.db-password-audit=off",
        // WebSocketConfig 在非 mock profile 下 Origin 为空即拒绝启动；给一个本地占位来源。
        "app.websocket.allowed-origin-patterns=http://localhost:5173"
})
@AutoConfigureMockMvc
@ActiveProfiles("real")
@org.junit.jupiter.api.condition.EnabledIfSystemProperty(named = "real.it.test", matches = "true")
@Transactional
@DisplayName("Task 0.7.1 段四: real profile 端到端鉴权链集成测试")
class RealProfileAuthChainIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    /** real profile 下由 RedisTokenBlacklistService 提供（@Profile("real")）——登出撤销的真实事实源。 */
    @Autowired private TokenBlacklistService tokenBlacklistService;
    @Autowired private UserRepository userRepository;

    /** 受保护业务端点：需认证（{@code /api/v1/**} authenticated），任意有效登录用户可正常访问。 */
    private static final String PROTECTED_ENDPOINT = "/api/v1/users/1/is-following";
    /** 管理端点：需 ADMIN/SUPER_ADMIN/AUDITOR 角色。 */
    private static final String ADMIN_ENDPOINT = "/api/v1/admin/users";

    /**
     * 自建用户行（不依赖任何预置行）：openid 唯一（UUID 派生），role 决定授予的角色，
     * status=active（禁用/注销用户会被过滤器直接拒绝）。返回落库后的自增 ID。
     */
    private Long persistUser(String role) {
        User user = new User();
        user.setOpenid("it-real-" + UUID.randomUUID());
        user.setNickname("real-profile-it-" + role);
        user.setRole(role);
        user.setStatus("active");
        LocalDateTime now = LocalDateTime.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        User saved = userRepository.saveAndFlush(user);
        assertNotNull(saved.getId(), "自建用户必须拿到自增主键，不得假设 id=1 存在");
        return saved.getId();
    }

    /** 以真实 JwtTokenProvider 签发合法 JWT（subject=userId，带随机 jti）。 */
    private String issueJwt(Long userId) {
        return jwtTokenProvider.generateToken(String.valueOf(userId));
    }

    @Test
    @DisplayName("real-1: 无 Authorization 头访问受保护端点 → 401 + 标准 JSON 错误体")
    void noToken_shouldReturn401WithStandardJsonErrorBody() throws Exception {
        mockMvc.perform(get(PROTECTED_ENDPOINT))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.traceId").exists());
    }

    @Test
    @DisplayName("real-2: 普通用户有效 JWT 访问受保护端点 → 非 401/403（真实通过认证）")
    void validUserJwt_shouldNotBeUnauthorizedOrForbidden() throws Exception {
        Long userId = persistUser("USER");
        String jwt = issueJwt(userId);

        mockMvc.perform(get(PROTECTED_ENDPOINT)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "普通用户的有效 JWT 应通过 JwtAuthenticationFilter 认证，"
                                        + "不应被拦为 401/403，实际: " + status);
                    }
                });
    }

    @Test
    @DisplayName("real-3: 普通用户 JWT 访问管理端点 → 403 + FORBIDDEN 标准 JSON 错误体")
    void userJwt_accessAdminEndpoint_shouldReturn403() throws Exception {
        Long userId = persistUser("USER");
        String jwt = issueJwt(userId);

        mockMvc.perform(get(ADMIN_ENDPOINT)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("real-4: 管理员 JWT 访问管理端点 → 非 401/403（角色授予成功）")
    void adminJwt_accessAdminEndpoint_shouldNotBeForbidden() throws Exception {
        Long adminId = persistUser("ADMIN");
        String jwt = issueJwt(adminId);

        mockMvc.perform(get(ADMIN_ENDPOINT)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "管理员的有效 JWT 应拿到 ROLE_ADMIN 并通过授权，"
                                        + "不应被拦为 401/403，实际: " + status);
                    }
                });
    }

    @Test
    @DisplayName("real-5: 登出（jti 黑名单）后复用同一 token 访问受保护端点 → 401")
    void revokedToken_reuse_shouldReturn401() throws Exception {
        Long userId = persistUser("USER");
        String jwt = issueJwt(userId);

        // 前置自检：未撤销时同一 token 必须能通过认证（非 401），否则撤销后的 401 证明不了任何东西。
        mockMvc.perform(get(PROTECTED_ENDPOINT)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 401) {
                        throw new AssertionError(
                                "前置：撤销前应能通过认证；若此处已 401 则后续断言不具证伪性");
                    }
                });

        // 模拟登出：把该 token 的 jti 写入黑名单（Redis + 本地内存双轨）。
        String jti = jwtTokenProvider.getJtiFromToken(jwt);
        assertNotNull(jti, "签发 token 必须带 jti，否则无法走撤销");
        tokenBlacklistService.revoke(jti, jwtTokenProvider.getRemainingTtlSeconds(jwt));

        // 复用同一 token：JwtAuthenticationFilter 必须在 jti 命中黑名单时清除 SecurityContext → 401。
        mockMvc.perform(get(PROTECTED_ENDPOINT)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.status").value(401));
    }
}
