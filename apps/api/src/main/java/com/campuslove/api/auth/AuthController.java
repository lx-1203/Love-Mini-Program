package com.campuslove.api.auth;

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

    public AuthController(AuthService authService) {
        this.authService = authService;
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
     * @param request 包含微信登录 code 的请求体
     * @return 用户会话视图（包含 JWT 令牌）
     */
    @PostMapping("/wechat-login")
    public UserSessionView loginWithWechat(@Valid @RequestBody WechatLoginRequest request) {
        return authService.loginWithWechat(request.code());
    }

    /**
     * 刷新 JWT 令牌。
     * 验证旧令牌有效性后生成新令牌返回。
     *
     * @param authHeader Authorization 请求头，格式为 "Bearer {token}"
     * @return 包含新令牌的用户会话视图
     */
    @PostMapping("/refresh")
    public UserSessionView refreshToken(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
    ) {
        String oldToken = extractBearerToken(authHeader);
        return authService.refreshToken(oldToken);
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
        return authService.loginAsAdmin(request.username(), request.password());
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
