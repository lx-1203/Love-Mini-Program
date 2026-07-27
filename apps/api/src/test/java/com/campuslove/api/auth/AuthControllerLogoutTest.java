package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.campuslove.api.monitor.AuthMetrics;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * {@link AuthController#logout} 与 {@link AuthController#logoutAsAdmin} 单元测试（Task 0.5.3）。
 *
 * <p>覆盖核心场景：
 * <ul>
 *   <li>场景 1：logout 携带有效 Bearer token → 调用 authService.logout(token)，返回 {success: true}</li>
 *   <li>场景 2：logout 无 Authorization 头 → 调用 authService.logout(null)，仍返回 {success: true}</li>
 *   <li>场景 3：logout Authorization 头格式错误（非 Bearer 前缀）→ 调用 authService.logout(null)</li>
 *   <li>场景 4：logoutAsAdmin 携带 token → 调用 authService.logoutAsAdmin(token)，返回 {success: true}</li>
 *   <li>场景 5：authService.logout 抛异常 → 异常向上传播（由 GlobalExceptionHandler 处理）</li>
 *   <li>场景 6：logout 返回的 Map 不可变且包含 success=true</li>
 * </ul>
 *
 * <p>测试策略：纯 Mockito，不加载 Spring 上下文。验证 AuthController 是否正确委托给
 * AuthService，并保证登出接口在 Task 0.5.3 引入 Redis 黑名单后行为不变（黑名单逻辑
 * 由 RealAuthService.doLogout 内部调用 TokenBlacklistService 实现，本测试聚焦于
 * Controller 层的契约）。</p>
 *
 * <p>Task 0.5.3 关联：登出接口是触发 Redis Token 黑名单写入的入口。本测试通过 mock
 * AuthService 验证 Controller 层正确委托，详细的黑名单写入逻辑由 RealAuthServiceTest
 * 与 RedisTokenBlacklistServiceTest 覆盖。</p>
 */
class AuthControllerLogoutTest {

    @Mock
    private AuthService authService;

    @Mock
    private AuthMetrics authMetrics;

    private AuthController controller;

    /** 测试用 token */
    private static final String TEST_TOKEN = "jwt-token-abc-123";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AuthController(authService, authMetrics);
    }

    /* ========== logout 场景 ========== */

    /**
     * 场景 1：logout 携带有效 Bearer token → 调用 authService.logout(token)，
     * 返回 {success: true}。
     *
     * <p>关键验证点：
     * <ul>
     *   <li>从 Authorization 头提取 Bearer token</li>
     *   <li>调用 authService.logout(token) 一次</li>
     *   <li>返回 Map 包含 success=true</li>
     * </ul>
     */
    @Test
    void logout_withValidBearerToken_shouldDelegateToAuthServiceAndReturnSuccess() {
        // Arrange
        String authHeader = "Bearer " + TEST_TOKEN;

        // Act
        Map<String, Boolean> result = controller.logout(authHeader);

        // Assert：调用 authService.logout(token)
        verify(authService).logout(TEST_TOKEN);
        // Assert：返回 success=true
        assertNotNull(result, "logout 返回不应为 null");
        assertEquals(Boolean.TRUE, result.get("success"), "logout 应返回 success=true");
    }

    /**
     * 场景 2：logout 无 Authorization 头 → 调用 authService.logout(null)，
     * 仍返回 {success: true}。
     *
     * <p>设计语义：登出接口对未携带 token 的请求保持幂等，避免攻击者通过未携带 token
     * 触发 401 来探测接口存在性。AuthService.logout(null) 内部应安全处理 null 入参。</p>
     */
    @Test
    void logout_withNoAuthHeader_shouldDelegateNullAndReturnSuccess() {
        // Act
        Map<String, Boolean> result = controller.logout(null);

        // Assert：调用 authService.logout(null)
        verify(authService).logout(null);
        // Assert：返回 success=true
        assertEquals(Boolean.TRUE, result.get("success"),
                "无 Authorization 头时 logout 仍应返回 success=true");
    }

    /**
     * 场景 3：logout Authorization 头格式错误（非 Bearer 前缀）→ 调用 authService.logout(null)。
     *
     * <p>触发场景：客户端误传 Basic 鉴权头或裸 token。extractBearerToken 返回 null，
     * authService.logout(null) 安全处理。</p>
     */
    @Test
    void logout_withMalformedAuthHeader_shouldDelegateNullAndReturnSuccess() {
        // Arrange：非 Bearer 前缀
        String malformedHeader = "Basic dXNlcjpwYXNz";
        // logout 返回 void，使用 doNothing() 显式声明默认行为
        doNothing().when(authService).logout(null);

        // Act
        Map<String, Boolean> result = controller.logout(malformedHeader);

        // Assert：调用 authService.logout(null)
        verify(authService).logout(null);
        // Assert：返回 success=true
        assertEquals(Boolean.TRUE, result.get("success"),
                "Authorization 头格式错误时 logout 仍应返回 success=true");
    }

    /**
     * 场景 4：logoutAsAdmin 携带 token → 调用 authService.logoutAsAdmin(token)，
     * 返回 {success: true}。
     *
     * <p>验证管理员登出接口与普通登出接口行为对称。</p>
     */
    @Test
    void logoutAsAdmin_withValidBearerToken_shouldDelegateToAuthServiceAndReturnSuccess() {
        // Arrange
        String authHeader = "Bearer " + TEST_TOKEN;

        // Act
        Map<String, Boolean> result = controller.logoutAsAdmin(authHeader);

        // Assert：调用 authService.logoutAsAdmin(token)
        verify(authService).logoutAsAdmin(TEST_TOKEN);
        // Assert：返回 success=true
        assertNotNull(result, "logoutAsAdmin 返回不应为 null");
        assertEquals(Boolean.TRUE, result.get("success"),
                "logoutAsAdmin 应返回 success=true");
    }

    /**
     * 场景 5：authService.logout 抛异常 → 异常向上传播，由 GlobalExceptionHandler 处理。
     *
     * <p>触发场景：AuthService 内部解析 token 失败抛出 RuntimeException。Controller 层
     * 不吞异常，保证全局异常处理器能统一转换为标准化 JSON 错误体。</p>
     */
    @Test
    void logout_whenAuthServiceThrowsException_shouldPropagateException() {
        // Arrange
        String authHeader = "Bearer " + TEST_TOKEN;
        // logout 返回 void，使用 doThrow() 模拟异常抛出
        doThrow(new RuntimeException("Redis unavailable")).when(authService).logout(TEST_TOKEN);

        // Act & Assert：异常向上传播
        RuntimeException thrown = assertThrows(
                RuntimeException.class,
                () -> controller.logout(authHeader));
        assertEquals("Redis unavailable", thrown.getMessage());
    }

    /**
     * 场景 6：logout 返回的 Map 包含 success=true 且 size=1。
     *
     * <p>验证返回值结构与历史契约一致，避免前端因字段变化而解析失败。</p>
     */
    @Test
    void logout_shouldReturnMapWithOnlySuccessField() {
        // Act
        Map<String, Boolean> result = controller.logout("Bearer " + TEST_TOKEN);

        // Assert：Map 仅包含 success 字段
        assertEquals(1, result.size(), "logout 返回的 Map 应仅包含 success 字段");
        assertTrue(result.containsKey("success"), "Map 应包含 success key");
        assertEquals(Boolean.TRUE, result.get("success"));
    }

    /* ========== Token 提取边界场景 ========== */

    /**
     * 场景 7：Bearer 后 token 为空字符串 → 提取结果为空字符串，传递给 authService。
     *
     * <p>边界场景：客户端发送 "Bearer "（带空格但无 token）。extractBearerToken 返回空字符串，
     * AuthService 内部应安全处理（不抛异常，仅记录日志）。</p>
     */
    @Test
    void logout_withBearerButEmptyToken_shouldDelegateEmptyString() {
        // Arrange：Bearer 后无 token
        String authHeader = "Bearer ";

        // Act
        Map<String, Boolean> result = controller.logout(authHeader);

        // Assert：调用 authService.logout("") —— extractBearerToken 返回 substring(7) = ""
        verify(authService).logout("");
        // Assert：返回 success=true
        assertEquals(Boolean.TRUE, result.get("success"));
    }

    /**
     * 场景 8：logout 多次调用 → 每次都委托给 authService，幂等性由 AuthService 保证。
     *
     * <p>验证登出接口可重复调用，不会因前一次登出已加入黑名单而失败。</p>
     */
    @Test
    void logout_multipleCalls_shouldAlwaysDelegateToAuthService() {
        // Arrange
        String authHeader = "Bearer " + TEST_TOKEN;

        // Act：连续 3 次登出
        controller.logout(authHeader);
        controller.logout(authHeader);
        controller.logout(authHeader);

        // Assert：authService.logout 被调用 3 次
        verify(authService, times(3)).logout(TEST_TOKEN);
    }
}
