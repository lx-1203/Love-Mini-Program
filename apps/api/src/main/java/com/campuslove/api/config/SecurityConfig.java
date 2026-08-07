package com.campuslove.api.config;

import com.campuslove.api.auth.JwtAccessDeniedHandler;
import com.campuslove.api.auth.JwtAuthenticationEntryPoint;
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
 *
 * <p>Task 0.5.4：注册自定义 {@link JwtAuthenticationEntryPoint} 与 {@link JwtAccessDeniedHandler}，
 * 统一返回 HTTP 401/403 + 标准 JSON 错误体（含 traceId），便于前端按错误码分支处理
 * 与客户端报错时关联服务端日志。</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("real")
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    /**
     * Task 0.5.4：JWT 认证失败入口点，返回 401 + JSON。
     */
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    /**
     * Task 0.5.4：JWT 权限不足处理器，返回 403 + JSON。
     */
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

    /**
     * CORS 允许的源列表，从配置 app.cors.allowed-origins 读取。
     *
     * <p>Task 0.6.2：配置项 key 从 {@code app.security.cors.allowed-origins}
     * 收敛为 {@code app.cors.allowed-origins}，与 {@link WebConfig#addCorsMappings}
     * 共享同一配置源，避免 real / mock profile 间不一致。
     *
     * <p>显式支持环境变量 CORS_ALLOWED_ORIGINS 直接覆盖，
     * 优先级：app.cors.allowed-origins > CORS_ALLOWED_ORIGINS > 空。
     * 默认值清空，避免硬编码 localhost：生产环境必须显式配置 CORS_ALLOWED_ORIGINS，
     * mock profile 在 application-mock.yml 中提供 localhost 默认值供本地开发使用。</p>
     */
    @Value("${app.cors.allowed-origins:${CORS_ALLOWED_ORIGINS:}}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
                          JwtAccessDeniedHandler jwtAccessDeniedHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
        this.jwtAccessDeniedHandler = jwtAccessDeniedHandler;
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
            // Task 0.5.4：注册自定义异常处理器，统一返回 JSON 错误体
            // - authenticationEntryPoint：未认证访问受保护资源时触发（401）
            // - accessDeniedHandler：已认证但权限不足时触发（403）
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                .accessDeniedHandler(jwtAccessDeniedHandler)
            )
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
                // Task 2.4.1：所有路径统一升级为 /api/v1/**
                .requestMatchers("/api/v1/auth/**").permitAll()
                // WebSocket 握手由单独机制处理
                .requestMatchers("/ws/**").permitAll()
                // 公开端点：内容敏感词预检查（前端实时提示，不暴露敏感词字典）
                .requestMatchers("/api/v1/content-filter/check").permitAll()
                // 公开端点：应用启动期静态配置（登录页 Hero 等），
                // 未登录用户也需要在冷启动时拉取，不可要求认证（FIN-00061 收紧后曾遗漏）。
                .requestMatchers("/api/v1/app-config/**").permitAll()
                // 公开端点：IP 归属地查询（仅 IP→城市映射，不含用户数据），
                // 支持免登录浏览同城内容时定位城市。
                .requestMatchers("/api/v1/location/ip-city").permitAll()
                // D3 修复：客户端错误上报端点 permitAll 放行。
                // 未登录阶段（冷启动 /app-config、/auth/me 失败）也需要上报能力；
                // 此前未放行导致每次上报都 401，形成「上报失败→再捕获→再上报」级联噪音。
                .requestMatchers("/api/v1/error-reports").permitAll()
                // P0-22：法律文本端点 permitAll 放行。
                // 登录前（注册页/登录页勾选协议）即需要拉取用户协议/隐私政策，
                // 客户端该请求不携带鉴权头；内容为内嵌静态常量，无用户数据泄露风险。
                .requestMatchers("/api/v1/config/legal").permitAll()
                // Task 8.4.1：springdoc-openapi Swagger UI 与 OpenAPI 文档端点
                // 仅 ADMIN 可访问，避免生产环境暴露接口结构。
                // 开发环境可通过 SWAGGER_UI_ENABLED=true 环境变量在 application-dev.yml 中放开
                // （或在 mock profile 下使用 MockSecurityConfig 的 permitAll 规则）。
                // 路径说明：
                //   /swagger-ui/**         —— Swagger UI 静态资源与页面
                //   /swagger-ui.html       —— Swagger UI 入口重定向
                //   /v3/api-docs/**        —— OpenAPI 3 JSON/YAML 文档
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                 "/v3/api-docs/**", "/v3/api-docs.yaml").hasRole("ADMIN")
                // Task 2.6.3：Actuator 端点鉴权 —— 仅 ADMIN 可访问完整端点；
                // /actuator/health 公开（健康检查供负载均衡探测）
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                // Task 0.3.1：/uploads/** 完全拒绝直接访问，强制走鉴权代理端点
                // /api/v1/media/{userId}/{path}。原代码 permitAll 导致任意匿名用户可枚举/
                // 访问上传资源；改为 denyAll 后，即使知道 URL 也无法直接访问，
                // 所有上传文件均需经过 MediaAccessController 的 JWT 鉴权与文件归属校验。
                .requestMatchers("/uploads/**").denyAll()
                // 管理端点需要 ADMIN 角色，防止普通用户越权访问
                // Task 2.4.1：路径统一升级为 /api/v1/admin/**
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                // Task 0.3.2：媒体鉴权代理端点（/api/v1/media/**）需要认证，
                // 支持 Authorization 头与 ?token= 查询参数两种方式（详见 MediaAccessController）。
                // MediaAccessController 内部按 JWT 中的 userId 校验文件归属；
                // 管理员（ROLE_ADMIN）可访问所有用户文件。
                .requestMatchers("/api/v1/media/**").authenticated()
                // 媒体上传端点 /api/v1/media/upload 由 /api/v1/** 规则覆盖（需认证），
                // 即登录用户才能上传文件，防止匿名用户滥用存储空间
                // 其他所有 /api/v1/** 需要认证
                .requestMatchers("/api/v1/**").authenticated()
                // FIN-00061 修复：原实现 .anyRequest().permitAll() 将未匹配路径（含未来新增端点）
                // 全部匿名放行，存在「新增接口默认开放」的风险。
                // 现改为默认拒绝未认证请求（authenticated），白名单在下方显式声明：
                //   - /api/v1/auth/**（登录/注册）、/ws/**（WebSocket 握手）、
                //     /api/v1/content-filter/check（内容预检）、/actuator/health（健康检查）
                //   - /error 由 Servlet 容器错误分发，放行避免 401 循环
                // 若未来需要新增公开端点，必须在此显式加入白名单。
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            )
            // 在 UsernamePasswordAuthenticationFilter 之前添加 JWT 过滤器
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS 配置，从 app.cors.allowed-origins 读取允许的源列表。
     * 修复：原代码硬编码 localhost 端口，无法适应生产部署的具体域名；
     * 现通过配置注入，生产环境必须配置具体域名（如 https://example.com）。
     *
     * <p>Task 0.6.2：与 {@link WebConfig#addCorsMappings} 共享同一配置项
     * {@code app.cors.allowed-origins}，复用 {@link WebConfig#parseOrigins}
     * 解析逻辑，保证两处 CORS 规则一致。</p>
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 复用 WebConfig.parseOrigins 解析逻辑，保证与 WebMvc CORS 一致
        List<String> origins = WebConfig.parseOrigins(allowedOrigins);
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of(
                "Authorization", "Content-Type", "X-Requested-With",
                // infra 修复(联调):@Idempotent 强制接口(如 admin 登录)要求
                // Idempotency-Key 请求头,未加入 CORS 允许列表导致浏览器预检被拦
                // (net::ERR_FAILED),curl 不受 CORS 限制故表现正常。
                "Idempotency-Key"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
