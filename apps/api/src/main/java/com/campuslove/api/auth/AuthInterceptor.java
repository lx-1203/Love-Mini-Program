package com.campuslove.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 简单 Token 认证拦截器。
 * 从 Authorization: Bearer <token> 头中提取 token，验证后设置 userId 到 request attribute。
 * 跳过 /api/auth/** 路径的认证检查。
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuthInterceptor.class);

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                              Object handler) throws Exception {
        String path = request.getRequestURI();

        // 跳过认证路径
        if (path.startsWith("/api/auth/")) {
            return true;
        }

        // 跳过非 API 路径
        if (!path.startsWith("/api/")) {
            return true;
        }

        // 提取 Bearer token
        String authHeader = request.getHeader(AUTH_HEADER);
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            // 宽容模式：没有 token 时不拒绝请求，但 userId 不会设置
            // 上游 Controller 自行决定是否拒绝匿名请求
            return true;
        }

        String token = authHeader.substring(BEARER_PREFIX.length()).trim();
        Long userId = authService.resolveToken(token);

        if (userId != null) {
            request.setAttribute("userId", userId);
            log.debug("Auth token resolved: userId={}", userId);
        }

        return true;
    }
}