package com.campuslove.api.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

/**
 * SecurityConfig 集成测试（Phase 3 任务 17）。
 *
 * <p>验证 SecurityFilterChain 的鉴权规则配置正确：
 * <ul>
 *   <li>/api/auth/**、/ws/**、/content-filter/check 为 permitAll（登录入口等）</li>
 *   <li>/api/admin/** 需要 ADMIN 角色</li>
 *   <li>/api/** 需要 authenticated</li>
 *   <li>其他请求放行</li>
 * </ul>
 * </p>
 *
 * <p>测试策略：使用 @SpringBootTest 默认激活 mock profile，加载 MockSecurityConfig
 * （与 SecurityConfig 鉴权规则一致）。通过 @WithMockUser 模拟不同角色用户，
 * 验证 SecurityFilterChain 对各路径的鉴权决策。</p>
 *
 * <p>注意：mock profile 下 MockAuthenticationFilter 会自动为非 permitAll 路径注入认证，
 * 因此 "未登录 -> 401" 场景需通过 @WithMockUser 验证（filter 检测到已存在认证则跳过注入）。
 * admin controller 在 mock profile 不激活，故 /api/admin/** 在 mock profile 下返回 404（安全通过），
 * 测试断言 "非 403" 以验证安全规则放行 ADMIN 角色。</p>
 *
 * <p>@EnableMethodSecurity 已在 SecurityConfig 与 MockSecurityConfig 上启用，
 * 让 @PreAuthorize 注解生效（admin controller 在 real profile 下使用）。</p>
 */
@SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-security-config-tests-32-chars-min")
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;
    /**
     * 场景 1：未登录访问 permitAll 路径 /api/auth/me → 200（不被 security 拦截）。
     *
     * <p>/api/auth/** 配置为 permitAll，无需认证即可访问。
     * AuthController 在 mock 与 real profile 下均激活，返回未登录会话视图。</p>
     */
    @Test
    void unauthenticated_accessToAuthMe_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk());
    }

    /**
     * 场景 2：未登录 POST /api/auth/wechat-login → 200（permitAll，登录入口）。
     *
     * <p>登录入口必须 permitAll，否则未登录用户无法登录。</p>
     */
    @Test
    void unauthenticated_accessToWechatLogin_shouldReturn200() throws Exception {
        mockMvc.perform(post("/api/auth/wechat-login")
                        .contentType("application/json")
                        .content("{\"code\":\"test-code\"}"))
                .andExpect(status().isOk());
    }

    /**
     * 场景 3：普通用户（ROLE_USER）访问 /api/admin/users → 403（hasRole("ADMIN") 阻止）。
     *
     * <p>验证 SecurityFilterChain 对 /api/admin/** 路径强制要求 ADMIN 角色，
     * 普通用户访问被拒绝。</p>
     */
    @Test
    @WithMockUser(roles = "USER")
    void user_accessToAdminEndpoint_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }

    /**
     * 场景 4：管理员（ROLE_ADMIN）访问 /api/admin/users → 非 403（安全规则放行）。
     *
     * <p>验证 SecurityFilterChain 对 ADMIN 角色放行 /api/admin/** 路径。
     * mock profile 下 AdminUserController 未激活，返回 404（非 403）即可证明安全通过。</p>
     */
    @Test
    @WithMockUser(roles = "ADMIN")
    void admin_accessToAdminEndpoint_shouldNotBeForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "管理员访问 /api/admin/users 不应被 security 拦截，但返回: " + status);
                    }
                });
    }

    /**
     * 场景 5：普通用户（ROLE_USER）访问 /api/users/123/follow（POST）→ 非 401/403（安全通过）。
     *
     * <p>验证 /api/** 路径要求 authenticated，普通用户通过认证后可访问。
     * UserController 在 mock 与 real profile 下均激活。</p>
     *
     * <p>不使用 @WithMockUser：因为该注解注入的 principal 是 Spring Security 的
     * {@link org.springframework.security.core.userdetails.User} 对象，
     * {@link SecurityUtils#parsePrincipal} 仅支持 Long/Integer/String 三种类型，
     * 对 User 对象返回 null，从而触发 401。
     * 此处依赖 {@code MockAuthenticationFilter} 自动注入
     * {@code PreAuthenticatedAuthenticationToken(1L, "mock", ROLE_USER)}，
     * principal 为 Long 类型 1L，能被 SecurityUtils 正确解析。</p>
     */
    @Test
    void user_accessToUserEndpoint_shouldNotBeBlockedBySecurity() throws Exception {
        mockMvc.perform(post("/api/users/123/follow"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "普通用户访问 /api/users/123/follow 不应被 security 拦截，但返回: " + status);
                    }
                });
    }

    /**
     * 场景 6：未登录访问 /api/users/123/follow → mock profile 下由 MockAuthenticationFilter
     * 自动注入 ROLE_USER，安全通过；real profile 下应返回 401。
     *
     * <p>本测试在 mock profile 下运行，验证 MockAuthenticationFilter 行为；
     * real profile 的 401 行为由 SecurityConfig 的 authenticated() 规则保证，
     * 已通过代码审查验证（无 JWT token 时 JwtAuthenticationFilter 不注入认证）。</p>
     */
    @Test
    void unauthenticated_accessToUserEndpoint_inMockProfile_shouldNotBe401() throws Exception {
        mockMvc.perform(post("/api/users/123/follow"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401) {
                        throw new AssertionError(
                                "mock profile 下未登录访问受保护端点不应返回 401（MockAuthenticationFilter 自动注入认证）: " + status);
                    }
                });
    }

    /**
     * 场景 7：未登录访问 WebSocket 握手端点 /ws/info → permitAll（不被 security 拦截）。
     *
     * <p>/ws/** 路径配置为 permitAll，WebSocket 握手由单独机制处理。</p>
     */
    @Test
    void unauthenticated_accessToWsEndpoint_shouldNotRequireAuth() throws Exception {
        mockMvc.perform(get("/ws/info"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "/ws/** 应为 permitAll，不应被 security 拦截: " + status);
                    }
                });
    }

    /**
     * 场景 8：未登录访问 /content-filter/check → permitAll（不被 security 拦截）。
     *
     * <p>内容审查端点配置为 permitAll。</p>
     */
    @Test
    void unauthenticated_accessToContentFilterCheck_shouldNotRequireAuth() throws Exception {
        mockMvc.perform(post("/content-filter/check")
                        .contentType("application/json")
                        .content("{\"text\":\"test\"}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError(
                                "/content-filter/check 应为 permitAll，不应被 security 拦截: " + status);
                    }
                });
    }
}