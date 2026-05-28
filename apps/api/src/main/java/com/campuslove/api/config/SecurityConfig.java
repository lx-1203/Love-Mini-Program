package com.campuslove.api.config;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
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
            // 配置请求授权
            .authorizeHttpRequests(auth -> auth
                // 登录端点不需要认证
                .requestMatchers("/api/auth/**").permitAll()
                // WebSocket 握手由单独机制处理
                .requestMatchers("/ws/**").permitAll()
                // 公开端点
                .requestMatchers("/content-filter/check").permitAll()
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
     * CORS 配置，与 WebConfig 保持一致但更完整。
     * 允许前端开发服务器的跨域请求。
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(
                List.of("http://localhost:*", "http://127.0.0.1:*"));
        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
