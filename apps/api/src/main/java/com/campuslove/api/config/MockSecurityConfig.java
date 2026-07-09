package com.campuslove.api.config;

import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Mock 模式下的 Spring Security 配置。
 *
 * <p>Phase 3 任务 17 修复：原配置 anyRequest().permitAll() 全放行，且 filter 仅注入
 * ROLE_USER，导致 /api/admin/** 在 mock 模式下任何匿名用户都能访问，与 real profile
 * 的权限语义不一致。</p>
 *
 * <p>现收敛为按角色鉴权，与 {@link SecurityConfig} 保持一致：
 * <ul>
 *   <li>/api/auth/**、/ws/**、/content-filter/check：permitAll（登录入口、WebSocket、内容检查）</li>
 *   <li>/api/admin/**：hasRole("ADMIN")</li>
 *   <li>/api/**：authenticated()</li>
 *   <li>其他请求：permitAll（静态资源等）</li>
 * </ul>
 * </p>
 *
 * <p>Mock 模式不进行真实 JWT 校验（JwtAuthenticationFilter 仅在 real profile 激活），
 * 而是由内置 mock filter 根据请求路径自动注入对应角色：
 * <ul>
 *   <li>/api/admin/** 路径 → 注入 ROLE_ADMIN（便于本地联调管理端）</li>
 *   <li>其他 /api/** 路径 → 注入 ROLE_USER</li>
 * </ul>
 * 这样既保留了 mock 模式的便利性，又验证了 SecurityFilterChain 的鉴权规则配置正确。</p>
 *
 * <p>同时启用 {@link EnableMethodSecurity}，让 real profile 中已有的 @PreAuthorize 注解
 * 在 mock profile 下也能生效（虽然 admin controller 在 mock profile 不激活，但为对称起见保留）。</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("mock")
public class MockSecurityConfig {

    /** 管理端路径前缀，用于 mock filter 自动注入 ROLE_ADMIN */
    private static final String ADMIN_PATH_PATTERN = "/api/admin/**";
    /** 不需要认证的路径模式（与 SecurityConfig 保持一致） */
    private static final List<String> PERMIT_PATHS = List.of(
            "/api/auth/**",
            "/ws/**",
            "/content-filter/check",
            "/uploads/**"
    );

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Bean
    public SecurityFilterChain mockSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 登录端点不需要认证（与 real profile 一致）
                .requestMatchers("/api/auth/**").permitAll()
                // WebSocket 握手由单独机制处理
                .requestMatchers("/ws/**").permitAll()
                // 内容审查公开端点
                .requestMatchers("/content-filter/check").permitAll()
                // 媒体静态资源（用户上传的图片/视频/背景图）放行（与 real profile 一致）
                .requestMatchers("/uploads/**").permitAll()
                // 管理端点需要 ADMIN 角色（与 real profile 一致）
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // 媒体上传端点 /api/media/upload 由 /api/** 规则覆盖（需认证），
                // 防止匿名用户滥用存储空间
                // 其他 /api/** 路径需要认证
                .requestMatchers("/api/**").authenticated()
                // 其他请求放行（静态资源等）
                .anyRequest().permitAll()
            )
            .addFilterBefore(new MockAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Mock 认证过滤器：根据请求路径自动注入对应角色。
     *
     * <p>对于 /api/admin/** 路径，注入 ROLE_ADMIN 以便 mock 模式下管理端联调；
     * 对于其他需要认证的 /api/** 路径，注入 ROLE_USER；
     * 对于 permitAll 路径，不设置认证信息（由 SecurityFilterChain 放行）。</p>
     */
    private class MockAuthenticationFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request,
                HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                String requestPath = request.getRequestURI();

                // 仅对需要认证的路径注入 mock 用户，避免污染 permitAll 路径
                if (!isPermitPath(requestPath)) {
                    List<SimpleGrantedAuthority> authorities;
                    if (pathMatcher.match(ADMIN_PATH_PATTERN, requestPath)) {
                        // 管理端路径注入 ROLE_ADMIN
                        authorities = List.of(
                                new SimpleGrantedAuthority("ROLE_USER"),
                                new SimpleGrantedAuthority("ROLE_ADMIN"));
                    } else {
                        // 其他认证路径仅注入 ROLE_USER
                        authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
                    }
                    PreAuthenticatedAuthenticationToken auth =
                            new PreAuthenticatedAuthenticationToken(1L, "mock", authorities);
                    auth.setAuthenticated(true);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
            filterChain.doFilter(request, response);
        }
    }

    /**
     * 判断请求路径是否在 permitAll 放行列表中。
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