package com.campuslove.api.auth;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.monitor.AuthMetrics;
import com.campuslove.api.ratelimit.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
@Tag(name = "Auth", description = "认证相关接口：微信登录、会话查询、令牌刷新、登出、管理员登录")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    /**
     * 认证业务监控指标。用于记录登录成功/失败、Token 刷新次数等。
     * 通过 Micrometer 暴露到 /actuator/prometheus 供 Prometheus 抓取。
     */
    private final AuthMetrics authMetrics;
    /**
     * 用户仓库，用于构造管理后台登录响应的 user 摘要（infra R2-00026）。
     * 使用 ObjectProvider 可选注入：mock profile 排除了 JPA(无 UserRepository bean),
     * 该场景下管理员登录走 MockAuthService 且无需查库,退化为基于 session 构造。
     */
    private final org.springframework.beans.factory.ObjectProvider<com.campuslove.api.repository.UserRepository> userRepositoryProvider;
    /** 运行环境(security_review R2-LOW-01:mock 降级分支需校验 active profiles) */
    private final org.springframework.core.env.Environment environment;

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(AuthController.class);

    public AuthController(AuthService authService, AuthMetrics authMetrics,
                          org.springframework.beans.factory.ObjectProvider<com.campuslove.api.repository.UserRepository> userRepositoryProvider,
                          org.springframework.core.env.Environment environment) {
        this.authService = authService;
        this.authMetrics = authMetrics;
        this.userRepositoryProvider = userRepositoryProvider;
        this.environment = environment;
    }

    /**
     * 获取当前用户会话信息。
     * 从 Authorization 请求头中提取 Bearer token 进行身份验证。
     *
     * @param authHeader Authorization 请求头，格式为 "Bearer {token}"
     * @return 用户会话视图
     */
    @GetMapping("/me")
    @Operation(
            summary = "获取当前用户会话",
            description = "从 Authorization 请求头中提取 Bearer token 进行身份验证，返回当前登录用户的会话信息（含 userId、VIP 状态、资料完成度等）。",
            operationId = "getCurrentSession"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "会话有效，返回用户会话视图",
                    content = @Content(schema = @Schema(implementation = UserSessionView.class)),
                    headers = {@Header(name = "X-Trace-Id", description = "请求追踪 ID")}),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "未授权：token 缺失/失效/已撤销", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "用户已禁用", content = @Content)
    })
    public UserSessionView getCurrentSession(
            @Parameter(name = "Authorization", description = "JWT Bearer Token，格式 'Bearer {token}'", required = true,
                    example = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.xxx")
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
    /**
     * 注册新用户（手机号 + 密码 + 昵称）。
     *
     * <p>参考 eladmin 账号注册模式:手机号作为登录账号,密码 BCrypt 存储。
     * 注册成功直接签发 JWT,无需二次登录。公开端点(无需登录)。</p>
     *
     * @param request 注册请求(phone/password/nickname)
     * @return 用户会话视图(包含 JWT 令牌)
     */
    @PostMapping("/register")
    public UserSessionView register(@Valid @RequestBody RegisterRequest request) {
        return authService.registerUser(
                request.phone(), request.password(), request.nickname());
    }

    /**
     * 手机号 + 密码登录。
     *
     * @param request 登录请求(phone/password)
     * @return 用户会话视图(包含 JWT 令牌)
     */
    @PostMapping("/phone-login")
    public UserSessionView phoneLogin(@Valid @RequestBody PhoneLoginRequest request) {
        return authService.loginWithPhone(request.phone(), request.password());
    }

    /**
     * 体验账号一键登录（登录页「一键体验全部功能」临时号）。
     *
     * <p>首次调用自动创建固定体验账号并签发 JWT，后续复用同一账号（幂等），
     * 无需注册/输入密码即可体验全部功能。公开端点（无需登录）。</p>
     *
     * <p>安全说明：体验账号密码为随机值，无法通过手机号密码登录；
     * 商业化上线前可通过配置 {@code app.guest-login.enabled=false} 关闭该入口。</p>
     *
     * @return 用户会话视图(包含 JWT 令牌)
     */
    @PostMapping("/guest-login")
    public UserSessionView guestLogin() {
        return authService.loginAsGuest();
    }


    @PostMapping("/wechat-login")
    @Operation(
            summary = "微信小程序登录（旧路径，建议使用 /auth/wechat）",
            description = "接收前端 wx.login() 返回的临时 code，调用微信 code2session 换取 openId，签发 JWT。速率限制：桶容量 10，每 10 秒补充 1 个令牌（按 IP 限流）。",
            operationId = "loginWithWechatLegacy"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "登录成功，返回 JWT 与用户会话信息",
                    content = @Content(schema = @Schema(implementation = UserSessionView.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "INVALID_CODE：微信 code 失效或已过期", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "USER_DISABLED：用户已被管理员禁用", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "RATE_LIMITED：触发登录接口限流", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "502", description = "WECHAT_API_ERROR：微信 API 调用失败", content = @Content)
    })
    @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
    public UserSessionView loginWithWechat(
            @Parameter(description = "微信登录请求体，包含 wx.login() 返回的 code", required = true)
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
    @Operation(
            summary = "刷新 JWT 令牌",
            description = "验证旧令牌有效性后生成新令牌返回。支持幂等性（Idempotency-Key）。速率限制：桶容量 20，每 2 秒补充 1 个令牌。",
            operationId = "refreshToken"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "刷新成功，返回新令牌",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "原令牌无效或已撤销", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "触发限流", content = @Content)
    })
    @RateLimit(capacity = 20, refillTokens = 0.5, key = "#request.remoteAddr")
    @Idempotent
    public UserSessionView refreshToken(
            @Parameter(name = "Authorization", description = "JWT Bearer Token，格式 'Bearer {token}'", required = true)
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        String oldToken = extractBearerToken(authHeader);
        UserSessionView session = authService.refreshToken(oldToken);
        // 记录 Token 刷新指标
        try {
            authMetrics.recordTokenRefresh();
        } catch (RuntimeException ignore) {
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
    @Operation(
            summary = "用户登出",
            description = "从 Authorization 请求头提取 Bearer token，将 JWT 加入 Redis 黑名单实现主动撤销。后续使用该 token 的请求返回 401。",
            operationId = "logout"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "登出成功，返回 success=true"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "token 无效", content = @Content)
    })
    public Map<String, Boolean> logout(
            @Parameter(name = "Authorization", description = "JWT Bearer Token，格式 'Bearer {token}'", required = true)
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        String token = extractBearerToken(authHeader);
        authService.logout(token);
        return Map.of("success", true);
    }

    /**
     * 管理员账号密码登录。
     *
     * <p>修复（FIN MED-52）：增加 {@code @RateLimit}（桶容量 10，每 10 秒补充 1 个令牌，
     * 按客户端 IP 限流），与微信登录（{@link #loginWithWechat}）策略一致，防止密码爆破。</p>
     *
     * @param request 包含管理员账号和密码的请求体
     * @return 用户会话视图（包含 JWT 令牌）
     */
    @PostMapping("/admin/login")
    @Operation(
            summary = "管理员账号密码登录",
            description = "管理员通过账号密码登录，校验 enabled/status 字段。支持幂等性。登录成功后返回带 ADMIN 角色的 JWT。",
            operationId = "loginAsAdmin"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "登录成功",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "ADMIN_INVALID_CREDENTIALS：账号或密码错误", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "ADMIN_DISABLED：管理员账号已被禁用", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "RATE_LIMITED：触发登录接口限流", content = @Content)
    })
    @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
    @Idempotent
    public ApiResponse<AdminLoginView> loginAsAdmin(
            @Parameter(description = "管理员登录请求体（username + password）", required = true)
            @Valid @RequestBody AdminLoginRequest request) {
        try {
            UserSessionView session = authService.loginAsAdmin(request.username(), request.password());
            // 管理员登录成功：记录成功指标
            try {
                if (session != null && session.userId() != null) {
                    authMetrics.recordLoginSuccess(parseUserId(session.userId()));
                }
            } catch (RuntimeException ignore) {
                // 监控逻辑失败忽略
            }
            // infra R2-00026：按管理后台前端契约 {token, user:{id,username,displayName,role}} 构造载荷
            Long userId = session != null && session.userId() != null ? parseUserId(session.userId()) : null;
            // mock profile 无 JPA 仓库,直接基于 session 构造(role 固定 ADMIN)
            com.campuslove.api.repository.UserRepository userRepo = userRepositoryProvider.getIfAvailable();
            if (userRepo == null) {
                // security_review 修复(R2-LOW-01):仅允许 mock profile 走降级签发分支,
                // 防止非 mock 环境因 JPA 配置异常而静默以固定 ADMIN 角色签发会话。
                // real 环境 UserRepository 必然存在,若缺失说明配置异常,拒绝降级。
                boolean isMockProfile = org.springframework.core.env.Environment.class
                        .isAssignableFrom(environment.getClass())
                        && org.springframework.core.env.AbstractEnvironment.class
                                .isAssignableFrom(environment.getClass())
                        && java.util.Arrays.asList(
                                ((org.springframework.core.env.AbstractEnvironment) environment)
                                        .getActiveProfiles()).contains("mock");
                if (!isMockProfile) {
                    log.error("UserRepository bean 缺失且非 mock profile,拒绝签发管理员会话");
                    throw new com.campuslove.api.common.OperationForbiddenException("系统配置异常，请联系管理员");
                }
                String mockRole = "ADMIN";
                AdminLoginView mockView = new AdminLoginView(
                        session.token(),
                        new AdminLoginView.AdminUserInfo(
                                userId,
                                request.username(),
                                session.displayName(),
                                mockRole,
                                // C-04：mock 分支无 JPA 仓库，校区名取会话视图中的 campusName
                                session != null ? session.campusName() : null
                        )
                );
                return ApiResponse.ok(mockView);
            }
            com.campuslove.api.entity.User admin = userId != null
                    ? userRepo.findById(userId).orElse(null) : null;
            // review 修复（infra R2-00026）：登录成功但用户记录不存在（被删除）时
            // 不得签发可用的管理员会话——拒绝登录并抛出 401
            if (admin == null) {
                log.warn("管理员登录成功但用户记录不存在，拒绝签发会话: userId={}", userId);
                throw new com.campuslove.api.common.OperationForbiddenException("账号状态异常，请联系管理员");
            }
            String role = admin.isSuperAdmin() ? "SUPER_ADMIN" : "ADMIN";
            String username = admin.getOpenid() != null ? admin.getOpenid() : request.username();
            AdminLoginView view = new AdminLoginView(
                    session.token(),
                    new AdminLoginView.AdminUserInfo(
                            userId,
                            username,
                            admin.getNickname() != null ? admin.getNickname() : username,
                            role,
                            // C-04：校区名取自 users.campus_name（admin 前端 session.ts 读 user.campusName）
                            admin.getCampusName()
                    )
            );
            return ApiResponse.ok(view);
        } catch (RuntimeException e) {
            // 管理员登录失败：记录失败指标（reason 统一为 admin_invalid_credentials 避免泄露账号信息）
            try {
                authMetrics.recordLoginFailure("admin_invalid_credentials");
            } catch (RuntimeException ignore) {
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
    @Operation(
            summary = "管理员登出",
            description = "语义同 /logout，单独提供用于审计与未来扩展。撤销 JWT 并记录审计日志。",
            operationId = "logoutAsAdmin"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "登出成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "token 无效", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "非管理员角色", content = @Content)
    })
    public Map<String, Boolean> logoutAsAdmin(
            @Parameter(name = "Authorization", description = "JWT Bearer Token，格式 'Bearer {token}'", required = true)
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

/**
 * 管理员登录请求体。
 *
 * @param username 管理员账号（不可为空）
 * @param password 管理员密码（不可为空）
 */
record AdminLoginRequest(
    @NotBlank @Size(max = 128, message = "username 长度不能超过 128") String username,
    // infra R2-00207: 密码长度上限，防止超大密码触发 BCrypt 高 CPU 计算
    @NotBlank @Size(max = 128, message = "password 长度不能超过 128") String password) {
}

/**
 * 注册请求体（infra R2 联调新增,参考 eladmin 账号注册模式）。
 *
 * @param phone    手机号（11 位,1[3-9] 开头）
 * @param password 密码（6-64 位）
 * @param nickname 昵称（1-20 字）
 */
record RegisterRequest(
    @NotBlank @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确") String phone,
    @NotBlank @Size(min = 6, max = 64, message = "密码长度须为 6-64 位") String password,
    @NotBlank @Size(min = 1, max = 20, message = "昵称长度须为 1-20 字") String nickname) {
}

/**
 * 手机号登录请求体（infra R2 联调新增）。
 *
 * @param phone    手机号
 * @param password 密码
 */
record PhoneLoginRequest(
    @NotBlank @Size(max = 32, message = "手机号长度不合法") String phone,
    @NotBlank @Size(max = 64, message = "密码长度不合法") String password) {
}
