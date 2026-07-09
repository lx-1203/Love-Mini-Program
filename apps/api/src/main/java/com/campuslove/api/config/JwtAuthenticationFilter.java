package com.campuslove.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Profile;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;

/**
 * JWT 认证过滤器。
 * 从 HTTP 请求的 Authorization Header 中提取 Bearer token，
 * 使用 JwtTokenProvider 验证 token 并提取 userId，
 * 验证成功后设置 SecurityContextHolder。
 * 放行 /api/auth/**、/ws/**、/content-filter/check 路径。
 *
 * 修复：根据用户角色注入 ROLE_USER 或 ROLE_ADMIN，
 * 配合 SecurityConfig 中的 .requestMatchers("/api/admin/**").hasRole("ADMIN") 实现权限校验。
 */
@Component
@Profile("real")
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    /** 不需要认证的路径模式 */
    private static final List<String> PERMIT_PATHS = List.of(
            "/api/auth/**",
            "/ws/**",
            "/content-filter/check"
    );

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String requestPath = request.getRequestURI();

        // 放行不需要认证的路径
        if (isPermitPath(requestPath)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 从 Authorization Header 提取 Bearer token
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // 无 token，继续过滤器链（由 SecurityConfig 决定是否拒绝）
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            // 使用 JwtTokenProvider 验证 token 并提取 userId
            String userIdStr = jwtTokenProvider.getUserIdFromToken(token);
            if (userIdStr == null) {
                throw new BadCredentialsException("无效或已过期的 JWT token");
            }

            Long userId;
            try {
                userId = Long.parseLong(userIdStr);
            } catch (NumberFormatException e) {
                throw new BadCredentialsException("JWT token 中的用户ID格式无效: " + userIdStr);
            }

            // 修复：查询用户角色，根据角色注入对应权限
            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

            // 查询用户判断是否为管理员
            // 注意：这里每次请求都查询数据库，生产环境可考虑缓存优化
            User user = userRepository.findById(userId).orElse(null);
            if (user != null && user.isAdmin()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                log.debug("管理员用户登录，用户ID: {}", userId);
            }

            // 验证成功后设置 SecurityContextHolder
            PreAuthenticatedAuthenticationToken authentication =
                    new PreAuthenticatedAuthenticationToken(
                            userId,
                            token,
                            authorities
                    );
            authentication.setAuthenticated(true);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            log.debug("JWT 认证成功，用户ID: {}", userId);

        } catch (BadCredentialsException e) {
            log.warn("JWT 认证失败: {}", e.getMessage());
            // 清除可能残留的认证信息
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 判断请求路径是否在放行列表中。
     *
     * @param requestPath 请求路径
     * @return 是否放行
     */
    private boolean isPermitPath(String requestPath) {
        for (String pattern : PERMIT_PATHS) {
            if (pathMatcher.match(pattern, requestPath)) {
                return true;
            }
        }
        return false;
    }
}
