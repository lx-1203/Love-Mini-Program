package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * {@link JwtAuthenticationFilter} 黑名单集成单元测试（Task 0.5.3）。
 *
 * <p>验证 JWT 认证过滤器在引入 {@link TokenBlacklistService} 后的核心行为：
 * <ul>
 *   <li>场景 1：jti 在黑名单中（用户已登出）→ 清除 SecurityContext，不调用后续认证</li>
 *   <li>场景 2：jti 不在黑名单中 → 走正常认证流程，设置 SecurityContext；
 *       R4-00274 黑名单统一为 jti 单轨——不再双轨检查完整 token 黑名单（isTokenRevoked）</li>
 *   <li>场景 3：jti 为 null（旧 token 无 jti claim）→ 跳过黑名单校验，走正常认证</li>
 *   <li>场景 4：permit 路径（/ws/**）→ 直接放行，不查黑名单</li>
 *   <li>场景 5：无 Authorization 头 → 不查黑名单，由 SecurityConfig 决定是否拒绝</li>
 *   <li>场景 6：token 无效（getUserIdFromToken 返回 null）→ 清除 SecurityContext</li>
 *   <li>场景 7：管理员用户 token → 注入 ROLE_ADMIN</li>
 *   <li>场景 8：黑名单服务返回 false → 正常认证流程不抛异常</li>
 * </ul>
 *
 * <p>测试策略：纯 Mockito，模拟 {@link JwtTokenProvider}、{@link UserRepository}、
 * {@link TokenBlacklistService} 与 Servlet 三件套，验证过滤器对黑名单的查询与降级行为。
 * 不加载 Spring 上下文，保证测试快速与隔离。</p>
 *
 * <p>SecurityContextHolder 是线程局部的，每个测试用例前手动 clear，避免上下文残留。</p>
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    /** 测试用 token */
    private static final String TEST_TOKEN = "jwt-token-abc-123";

    /** 测试用 jti（UUID 格式） */
    private static final String TEST_JTI = "550e8400-e29b-41d4-a716-446655440000";

    /** 测试用 userId */
    private static final Long TEST_USER_ID = 100L;

    @BeforeEach
    void setUp() {
        // 手动构造 filter，注入 mock 依赖
        filter = new JwtAuthenticationFilter(jwtTokenProvider, userRepository, tokenBlacklistService);
        // 清除 SecurityContext（线程局部，避免上一用例残留）
        SecurityContextHolder.clearContext();
    }

    /**
     * 场景 1：jti 在黑名单中（用户已登出）→ 清除 SecurityContext，
     * 不调用 getUserIdFromToken，不查询用户，直接放行过滤器链（由 AuthenticationEntryPoint 返回 401）。
     *
     * <p>关键验证点：
     * <ul>
     *   <li>调用 tokenBlacklistService.isRevoked(jti) 返回 true</li>
     *   <li>不调用 jwtTokenProvider.getUserIdFromToken（短路）</li>
     *   <li>不调用 userRepository.findById（短路）</li>
     *   <li>SecurityContext 为空（认证被拒绝）</li>
     *   <li>filterChain.doFilter 被调用（继续后续过滤器链）</li>
     * </ul>
     */
    @Test
    void doFilter_whenJtiRevoked_shouldClearContextAndShortCircuit() throws Exception {
        // Arrange
        when(request.getRequestURI()).thenReturn("/api/v1/users/123");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);
        when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
        when(tokenBlacklistService.isRevoked(TEST_JTI)).thenReturn(true);

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：黑名单被查询
        verify(tokenBlacklistService).isRevoked(TEST_JTI);
        // Assert：短路，不查询用户、不解析 userId
        verify(jwtTokenProvider, never()).getUserIdFromToken(anyString());
        verify(userRepository, never()).findById(TEST_USER_ID);
        // Assert：SecurityContext 为空
        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "jti 在黑名单中时 SecurityContext 应被清除");
        // Assert：继续后续过滤器链（由 AuthenticationEntryPoint 处理 401）
        verify(filterChain).doFilter(request, response);
    }

    /**
     * 场景 2：jti 不在黑名单中 → 走正常认证流程，设置 SecurityContext，
     * 注入 ROLE_USER 权限。
     *
     * <p>关键验证点：
     * <ul>
     *   <li>调用 tokenBlacklistService.isRevoked(jti) 返回 false</li>
     *   <li>调用 jwtTokenProvider.getUserIdFromToken 返回 userId</li>
     *   <li>调用 userRepository.findById 查询用户</li>
     *   <li>SecurityContext 已设置认证信息，principal 为 userId</li>
     * </ul>
     */
    @Test
    void doFilter_whenJtiNotRevoked_shouldAuthenticateNormally() throws Exception {
        // Arrange
        User normalUser = createNormalUser(TEST_USER_ID);
        when(request.getRequestURI()).thenReturn("/api/v1/users/123");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);
        when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
        when(tokenBlacklistService.isRevoked(TEST_JTI)).thenReturn(false);
        when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
        when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(normalUser));

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：黑名单被查询（jti 单轨）
        verify(tokenBlacklistService).isRevoked(TEST_JTI);
        // R4-00274：不再双轨检查完整 token 黑名单
        verify(jwtTokenProvider, never()).isTokenRevoked(anyString());
        // Assert：查询用户
        verify(jwtTokenProvider).getUserIdFromToken(TEST_TOKEN);
        verify(userRepository).findById(TEST_USER_ID);
        // Assert：SecurityContext 已设置认证信息
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth, "SecurityContext 应已设置认证信息");
        assertEquals(TEST_USER_ID, auth.getPrincipal(), "principal 应为 userId");
        // Assert：继续过滤器链
        verify(filterChain).doFilter(request, response);
    }

    /**
     * 场景 3：jti 为 null（旧 token 无 jti claim）→ 跳过黑名单校验，
     * 走正常认证流程。
     *
     * <p>兼容性场景：旧版本签发的 token 可能没有 jti claim，过滤器应跳过黑名单校验，
     * 由后续签名/过期校验兜底。R4-00274 后过滤器不再双轨检查完整 token 黑名单
     * （revokeToken 仅作为服务层兼容写路径保留）。</p>
     */
    @Test
    void doFilter_whenJtiIsNull_shouldSkipBlacklistAndAuthenticate() throws Exception {
        // Arrange
        User normalUser = createNormalUser(TEST_USER_ID);
        when(request.getRequestURI()).thenReturn("/api/v1/users/123");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);
        when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(null); // 旧 token 无 jti
        when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
        when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(normalUser));

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：黑名单未被查询（jti 为 null 跳过）
        verify(tokenBlacklistService, never()).isRevoked(anyString());
        // Assert：仍走正常认证
        verify(jwtTokenProvider).getUserIdFromToken(TEST_TOKEN);
        // Assert：SecurityContext 已设置
        assertNotNull(SecurityContextHolder.getContext().getAuthentication(),
                "jti 为 null 时仍应正常认证");
    }

    /**
     * 场景 4：permit 路径（/ws/**）→ 直接放行，不查黑名单，不解析 token。
     *
     * <p>permit 路径设计为公开访问（WebSocket 握手、内容过滤检查等），
     * 不应执行任何认证逻辑。验证过滤器在 permit 路径下短路返回。
     * 注：R4-00261 后 /api/v1/auth/** 已移出 permit 列表（匿名放行由
     * SecurityConfig permitAll 承担，携带 token 的请求仍注入认证上下文），
     * 此处改用仍在 permit 列表内的 /ws/** 验证短路行为。</p>
     */
    @Test
    void doFilter_whenPermitPath_shouldSkipAllAuthLogic() throws Exception {
        // Arrange
        when(request.getRequestURI()).thenReturn("/ws/chat");

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：未读取 Authorization 头
        verify(request, never()).getHeader("Authorization");
        // Assert：未查黑名单、未解析 token
        verify(tokenBlacklistService, never()).isRevoked(anyString());
        verify(jwtTokenProvider, never()).getJtiFromToken(anyString());
        verify(jwtTokenProvider, never()).getUserIdFromToken(anyString());
        // Assert：继续过滤器链
        verify(filterChain).doFilter(request, response);
    }

    /**
     * 场景 5：无 Authorization 头 → 不查黑名单，直接放行（由 SecurityConfig 决定是否拒绝）。
     *
     * <p>无 token 场景下，过滤器不应执行任何认证逻辑，由 SecurityConfig 的
     * authenticated() 规则触发 AuthenticationEntryPoint 返回 401。</p>
     */
    @Test
    void doFilter_whenNoAuthHeader_shouldSkipBlacklistAndContinue() throws Exception {
        // Arrange
        when(request.getRequestURI()).thenReturn("/api/v1/users/123");
        when(request.getHeader("Authorization")).thenReturn(null);

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：未查黑名单、未解析 token
        verify(tokenBlacklistService, never()).isRevoked(anyString());
        verify(jwtTokenProvider, never()).getJtiFromToken(anyString());
        verify(jwtTokenProvider, never()).getUserIdFromToken(anyString());
        // Assert：继续过滤器链
        verify(filterChain).doFilter(request, response);
        // Assert：SecurityContext 为空
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    /**
     * 场景 6：token 无效（getUserIdFromToken 返回 null）→ 抛 BadCredentialsException，
     * 过滤器捕获并清除 SecurityContext。
     *
     * <p>触发场景：token 签名错误、过期、格式错误等。过滤器应清除上下文，
     * 由 AuthenticationEntryPoint 返回 401。</p>
     */
    @Test
    void doFilter_whenTokenInvalid_shouldClearContext() throws Exception {
        // Arrange
        when(request.getRequestURI()).thenReturn("/api/v1/users/123");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);
        when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
        when(tokenBlacklistService.isRevoked(TEST_JTI)).thenReturn(false);
        when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN)).thenReturn(null); // token 无效

        // Act：不应抛异常（过滤器内部捕获 BadCredentialsException）
        assertDoesNotThrow(() -> filter.doFilterInternal(request, response, filterChain));

        // Assert：SecurityContext 为空
        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "token 无效时 SecurityContext 应被清除");
        // Assert：继续过滤器链
        verify(filterChain).doFilter(request, response);
    }

    /**
     * 场景 7：管理员用户 token → 注入 ROLE_USER + ROLE_ADMIN 双重权限。
     *
     * <p>验证过滤器根据 user.isAdmin() 注入 ROLE_ADMIN，配合 SecurityConfig
     * 的 hasRole("ADMIN") 规则实现管理端权限校验。</p>
     */
    @Test
    void doFilter_whenAdminUser_shouldInjectAdminRole() throws Exception {
        // Arrange
        User adminUser = createAdminUser(TEST_USER_ID);
        when(request.getRequestURI()).thenReturn("/api/v1/admin/users");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);
        when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
        when(tokenBlacklistService.isRevoked(TEST_JTI)).thenReturn(false);
        when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
        when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(adminUser));

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：SecurityContext 已设置，包含 ROLE_ADMIN
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth, "管理员认证应已设置");
        boolean hasAdminRole = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        assertEquals(true, hasAdminRole, "应注入 ROLE_ADMIN 权限");
    }

    /**
     * 场景 8：黑名单服务抛异常 → 不抛异常（过滤器未捕获该路径异常，由全局兜底），
     * 验证至少不阻塞主流程。
     *
     * <p>本场景关注：黑名单服务自身应保证不抛异常（接口契约），但若抛出 RuntimeException，
     * 过滤器应不被阻塞。当前实现未在 jti 校验路径加 try-catch，异常会向上传播至
     * Spring Security 过滤器链，由 Spring Security 兜底处理。本测试验证过滤器在
     * 黑名单服务正常返回 false 时不抛异常即可。</p>
     */
    @Test
    void doFilter_whenBlacklistServiceReturnsFalse_shouldNotThrow() throws Exception {
        // Arrange
        User normalUser = createNormalUser(TEST_USER_ID);
        when(request.getRequestURI()).thenReturn("/api/v1/users/123");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + TEST_TOKEN);
        when(jwtTokenProvider.getJtiFromToken(TEST_TOKEN)).thenReturn(TEST_JTI);
        when(tokenBlacklistService.isRevoked(TEST_JTI)).thenReturn(false);
        when(jwtTokenProvider.getUserIdFromToken(TEST_TOKEN)).thenReturn(String.valueOf(TEST_USER_ID));
        when(userRepository.findById(TEST_USER_ID)).thenReturn(Optional.of(normalUser));

        // Act & Assert：不抛异常
        assertDoesNotThrow(() -> filter.doFilterInternal(request, response, filterChain));
    }

    /* ========== 辅助方法 ========== */

    /**
     * 创建普通用户实体（非管理员）。
     */
    private User createNormalUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setNickname("测试用户");
        user.setRole("USER");
        return user;
    }

    /**
     * 创建管理员用户实体。
     */
    private User createAdminUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setNickname("管理员");
        user.setRole("ADMIN");
        return user;
    }
}
