package com.campuslove.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Mock 模式下的 Spring Security 配置。
 * 在 mock profile 下激活，全部请求放行，开发模式不需要认证。
 */
@Configuration
@EnableWebSecurity
@Profile("mock")
public class MockSecurityConfig {

    @Bean
    public SecurityFilterChain mockSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            // 禁用 CSRF
            .csrf(AbstractHttpConfigurer::disable)
            // 禁用 formLogin
            .formLogin(AbstractHttpConfigurer::disable)
            // 禁用 httpBasic
            .httpBasic(AbstractHttpConfigurer::disable)
            // 无状态会话管理
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 全部放行
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
