package com.campuslove.api.config;

import java.util.List;
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

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 配置 CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // 禁用 CSRF（前后端分离 REST API）
            .csrf(AbstractHttpConfigurer::disable)
            // 禁用 formLogin
            .formLogin(AbstractHttpConfigurer::disable)
            // 禁用 httpBasic
            .httpBasic(AbstractHttpConfigurer::disable)
            // 无状态会话管理
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 添加安全响应头
            .headers(headers -> headers
                .contentTypeOptions(contentType -> {})
                .frameOptions(frame -> frame.deny())
                .xssProtection(xss -> {})
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
                // 媒体静态资源（用户上传的图片/视频/背景图）放行，由 WebConfig 提供服务
                // 注：未登录用户也能查看其他用户的公开照片，与现有头像 URL 访问策略一致
                .requestMatchers("/uploads/**").permitAll()
                // 修复：管理端点需要 ADMIN 角色，防止普通用户越权访问
                // 原代码仅校验"已认证"，任何登录用户都可调用 /api/admin/** 造成越权
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
     * CORS 配置，限制为具体端口以提高安全性。
     * 允许前端开发服务器的跨域请求。
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 限制为具体端口，避免任意端口跨域攻击
        configuration.setAllowedOriginPatterns(
                List.of("http://localhost:5173", "http://localhost:5174", "http://localhost:5177",
                        "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5177"));
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
