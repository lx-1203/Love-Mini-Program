package com.campuslove.api.auth;

import com.campuslove.api.monitor.AuthMetrics;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证控制器。
 * 提供微信登录、获取当前用户会话和刷新令牌的 API。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    /**
     * 认证业务监控指标。用于记录登录成功/失败、Token 刷新次数等。
     * 通过 Micrometer 暴露到 /actuator/prometheus 供 Prometheus 抓取。
     */
    private final AuthMetrics authMetrics;

    public AuthController(AuthService authService, AuthMetrics authMetrics) {
        this.authService = authService;
        this.authMetrics = authMetrics;
    }

    /**
     * 获取当前用户会话信息。
     * 从 Authorization 请求头中提取 Bearer token 进行身份验证。
     *
     * @param authHeader Authorization 请求头，格式为 "Bearer {token}"
     * @return 用户会话视图
     */
    @GetMapping("/me")
    public UserSessionView getCurrentSession(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        String token = extractBearerToken(authHeader);
        return authService.getCurrentSession(token);
    }

    /**
     * 使用微信小程序临时登录凭证进行登录。
     *
     * <p>速率限制：桶容量 10，每 10 秒补充 1 个令牌（refillTokens=0.1/s），
     * 按客户端 IP 限流，防止登录爆破。</p>
     *
     * @param request 包含微信登录 code 的请求体
     * @return 用户会话视图（包含 JWT 令牌）
     */
    @PostMapping("/wechat-login")
    @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
    public UserSessionView loginWithWechat(@Valid @RequestBody WechatLoginRequest request) {
        try {
            UserSessionView session = authService.loginWithWechat(request.code());
            // 登录成功：记录成功指标（指标失败不影响主流程）
            try {
                if (session != null && session.userId() != null) {
                    authMetrics.recordLoginSuccess(parseUserId(session.userId()));
                }
            } catch (Exception ignore) {
                // 监控逻辑失败忽略，不影响登录主流程
            }
            return session;
        } catch (RuntimeException e) {
            // 登录失败：记录失败指标，原因取异常类名避免泄露敏感信息
            try {
                authMetrics.recordLoginFailure(e.getClass().getSimpleName());
            } catch (Exception ignore) {
                // 监控逻辑失败忽略
            }
            throw e;
        }
    }

    /**
     * 刷新 JWT 令牌。
     * 验证旧令牌有效性后生成新令牌返回。
     *
     * <p>速率限制：桶容量 20，每 2 秒补充 1 个令牌（refillTokens=0.5/s），
     * 按客户端 IP 限流，防止刷新接口被滥用。</p>
     *
     * @param authHeader Authorization 请求头，格式为 "Bearer {token}"
     * @return 包含新令牌的用户会话视图
     */
    @PostMapping("/refresh")
    @RateLimit(capacity = 20, refillTokens = 0.5, key = "#request.remoteAddr")
    public UserSessionView refreshToken(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        String oldToken = extractBearerToken(authHeader);
        UserSessionView session = authService.refreshToken(oldToken);
        // 记录 Token 刷新指标
        try {
            authMetrics.recordTokenRefresh();
        } catch (Exception ignore) {
            // 监控逻辑失败忽略，不影响主流程
        }
        return session;
    }

    /**
     * 用户登出。
     * 从 Authorization 请求头中提取 Bearer token，交由 AuthService 处理。
     * 当前实现使用无状态 JWT，仅记录登出日志。
     *
     * @param authHeader Authorization 请求头，格式为 "Bearer {token}"
     * @return 包含 success 标志的响应体
     */
    @PostMapping("/logout")
    public Map<String, Boolean> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        String token = extractBearerToken(authHeader);
        authService.logout(token);
        return Map.of("success", true);
    }

    /**
     * 管理员账号密码登录。
     *
     * @param request 包含管理员账号和密码的请求体
     * @return 用户会话视图（包含 JWT 令牌）
     */
    @PostMapping("/admin/login")
    public UserSessionView loginAsAdmin(@Valid @RequestBody AdminLoginRequest request) {
        try {
            UserSessionView session = authService.loginAsAdmin(request.username(), request.password());
            // 管理员登录成功：记录成功指标
            try {
                if (session != null && session.userId() != null) {
                    authMetrics.recordLoginSuccess(parseUserId(session.userId()));
                }
            } catch (Exception ignore) {
                // 监控逻辑失败忽略
            }
            return session;
        } catch (RuntimeException e) {
            // 管理员登录失败：记录失败指标（reason 统一为 admin_invalid_credentials 避免泄露账号信息）
            try {
                authMetrics.recordLoginFailure("admin_invalid_credentials");
            } catch (Exception ignore) {
                // 监控逻辑失败忽略
            }
            throw e;
        }
    }

    /**
     * 管理员登出。语义同 /logout，单独提供用于审计与未来扩展。
     *
     * @param authHeader Authorization 请求头，格式为 "Bearer {token}"
     * @return 包含 success 标志的响应体
     */
    @PostMapping("/admin/logout")
    public Map<String, Boolean> logoutAsAdmin(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        String token = extractBearerToken(authHeader);
        authService.logoutAsAdmin(token);
        return Map.of("success", true);
    }

    /**
     * 从 Authorization 请求头中提取 Bearer token。
     *
     * @param authHeader Authorization 请求头值
     * @return 提取出的 token 字符串，如果格式不匹配则返回 null
     */
    private String extractBearerToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
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

record WechatLoginRequest(@NotBlank String code) {
}

/**
 * 管理员登录请求体。
 *
 * @param username 管理员账号（不可为空）
 * @param password 管理员密码（不可为空）
 */
record AdminLoginRequest(@NotBlank String username, @NotBlank String password) {
}
