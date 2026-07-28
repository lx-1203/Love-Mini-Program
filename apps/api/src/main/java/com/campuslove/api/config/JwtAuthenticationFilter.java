package com.campuslove.api.config;

import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.auth.TokenRevokedException;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * JWT 认证过滤器。
 * 从 HTTP 请求的 Authorization Header 中提取 Bearer token，
 * 使用 JwtTokenProvider 验证 token 并提取 userId，
 * 验证成功后设置 SecurityContextHolder。
 * 放行 /api/v1/auth/**、/ws/**、/api/v1/content-filter/check 路径。
 *
 * 修复：根据用户角色注入 ROLE_USER 或 ROLE_ADMIN，
 * 配合 SecurityConfig 中的 .requestMatchers("/api/v1/admin/**").hasRole("ADMIN") 实现权限校验。
 *
 * <p>Task 0.5.3 安全加固：集成 {@link TokenBlacklistService}，对 token 的 jti 进行黑名单校验。
 * 当检测到 jti 已被撤销（用户已登出）时，清除 SecurityContext，
 * 由后续 {@code AuthenticationEntryPoint} 返回 HTTP 401 + 标准 JSON 错误体。</p>
 *
 * <p>Task 2.4.1：所有路径统一升级为 /api/v1/**。</p>
 */
@Component
@Profile("real & !dev")
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    /** 不需要认证的路径模式（Task 2.4.1：统一 /api/v1/** 前缀） */
    private static final List<String> PERMIT_PATHS = List.of(
            "/api/v1/auth/**",
            "/ws/**",
            "/api/v1/content-filter/check"
    );

    /**
     * Task 0.3.2：媒体鉴权代理端点路径模式。
     *
     * <p>对于 {@code /api/v1/media/**} 路径，除标准 Authorization 头外，
     * 还支持 {@code ?token=xxx} 查询参数（用于 {@code <image src>} 直接请求，
     * 因 image 标签无法携带 HTTP 头）。</p>
     */
    private static final String MEDIA_PROXY_PATH_PATTERN = "/api/v1/media/**";

    /** 查询参数 token 的参数名 */
    private static final String TOKEN_QUERY_PARAM = "token";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    /**
     * Task 0.5.3：JWT 黑名单服务，用于校验 jti 是否已被主动撤销（用户登出）。
     * 通过构造器注入，real profile 下由 {@link com.campuslove.api.auth.RedisTokenBlacklistService} 提供。
     */
    private final TokenBlacklistService tokenBlacklistService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                   UserRepository userRepository,
                                   TokenBlacklistService tokenBlacklistService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.tokenBlacklistService = tokenBlacklistService;
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
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (pathMatcher.match(MEDIA_PROXY_PATH_PATTERN, requestPath)) {
            // Task 0.3.2：媒体鉴权代理端点支持 ?token=xxx 查询参数
            // 仅对 /api/v1/media/** 路径开放，避免其他端点出现 token 在 URL 中泄露到日志/Referer 的风险。
            // token 直接复用当前用户 JWT，与 Authorization 头使用同一签名密钥与撤销黑名单。
            String queryToken = request.getParameter(TOKEN_QUERY_PARAM);
            if (queryToken != null && !queryToken.isBlank()) {
                token = queryToken.trim();
            }
        }

        if (token == null) {
            // 无 token，继续过滤器链（由 SecurityConfig 决定是否拒绝）
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Task 0.5.3：先从 token 中提取 jti，检查是否在 Redis 黑名单中（用户已登出）
            // 仅当 jti 存在且黑名单命中时才拒绝认证；旧 token 无 jti 时跳过黑名单校验，
            // 由后续签名/过期校验兜底。
            String jti = jwtTokenProvider.getJtiFromToken(token);
            if (jti != null && !jti.isBlank() && tokenBlacklistService.isRevoked(jti)) {
                log.warn("JWT jti={} 已被撤销（用户已登出），拒绝认证", jti);
                // 清除 SecurityContext，由 AuthenticationEntryPoint 返回 401 + JSON
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 兼容旧黑名单实现：检查完整 token 是否在 JwtTokenProvider 本地/Redis 黑名单中
            // 此处保留是为了过渡期间兼容旧 revokeToken 调用，未来可统一到 jti 黑名单
            if (jwtTokenProvider.isTokenRevoked(token)) {
                log.warn("JWT token 已被撤销（用户已登出，旧黑名单），拒绝认证");
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

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
        } catch (TokenRevokedException e) {
            // 兜底：若黑名单服务抛出 TokenRevokedException，也清除上下文
            log.warn("JWT 已被撤销: {}", e.getMessage());
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
