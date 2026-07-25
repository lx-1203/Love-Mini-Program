package com.campuslove.api.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Spring Security 配置类（real 模式）。
 * 在 real profile 下激活，启用 JWT 认证保护。
 * 放行 /api/auth/**、/ws/**、/content-filter/check 路径，
 * 其他 /api/** 路径需要认证。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("real")
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * CORS 允许的源列表，从配置 app.security.cors.allowed-origins 读取。
     * 修复：原代码硬编码 localhost 端口，无法适应生产环境具体域名。
     * 配置缺失时回退到本地开发端口，保证开发体验。
     *
     * <p>修复：显式支持环境变量 CORS_ALLOWED_ORIGINS 直接覆盖，
     * 优先级：app.security.cors.allowed-origins > CORS_ALLOWED_ORIGINS > 本地开发默认值。
     * 生产部署时只需设置 CORS_ALLOWED_ORIGINS=https://example.com 即可。</p>
     */
    @Value("${app.security.cors.allowed-origins:${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:5174,http://localhost:5177,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5177}}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 配置 CORS：从配置读取 allowedOrigins，限制具体域名
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // 禁用 CSRF：本应用为无状态 JWT REST API，不使用 cookie 会话，
            // 因此 CSRF 防护不适用（CSRF 主要针对 cookie-based 会话）。
            // 前端通过 Authorization: Bearer <token> 头部传递 JWT，
            // 浏览器不会自动附加到跨站请求，从而天然免疫 CSRF。
            // 若未来引入 cookie 会话或表单提交，需重新启用 CSRF 防护。
            .csrf(AbstractHttpConfigurer::disable)
            // 禁用 formLogin
            .formLogin(AbstractHttpConfigurer::disable)
            // 禁用 httpBasic
            .httpBasic(AbstractHttpConfigurer::disable)
            // 无状态会话管理
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 添加安全响应头：X-Content-Type-Options / X-Frame-Options / HSTS / XSS-Protection / Referrer-Policy
            .headers(headers -> headers
                // X-Content-Type-Options: nosniff —— 防止 MIME 类型嗅探
                .contentTypeOptions(contentType -> {})
                // X-Frame-Options: DENY —— 防止点击劫持（页面被嵌入 iframe）
                .frameOptions(frame -> frame.deny())
                // Referrer-Policy: 安全的 referrer 策略，避免泄露完整 URL
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                // XSS-Protection: 1; mode=block —— 旧版浏览器 XSS 过滤（已废弃但保留兼容）
                .xssProtection(xss -> {})
                // Strict-Transport-Security: 强制 HTTPS，包含子域名，1 年
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
            )
            // 配置请求授权
            .authorizeHttpRequests(auth -> auth
                // 登录端点不需要认证
                .requestMatchers("/api/auth/**").permitAll()
                // WebSocket 握手由单独机制处理
                .requestMatchers("/ws/**").permitAll()
                // 公开端点
                .requestMatchers("/content-filter/check").permitAll()
                // 修复：/uploads/** 不再无条件放行，需要认证才能访问上传的媒体资源。
                // 原代码 permitAll 导致任意匿名用户可枚举/访问上传资源，
                // 存在隐私泄露与资源滥用风险。前端访问 /uploads/** 时需携带 Authorization 头。
                .requestMatchers("/uploads/**").authenticated()
                // 管理端点需要 ADMIN 角色，防止普通用户越权访问
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                // 媒体上传端点 /api/media/upload 由 /api/** 规则覆盖（需认证），
                // 即登录用户才能上传文件，防止匿名用户滥用存储空间
                // 其他所有 /api/** 需要认证
                .requestMatchers("/api/**").authenticated()
                // 其他请求放行
                .anyRequest().permitAll()
            )
            // 在 UsernamePasswordAuthenticationFilter 之前添加 JWT 过滤器
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS 配置，从 app.security.cors.allowed-origins 读取允许的源列表。
     * 修复：原代码硬编码 localhost 端口，无法适应生产部署的具体域名；
     * 现通过配置注入，生产环境必须配置具体域名（如 https://example.com）。
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 从配置读取允许的源（逗号分隔），生产环境应配置具体域名
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
