package com.campuslove.api.auth;

import com.campuslove.api.monitor.AuthMetrics;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 微信登录控制器单元测试（Task 0.1.5）。
 *
 * <p>覆盖 {@link WechatAuthController#loginWithWechat(WechatLoginRequest)} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：登录成功 → 返回 UserSessionView，记录成功指标（userId 标签）</li>
 *   <li>场景 2：AuthService 抛出 {@link WechatLoginException}(INVALID_CODE)
 *       → 异常向上传播，记录失败指标（reason=异常类名）</li>
 *   <li>场景 3：AuthService 抛出 {@link WechatLoginException}(WECHAT_API_ERROR)
 *       → 异常向上传播，记录失败指标</li>
 *   <li>场景 4：AuthService 抛出 {@link WechatLoginException}(USER_DISABLED)
 *       → 异常向上传播，记录失败指标</li>
 *   <li>场景 5：session.userId() 为 null → 不记录成功指标（避免空指针）</li>
 *   <li>场景 6：AuthService 抛出非业务异常（如 RuntimeException）
 *       → 异常向上传播，记录失败指标</li>
 * </ul>
 *
 * <p>测试策略：纯 Mockito，不加载 Spring 上下文，保证测试快速与隔离。
 * 直接构造 {@link WechatAuthController} 实例，注入 mock 的 {@link AuthService}
 * 与 {@link AuthMetrics}。</p>
 */
class WechatAuthControllerTest {

    @Mock private AuthService authService;
    @Mock private AuthMetrics authMetrics;

    private WechatAuthController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new WechatAuthController(authService, authMetrics);
    }

    /**
     * 场景 1：登录成功 → 返回 UserSessionView，记录成功指标。
     *
     * <p>验证点：</p>
     * <ul>
     *   <li>controller 调用 authService.loginWithWechat(code, null)</li>
     *   <li>controller 调用 authMetrics.recordLoginSuccess(userId)</li>
     *   <li>返回的 session 与 authService 返回的一致</li>
     * </ul>
     */
    @Test
    void loginWithWechat_success_shouldReturnSessionAndRecordSuccessMetric() {
        // Arrange
        String code = "valid-wx-code";
        UserSessionView session = new UserSessionView(
                "100", true, "wechat", "测试用户",
                false, false, false, false,
                null, Map.of(), "jwt-token-abc"
        );
        when(authService.loginWithWechat(code, null)).thenReturn(session);

        // Act
        UserSessionView result = controller.loginWithWechat(new WechatLoginRequest(code, null));

        // Assert：返回的 session 与 mock 一致
        assertNotNull(result, "登录成功返回的 session 不应为 null");
        assertSame(session, result, "应直接返回 AuthService 的结果");
        assertEquals("100", result.userId(), "userId 应为 100");
        assertEquals("jwt-token-abc", result.token(), "token 应正确传递");

        // Assert：调用了 AuthService
        verify(authService).loginWithWechat(code, null);

        // Assert：记录了成功指标（userId 解析为 Long 100）
        verify(authMetrics).recordLoginSuccess(100L);
        // 不应记录失败指标
        verify(authMetrics, never()).recordLoginFailure(anyString());
    }

    /**
     * 场景 2：AuthService 抛出 WechatLoginException(INVALID_CODE)
     * → 异常向上传播，记录失败指标。
     *
     * <p>对应客户端 wx.login 返回的 code 已失效（errcode 40029）场景，
     * 后端 GlobalExceptionHandler 会将此异常转换为 401 + INVALID_CODE 错误响应。</p>
     */
    @Test
    void loginWithWechat_invalidCode_shouldPropagateExceptionAndRecordFailure() {
        // Arrange
        String code = "expired-wx-code";
        WechatLoginException ex = new WechatLoginException(
                WechatLoginException.ErrorCode.INVALID_CODE);
        when(authService.loginWithWechat(code, null)).thenThrow(ex);

        // Act & Assert：异常应向上传播
        WechatLoginException thrown = assertThrows(WechatLoginException.class,
                () -> controller.loginWithWechat(new WechatLoginRequest(code, null)));

        // Assert：异常错误码正确
        assertEquals(WechatLoginException.ErrorCode.INVALID_CODE,
                thrown.getErrorCode(), "错误码应为 INVALID_CODE");
        assertEquals(401, thrown.getStatus().value(), "HTTP 状态码应为 401");

        // Assert：记录了失败指标（reason 为异常类名）
        verify(authMetrics).recordLoginFailure("WechatLoginException");
        // 不应记录成功指标
        verify(authMetrics, never()).recordLoginSuccess(anyLong());
    }

    /**
     * 场景 3：AuthService 抛出 WechatLoginException(WECHAT_API_ERROR)
     * → 异常向上传播，记录失败指标。
     *
     * <p>对应微信 API 调用失败场景（网络异常 / 非 0 errcode），
     * 后端 GlobalExceptionHandler 会将此异常转换为 502 + WECHAT_API_ERROR。</p>
     */
    @Test
    void loginWithWechat_wechatApiError_shouldPropagateExceptionAndRecordFailure() {
        // Arrange
        String code = "valid-wx-code-but-wechat-down";
        WechatLoginException ex = new WechatLoginException(
                WechatLoginException.ErrorCode.WECHAT_API_ERROR,
                "微信服务暂时不可用：network timeout");
        when(authService.loginWithWechat(code, null)).thenThrow(ex);

        // Act & Assert
        WechatLoginException thrown = assertThrows(WechatLoginException.class,
                () -> controller.loginWithWechat(new WechatLoginRequest(code, null)));

        // Assert
        assertEquals(WechatLoginException.ErrorCode.WECHAT_API_ERROR,
                thrown.getErrorCode(), "错误码应为 WECHAT_API_ERROR");
        assertEquals(502, thrown.getStatus().value(), "HTTP 状态码应为 502");

        // Assert：记录了失败指标
        verify(authMetrics).recordLoginFailure("WechatLoginException");
        verify(authMetrics, never()).recordLoginSuccess(anyLong());
    }

    /**
     * 场景 4：AuthService 抛出 WechatLoginException(USER_DISABLED)
     * → 异常向上传播，记录失败指标。
     *
     * <p>对应用户被管理员禁用场景，后端 GlobalExceptionHandler 会将此异常
     * 转换为 403 + USER_DISABLED 错误响应。</p>
     */
    @Test
    void loginWithWechat_userDisabled_shouldPropagateExceptionAndRecordFailure() {
        // Arrange
        String code = "valid-wx-code-but-user-disabled";
        WechatLoginException ex = new WechatLoginException(
                WechatLoginException.ErrorCode.USER_DISABLED);
        when(authService.loginWithWechat(code, null)).thenThrow(ex);

        // Act & Assert
        WechatLoginException thrown = assertThrows(WechatLoginException.class,
                () -> controller.loginWithWechat(new WechatLoginRequest(code, null)));

        // Assert
        assertEquals(WechatLoginException.ErrorCode.USER_DISABLED,
                thrown.getErrorCode(), "错误码应为 USER_DISABLED");
        assertEquals(403, thrown.getStatus().value(), "HTTP 状态码应为 403");

        // Assert：记录了失败指标
        verify(authMetrics).recordLoginFailure("WechatLoginException");
        verify(authMetrics, never()).recordLoginSuccess(anyLong());
    }

    /**
     * 场景 5：session.userId() 为 null → 不记录成功指标（避免 NPE）。
     *
     * <p>对应边界场景：AuthService 返回了 session，但 userId 字段为 null
     * （如未完成用户创建的过渡态）。controller 应跳过指标记录，但仍返回 session。</p>
     */
    @Test
    void loginWithWechat_nullUserId_shouldNotRecordSuccessMetric() {
        // Arrange：userId 为 null
        String code = "edge-case-code";
        UserSessionView session = new UserSessionView(
                null, true, "wechat", "",
                false, false, false, false,
                null, Map.of(), "jwt-token"
        );
        when(authService.loginWithWechat(code, null)).thenReturn(session);

        // Act
        UserSessionView result = controller.loginWithWechat(new WechatLoginRequest(code, null));

        // Assert：返回的 session 不为 null
        assertNotNull(result, "session 不应为 null");

        // Assert：由于 userId 为 null，不应调用 recordLoginSuccess
        verify(authMetrics, never()).recordLoginSuccess(any());
        // 也不应记录失败指标（登录本身成功）
        verify(authMetrics, never()).recordLoginFailure(anyString());
    }

    /**
     * 场景 6：AuthService 抛出非业务异常（如 IllegalStateException）
     * → 异常向上传播，记录失败指标（reason=异常类名）。
     *
     * <p>对应未预期的内部错误场景，controller 应统一记录失败指标，
     * 不吞噬异常，让 GlobalExceptionHandler 处理。</p>
     */
    @Test
    void loginWithWechat_runtimeException_shouldPropagateAndRecordFailure() {
        // Arrange
        String code = "any-code";
        RuntimeException ex = new IllegalStateException("DB connection lost");
        when(authService.loginWithWechat(code, null)).thenThrow(ex);

        // Act & Assert：原异常应向上传播（不被包装）
        RuntimeException thrown = assertThrows(RuntimeException.class,
                () -> controller.loginWithWechat(new WechatLoginRequest(code, null)));

        // Assert：异常类型与原始异常一致
        assertSame(ex, thrown, "应原样抛出异常，不被包装");

        // Assert：记录了失败指标，reason 为异常类名
        verify(authMetrics).recordLoginFailure("IllegalStateException");
        verify(authMetrics, never()).recordLoginSuccess(anyLong());
    }

    /**
     * 场景 7：AuthMetrics.recordLoginSuccess 抛出异常 → 不影响登录主流程。
     *
     * <p>验证 controller 的容错策略：监控逻辑失败不应影响登录主流程，
     * session 应正常返回。</p>
     */
    @Test
    void loginWithWechat_metricsFailure_shouldNotAffectMainFlow() {
        // Arrange
        String code = "valid-wx-code";
        UserSessionView session = new UserSessionView(
                "200", true, "wechat", "用户",
                false, false, false, false,
                null, Map.of(), "jwt-token"
        );
        when(authService.loginWithWechat(code, null)).thenReturn(session);
        // 模拟监控指标记录失败
        doThrow(new RuntimeException("metrics backend down"))
                .when(authMetrics).recordLoginSuccess(200L);

        // Act：即使监控失败，登录主流程应正常返回 session
        UserSessionView result = controller.loginWithWechat(new WechatLoginRequest(code, null));

        // Assert：session 正常返回
        assertNotNull(result, "监控失败不应影响登录主流程");
        assertSame(session, result, "应返回 AuthService 的原始 session");

        // Assert：尝试调用了 recordLoginSuccess（即使抛出异常）
        verify(authMetrics).recordLoginSuccess(200L);
        // 不应记录失败指标（登录本身成功）
        verify(authMetrics, never()).recordLoginFailure(anyString());
    }

    /**
     * 场景 8：session.userId() 为非数字字符串 → parseUserId 返回 null，
     * 但仍调用 recordLoginSuccess(null)。
     *
     * <p>验证 controller 对 userId 字符串非数字格式的容错：
     * parseUserId 返回 null 时，recordLoginSuccess(null) 仍被调用，
     * AuthMetrics 内部对 null 做了 "unknown" 兜底处理。</p>
     */
    @Test
    void loginWithWechat_nonNumericUserId_shouldCallMetricsWithNull() {
        // Arrange：userId 为非数字字符串
        String code = "weird-user-id-code";
        UserSessionView session = new UserSessionView(
                "non-numeric-id", true, "wechat", "用户",
                false, false, false, false,
                null, Map.of(), "jwt-token"
        );
        when(authService.loginWithWechat(code, null)).thenReturn(session);

        // Act
        UserSessionView result = controller.loginWithWechat(new WechatLoginRequest(code, null));

        // Assert：返回的 session 正常
        assertNotNull(result);

        // Assert：调用了 recordLoginSuccess(null)（parseUserId 返回 null）
        verify(authMetrics).recordLoginSuccess(eq(null));
        verify(authMetrics, never()).recordLoginFailure(anyString());
    }
}
