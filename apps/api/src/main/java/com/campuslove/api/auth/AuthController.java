package com.campuslove.api.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证控制器。
 * 提供微信登录和获取当前用户会话的 API。
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
