package com.campuslove.api.config;

import com.campuslove.api.auth.JwtAccessDeniedHandler;
import com.campuslove.api.auth.JwtAuthenticationEntryPoint;
import com.campuslove.api.media.MediaTokenPolicy;
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
 * <p>P0-2 媒体令牌降权：上述 demo 注入<b>不适用于</b> {@code scope=media} 的短期媒体令牌——
 * mock filter 会用与 real 档同一口径（{@link JwtTokenProvider#isMediaToken}）认出它，
 * 只注入 {@link MediaTokenPolicy#ROLE_MEDIA}，再由与 real 档共用的
 * {@link MediaTokenPolicy#applyMediaTokenRules} 把它限制在「GET/HEAD 读媒体文件」内。
 * demo 档的免真实认证便利只留给非 JWT 的演示令牌，不给任何降权凭据升格。</p>
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

    /**
     * 媒体代理端点路径前缀（P0-2）：与 real 档 {@link JwtAuthenticationFilter} 的
     * {@code MEDIA_PROXY_PATH_PATTERN} 对齐——只有该前缀允许 {@code ?token=} 查询参数
     * 携带令牌，其余端点不接受 URL 里的凭据。
     */
    private static final String MEDIA_PROXY_PATH_PATTERN = "/api/v1/media/**";

    // R4-00432：mock filter 需为 hasRole('ADMIN') 路径注入 ROLE_ADMIN 的补充模式
    private static final String ADMIN_ONLY_PATH_PATTERN_ACTUATOR = "/actuator/**";
    private static final String ADMIN_ONLY_PATH_PATTERN_SWAGGER = "/swagger-ui/**";
    private static final String ADMIN_ONLY_PATH_PATTERN_API_DOCS = "/v3/api-docs/**";
    /** 不需要认证的路径模式（与 SecurityConfig 保持一致）；包内可见以便漂移守卫用例读取 */
    static final List<String> PERMIT_PATHS = List.of(
            "/api/v1/auth/**",
            "/ws/**",
            "/api/v1/content-filter/check",
            "/api/v1/error-reports",
            // R4-00318：微信支付回调端点（微信服务器调用，无 JWT）
            // 路径与 BillingController 的类级前缀对齐：/api/v1/vip/bills + /payment-callback
            "/api/v1/vip/bills/payment-callback",
            // 2026-10-05：微信退款结果回调端点（同为微信服务器发起，无 JWT）
            "/api/v1/refund/notify",
            // 2026-08-10：应用资产公开访问（装饰性图片，免登录；不注入 mock 用户）
            "/api/v1/media/app-assets/**",
            "/actuator/health",
            "/actuator/health/**"
    );

    /**
     * 位于 permitAll 前缀（/api/v1/auth/**）之下、但仍需登录鉴权的账号安全端点
     * （3-B 修改密码 / 3-C 更换手机号 / 3-D 设备管理 / 3-E 注销账号）。
     *
     * <p>real profile 下这些端点由 JwtAuthenticationFilter 注入认证上下文 + 方法级
     * @PreAuthorize("hasRole('USER')") 双重保障；mock profile 无 JWT 过滤器，
     * 若按 permitAll 处理则匿名请求也可直达 Controller（SecurityUtils.getCurrentUserId()
     * 抛 401）。故 mock filter 对命中本列表的路径同样注入 ROLE_USER，行为与 real 对齐。</p>
     */
    private static final List<String> SECURED_AUTH_PATTERNS = List.of(
            "/api/v1/auth/change-password",
            "/api/v1/auth/change-phone",
            "/api/v1/auth/devices",
            "/api/v1/auth/devices/**",
            "/api/v1/auth/deactivate"
    );

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    /**
     * R4-00279：mock 认证注入的模拟用户 ID（配置 app.mock.principal-user-id，默认 1）。
     * 替代原硬编码 principal=1L，可通过环境变量 MOCK_PRINCIPAL_USER_ID 覆盖，
     * 避免 mock 会话数据与超级管理员（id=1）真实数据混淆。
     */
    @org.springframework.beans.factory.annotation.Value("${app.mock.principal-user-id:1}")
    private long mockPrincipalUserId;

    /**
     * R4-00279：mock profile 环境隔离强校验。
     *
     * <p>mock 模式对 /api/v1/admin/** 自动注入 ROLE_ADMIN+ROLE_USER、免真实认证——
     * 一旦被误带生产（如部署环境显式指定 mock profile），所有管理端点匿名可用、
     * 鉴权整体失效。本校验在 mock profile 启动时检测生产环境标记
     * （DEPLOY_ENV=production / PROMETHEUS_ENVIRONMENT=production，见 .env.example
     * 与 docker-compose.yml），命中即拒绝启动（fail-fast）。</p>
     */
    @jakarta.annotation.PostConstruct
    public void validateMockNotInProduction() {
        String deployEnv = System.getenv("DEPLOY_ENV");
        String prometheusEnv = System.getenv("PROMETHEUS_ENVIRONMENT");
        if ("production".equalsIgnoreCase(deployEnv) || "production".equalsIgnoreCase(prometheusEnv)) {
            throw new IllegalStateException(
                    "mock profile 禁止在生产环境启动：检测到 DEPLOY_ENV=" + deployEnv
                            + " / PROMETHEUS_ENVIRONMENT=" + prometheusEnv
                            + "，mock 模式免真实认证且自动注入 ROLE_ADMIN，生产误用将导致鉴权整体失效。"
                            + "请以 real profile 启动（SPRING_PROFILES_ACTIVE=real）。");
        }
    }

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
     * P0-2 媒体令牌降权：mock（demo）档也要认出 {@code scope=media} 的短期令牌。
     *
     * <p>本档的 demo 便利语义是「按请求路径自动注入角色、不验真实 JWT」，注入的令牌形如
     * {@code mock-token-xxx}，本就不是合法 JWT。但一份<b>真签发的媒体令牌</b>如果被丢进
     * 本档，按路径注入 ROLE_USER/ROLE_ADMIN 就等于把它当完整会话用——与 real 档的越权面同源。
     * 故这里按 scope 认令牌：媒体 scope 一律只注入 {@code ROLE_MEDIA}，
     * 让 {@link MediaTokenPolicy} 的 deny 规则（与 real 档同一份代码）照常生效。
     * 判定口径真源是 {@link JwtTokenProvider#isMediaToken}，demo 令牌解析失败即视为非媒体
     * 令牌，保持既有联调语义不变。</p>
     */
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Task 11.1：构造函数注入 JWT 异常处理器。
     *
     * @param jwtAuthenticationEntryPoint JWT 认证失败入口点
     * @param jwtAccessDeniedHandler      JWT 权限不足处理器
     * @param jwtTokenProvider            P0-2：识别媒体访问令牌（scope=media）
     */
    public MockSecurityConfig(JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
                              JwtAccessDeniedHandler jwtAccessDeniedHandler,
                              JwtTokenProvider jwtTokenProvider) {
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
        this.jwtAccessDeniedHandler = jwtAccessDeniedHandler;
        this.jwtTokenProvider = jwtTokenProvider;
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
                // R4-01818：HSTS max-age 收敛为 WebConfig 共享常量（1 年）
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(WebConfig.HSTS_MAX_AGE_SECONDS)
                )
            )
            // 配置请求授权
            // P0-2：与 SecurityConfig 同步改为块状 lambda，以便在 app-assets permitAll 之后
            // 注入同一份媒体令牌规则（MediaTokenPolicy.applyMediaTokenRules），
            // 保证 mock 档验证的规则链与生产环境是同一份代码。
            .authorizeHttpRequests(auth -> {
                auth
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
                // 微信支付/退款回调端点 permitAll（与 real profile 对齐，2026-10-11 补齐）。
                // 这两个端点由微信服务器发起、不带 JWT；此前 mock 链只在 /api/v1/** 上要求
                // authenticated()，且 PERMIT_PATHS 会阻止 filter 伪造身份，导致回调在 mock 档
                // 也被 401 拦截。真实控制器在 mock 档不注册（BillingController/WxPayRefundNotifyController
                // 均为 @Profile("real")），放行后表现为 404 而非 401。
                .requestMatchers("/api/v1/vip/bills/payment-callback").permitAll()
                .requestMatchers("/api/v1/refund/notify").permitAll()
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
                // 公开端点：应用资产（/api/v1/media/app-assets/**）——后端托管的
                // 装饰性图片，免登录可看图（与 real profile 对齐；须在 media/** 规则之前）
                .requestMatchers("/api/v1/media/app-assets/**").permitAll();
                // P0-2 媒体令牌降权（与 real profile 共用同一份规则实现）：
                // 媒体会话只能 GET/HEAD 读媒体文件，其余路径一律 403。
                MediaTokenPolicy.applyMediaTokenRules(auth);
                auth
                // Task 0.3.2：媒体鉴权代理端点需认证
                .requestMatchers("/api/v1/media/**").authenticated()
                // 媒体上传端点 /api/v1/media/upload 由 /api/v1/** 规则覆盖（需认证），
                // 防止匿名用户滥用存储空间
                // 其他 /api/v1/** 路径需要认证
                .requestMatchers("/api/v1/**").authenticated()
                // 其他请求放行（静态资源等）
                .anyRequest().permitAll();
            })
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

                // 仅对需要认证的路径注入 mock 用户，避免污染 permitAll 路径；
                // 账号安全端点（SECURED_AUTH_PATTERNS）虽在 /api/v1/auth/** permitAll
                // 前缀下，仍需登录（与 real 的 @PreAuthorize 语义对齐）
                if (!isPermitPath(requestPath) || isSecuredAuthPath(requestPath)) {
                    // P0-2 媒体令牌降权：请求携带的凭据若是 scope=media 的短期令牌，
                    // 只注入 ROLE_MEDIA（不得按路径升格为 ROLE_USER/ROLE_ADMIN）。
                    // 授权规则 MediaTokenPolicy.applyMediaTokenRules 与 real 档同源，
                    // 于是媒体令牌在本档同样只能 GET/HEAD 读媒体文件，其余路径 403。
                    Long mediaTokenUserId = mediaScopedTokenUserId(request);
                    if (mediaTokenUserId != null) {
                        PreAuthenticatedAuthenticationToken mediaAuth =
                                new PreAuthenticatedAuthenticationToken(
                                        mediaTokenUserId, "media",
                                        MediaTokenPolicy.mediaAuthorities());
                        mediaAuth.setAuthenticated(true);
                        SecurityContextHolder.getContext().setAuthentication(mediaAuth);
                        filterChain.doFilter(request, response);
                        return;
                    }

                    List<SimpleGrantedAuthority> authorities;
                    // R4-00432：mock 下 /actuator/** 与 /swagger-ui/** 等 hasRole('ADMIN')
                    // 路径同样注入 ROLE_ADMIN——原实现仅 /api/v1/admin/** 注入，
                    // 导致 mock 本地联调 actuator/Swagger 直接 403，与"mock 全放行"预期不符
                    if (pathMatcher.match(ADMIN_PATH_PATTERN, requestPath)
                            || pathMatcher.match(ADMIN_ONLY_PATH_PATTERN_ACTUATOR, requestPath)
                            || pathMatcher.match(ADMIN_ONLY_PATH_PATTERN_SWAGGER, requestPath)
                            || pathMatcher.match(ADMIN_ONLY_PATH_PATTERN_API_DOCS, requestPath)) {
                        // 管理端/运维/文档路径注入 ROLE_ADMIN
                        authorities = List.of(
                                new SimpleGrantedAuthority("ROLE_USER"),
                                new SimpleGrantedAuthority("ROLE_ADMIN"));
                    } else {
                        // 其他认证路径仅注入 ROLE_USER
                        authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
                    }
                    // R4-00279：principal 使用可配置 mock 用户（默认 1，可经
                    // MOCK_PRINCIPAL_USER_ID / app.mock.principal-user-id 覆盖），
                    // 避免 mock 会话数据与 id=1 真实账号混淆
                    PreAuthenticatedAuthenticationToken auth =
                            new PreAuthenticatedAuthenticationToken(mockPrincipalUserId, "mock", authorities);
                    auth.setAuthenticated(true);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
            filterChain.doFilter(request, response);
        }

        /**
         * P0-2：识别请求携带的凭据是否为媒体访问令牌（{@code scope=media}）。
         *
         * <p>凭据来源与 real 档 {@link JwtAuthenticationFilter} 对齐：
         * {@code Authorization: Bearer} 头优先；仅当路径落在媒体代理前缀
         * {@code /api/v1/media/**} 内才接受 {@code ?token=} 查询参数（其他端点不接受
         * URL 携带令牌，避免把令牌面扩大到业务接口）。判定口径用
         * {@link JwtTokenProvider#isMediaToken}（验签 + scope 精确匹配），
         * demo 令牌（非合法 JWT）解析不出 scope ⇒ 返回 null ⇒ 保持既有 mock 注入语义。</p>
         *
         * <p>日志纪律：只记录 userId，不记录令牌内容。</p>
         *
         * @param request 当前请求
         * @return 媒体令牌的属主 userId；请求凭据不是媒体令牌时返回 null
         */
        private Long mediaScopedTokenUserId(HttpServletRequest request) {
            String token = presentedToken(request);
            if (token == null || !jwtTokenProvider.isMediaToken(token)) {
                return null;
            }
            String userId = jwtTokenProvider.getUserIdFromToken(token);
            try {
                return Long.valueOf(userId);
            } catch (NumberFormatException | NullPointerException ex) {
                // scope 已确认是媒体令牌，subject 非法时按 mock 用户降权处理，
                // 关键是绝不升格为 ROLE_USER/ROLE_ADMIN
                return mockPrincipalUserId;
            }
        }

        /**
         * 提取请求携带的令牌原文（头优先，媒体路径兼容 {@code ?token=}）。
         *
         * @param request 当前请求
         * @return 令牌字符串；未携带时返回 null
         */
        private String presentedToken(HttpServletRequest request) {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7).trim();
                return token.isEmpty() ? null : token;
            }
            if (pathMatcher.match(MEDIA_PROXY_PATH_PATTERN, request.getRequestURI())) {
                String queryToken = request.getParameter("token");
                if (queryToken != null && !queryToken.isBlank()) {
                    return queryToken.trim();
                }
            }
            return null;
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

    /**
     * 判断请求路径是否命中账号安全端点（需登录，即使位于 permitAll 前缀下）。
     *
     * @param requestPath 请求路径
     * @return 是否命中
     */
    private boolean isSecuredAuthPath(String requestPath) {
        for (String pattern : SECURED_AUTH_PATTERNS) {
            if (pathMatcher.match(pattern, requestPath)) {
                return true;
            }
        }
        return false;
    }
}