package com.campuslove.api.auth;

import com.campuslove.api.monitor.AuthMetrics;
import com.campuslove.api.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 微信小程序登录控制器（P0 / Task 0.1.2）。
 *
 * <p>提供 {@code POST /api/v1/auth/wechat} 端点，完成微信登录真实链路：</p>
 * <ol>
 *   <li>客户端调用 {@code wx.login()} 获取临时 code，POST 至本端点</li>
 *   <li>本端点委托 {@link AuthService#loginWithWechat(String)} 调用微信
 *       {@code jscode2session} 接口换取 openId / session_key</li>
 *   <li>查找或创建用户（{@code uk_users_openid} 唯一约束保证唯一性），
 *       签发 JWT，返回 {@link UserSessionView}</li>
 * </ol>
 *
 * <p>错误处理（业务错误码由 {@link WechatLoginException} 携带，经
 * {@link com.campuslove.api.config.GlobalExceptionHandler} 转换为标准化 JSON 错误响应）：</p>
 * <ul>
 *   <li>{@code INVALID_CODE}（401）：微信 code 失效或已过期，需重新拉起 wx.login</li>
 *   <li>{@code WECHAT_API_ERROR}（502）：微信 API 调用失败（网络异常 / 其他 errcode）</li>
 *   <li>{@code USER_DISABLED}（403）：用户已被管理员禁用，禁止登录</li>
 * </ul>
 *
 * <p>速率限制：桶容量 10，每 10 秒补充 1 个令牌（refillTokens=0.1/s），
 * 按客户端 IP 限流，防止登录爆破。与 {@link AuthController#loginWithWechat}
 * 保持一致策略。</p>
 */
@Tag(name = "Auth", description = "认证相关接口：微信登录、会话查询、令牌刷新、登出、管理员登录")
@RestController
@RequestMapping("/api/v1/auth")
public class WechatAuthController {

    private final AuthService authService;
    /**
     * 认证业务监控指标。用于记录登录成功/失败次数，通过 Micrometer 暴露到
     * /actuator/prometheus 供 Prometheus 抓取。
     */
    private final AuthMetrics authMetrics;

    public WechatAuthController(AuthService authService, AuthMetrics authMetrics) {
        this.authService = authService;
        this.authMetrics = authMetrics;
    }

    /**
     * 使用微信小程序临时登录凭证进行登录（Task 0.1.2 真实链路端点）。
     *
     * <p>流程：</p>
     * <ol>
     *   <li>接收前端 {@link WechatLoginRequest}（含 wx.login() 返回的 code）</li>
     *   <li>委托 {@link AuthService#loginWithWechat(String)} 完成微信 code2session
     *       换取 openId、查找/创建用户、签发 JWT</li>
     *   <li>返回 {@link UserSessionView}（含 token / userId / 完善度状态等）</li>
     * </ol>
     *
     * <p>失败时由 {@link WechatLoginException} 携带业务错误码，
     * {@link com.campuslove.api.config.GlobalExceptionHandler} 转换为
     * 对应 HTTP 状态码 + 标准 JSON 错误体。</p>
     *
     * @param request 包含微信登录 code 的请求体（{@code code} 不可为空）
     * @return 用户会话视图（包含 JWT 令牌）
     * @throws WechatLoginException 当 code 失效 / 微信 API 失败 / 用户被禁用时抛出
     */
    @PostMapping("/wechat")
    @Operation(
            summary = "微信小程序登录（推荐路径）",
            description = "接收前端 wx.login() 返回的临时 code，调用微信 code2session 换取 openId，查找或创建用户（uk_users_openid 唯一约束），签发 JWT 并返回用户会话视图。速率限制：桶容量 10，每 10 秒补充 1 个令牌（按 IP 限流）。",
            operationId = "loginWithWechat"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "登录成功，返回 JWT 与用户会话信息",
                    content = @Content(schema = @Schema(implementation = UserSessionView.class))),
            @ApiResponse(responseCode = "401", description = "INVALID_CODE：微信 code 失效或已过期", content = @Content),
            @ApiResponse(responseCode = "403", description = "USER_DISABLED：用户已被管理员禁用", content = @Content),
            @ApiResponse(responseCode = "429", description = "RATE_LIMITED：触发登录接口限流", content = @Content),
            @ApiResponse(responseCode = "502", description = "WECHAT_API_ERROR：微信 API 调用失败（网络异常或 errcode 非 0）", content = @Content)
    })
    @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
    public UserSessionView loginWithWechat(
            @Parameter(description = "微信登录请求体，包含 wx.login() 返回的 code（不可为空）", required = true)
            @Valid @RequestBody WechatLoginRequest request) {
        try {
            UserSessionView session = authService.loginWithWechat(request.code());
            // 登录成功：记录成功指标（指标失败不影响主流程）
            try {
                if (session != null && session.userId() != null) {
                    authMetrics.recordLoginSuccess(parseUserId(session.userId()));
                }
            } catch (RuntimeException ignore) {
                // 监控逻辑失败忽略，不影响登录主流程
            }
            return session;
        } catch (RuntimeException e) {
            // 登录失败：记录失败指标，原因取异常类名避免泄露敏感信息
            try {
                authMetrics.recordLoginFailure(e.getClass().getSimpleName());
            } catch (RuntimeException ignore) {
                // 监控逻辑失败忽略
            }
            throw e;
        }
    }

    /**
     * 将会话视图中的 userId 字符串安全转换为 Long。
     * 转换失败返回 null，避免监控逻辑因数据格式问题影响主流程。
     *
     * @param userIdStr 用户 ID 字符串
     * @return Long 类型用户 ID，或 null
     */
    private Long parseUserId(String userIdStr) {
        if (userIdStr == null || userIdStr.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(userIdStr);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
