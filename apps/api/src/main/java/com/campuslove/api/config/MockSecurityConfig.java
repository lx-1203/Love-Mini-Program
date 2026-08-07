package com.campuslove.api.config;

import com.campuslove.api.auth.JwtAccessDeniedHandler;
import com.campuslove.api.auth.JwtAuthenticationEntryPoint;
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
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
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
 *   <li>/api/v1/auth/**、/ws/**、/api/v1/content-filter/check：permitAll（登录入口、WebSocket、内容检查）</li>
 *   <li>/api/v1/admin/**：hasRole("ADMIN")</li>
 *   <li>/api/v1/**：authenticated()</li>
 *   <li>其他请求：permitAll（静态资源等）</li>
 * </ul>
 * </p>
 *
 * <p>Mock 模式不进行真实 JWT 校验（JwtAuthenticationFilter 仅在 real profile 激活），
 * 而是由内置 mock filter 根据请求路径自动注入对应角色：
 * <ul>
 *   <li>/api/v1/admin/** 路径 → 注入 ROLE_ADMIN（便于本地联调管理端）</li>
 *   <li>其他 /api/v1/** 路径 → 注入 ROLE_USER</li>
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
    private static final String ADMIN_PATH_PATTERN = "/api/v1/admin/**";
    /** 不需要认证的路径模式（与 SecurityConfig 保持一致） */
    private static final List<String> PERMIT_PATHS = List.of(
            "/api/v1/auth/**",
            "/ws/**",
            "/api/v1/content-filter/check",
            "/api/v1/error-reports",
            "/actuator/health",
            "/actuator/health/**"
    );

    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    /**
     * Task 11.1：JWT 认证失败入口点（@Component，无 profile 限制，mock 也可复用）。
     * 与 SecurityConfig 共享同一实现，保证 401 响应格式一致。
     */
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    /**
     * Task 11.1：JWT 权限不足处理器，与 SecurityConfig 共享同一实现，保证 403 响应格式一致。
     */
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

    /**
     * Task 11.1：构造函数注入 JWT 异常处理器。
     *
     * @param jwtAuthenticationEntryPoint JWT 认证失败入口点
     * @param jwtAccessDeniedHandler      JWT 权限不足处理器
     */
    public MockSecurityConfig(JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
                              JwtAccessDeniedHandler jwtAccessDeniedHandler) {
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
        this.jwtAccessDeniedHandler = jwtAccessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain mockSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Task 11.1：与 SecurityConfig 完全对齐——注册自定义异常处理器，
            // 统一返回 401/403 + 标准 JSON 错误体（含 traceId），不暴露堆栈
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                .accessDeniedHandler(jwtAccessDeniedHandler)
            )
            // Task 11.1：与 SecurityConfig 完全对齐——添加安全响应头
            .headers(headers -> headers
                .contentTypeOptions(contentType -> {})
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .xssProtection(xss -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
            )
            .authorizeHttpRequests(auth -> auth
                // 登录端点不需要认证（与 real profile 一致）
                // Task 2.4.1：所有路径统一升级为 /api/v1/**
                .requestMatchers("/api/v1/auth/**").permitAll()
                // WebSocket 握手由单独机制处理
                .requestMatchers("/ws/**").permitAll()
                // 内容审查公开端点
                .requestMatchers("/api/v1/content-filter/check").permitAll()
                // 公开端点：应用启动期静态配置（登录页 Hero 等，未登录冷启动需要）
                .requestMatchers("/api/v1/app-config/**").permitAll()
                // 公开端点：IP 归属地查询（仅 IP→城市映射，免登录浏览同城需要）
                .requestMatchers("/api/v1/location/ip-city").permitAll()
                // D3 修复：客户端错误上报端点 permitAll 放行（与 real profile 对齐），
                // 未登录阶段的上报能力需要保持，避免 401 级联噪音
                .requestMatchers("/api/v1/error-reports").permitAll()
                // Task 11.1：Swagger UI / OpenAPI 文档端点仅 ADMIN 可访问（与 real profile 一致）
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                 "/v3/api-docs/**", "/v3/api-docs.yaml").hasRole("ADMIN")
                // Task 11.1：Actuator 端点鉴权（与 real profile 一致），
                // /actuator/health 公开供负载均衡探测；其他端点仅 ADMIN
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                // Task 0.3.1：/uploads/** 完全拒绝直接访问，强制走鉴权代理端点
                // /api/v1/media/{userId}/{path}（与 real profile 一致）
                .requestMatchers("/uploads/**").denyAll()
                // 管理端点需要 ADMIN 角色（与 real profile 一致）
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                // Task 0.3.2：媒体鉴权代理端点需认证
                .requestMatchers("/api/v1/media/**").authenticated()
                // 媒体上传端点 /api/v1/media/upload 由 /api/v1/** 规则覆盖（需认证），
                // 防止匿名用户滥用存储空间
                // 其他 /api/v1/** 路径需要认证
                .requestMatchers("/api/v1/**").authenticated()
                // 其他请求放行（静态资源等）
                .anyRequest().permitAll()
            )
            .addFilterBefore(new MockAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Mock 认证过滤器：根据请求路径自动注入对应角色。
     *
     * <p>对于 /api/v1/admin/** 路径，注入 ROLE_ADMIN 以便 mock 模式下管理端联调；
     * 对于其他需要认证的 /api/v1/** 路径，注入 ROLE_USER；
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