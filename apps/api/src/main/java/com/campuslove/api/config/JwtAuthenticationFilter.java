package com.campuslove.api.config;

import com.campuslove.api.common.ErrorMessages;
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
 * 放行 /ws/**、/api/v1/content-filter/check 路径。
 *
 * <p>R4-00261：/api/v1/auth/** 不再整体跳过——匿名访问仍由 SecurityConfig
 * permitAll 放行，但携带有效 token 的请求会在此注入认证上下文，
 * 使 auth 命名空间下需要 @PreAuthorize 的子端点（如
 * /api/v1/auth/third-party/bindings）能正确鉴权。</p>
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
@Profile("real")
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    /** 不需要认证的路径模式（Task 2.4.1：统一 /api/v1/** 前缀）。
     *  <p>R4-00261：/api/v1/auth/** 已从本列表移除——匿名访问由 SecurityConfig permitAll
     *  放行，携带 token 的请求在本过滤器注入认证上下文，使 auth 命名空间下的
     *  @PreAuthorize 子端点（如 /api/v1/auth/third-party/bindings）可正常鉴权。</p> */
    private static final List<String> PERMIT_PATHS = List.of(
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

    /**
     * 用户角色/状态快照缓存（R4-00272）。
     *
     * <p>原实现每个请求都 userRepository.findById 查库判定角色/禁用状态，
     * 高并发下每请求一次 DB 往返放大数据库压力。现改为短 TTL（60 秒）本地缓存：
     * 禁用/删除用户的最长生效延迟约 1 分钟，换取每请求省去一次 DB 查询。
     * 与将角色写入 JWT claims 的方案相比，缓存不改变 JWT 结构、无需重新签发，
     * 且管理端禁用操作在 TTL 内即可生效。</p>
     */
    private final com.github.benmanes.caffeine.cache.Cache<Long, UserAuthSnapshot> userAuthCache =
            com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                    .maximumSize(100_000)
                    .expireAfterWrite(java.time.Duration.ofSeconds(60))
                    .build();

    /**
     * 用户认证快照（缓存值）。
     *
     * @param exists     用户记录是否存在
     * @param disabled   用户是否被禁用
     * @param admin      是否管理员
     * @param superAdmin 是否超级管理员
     */
    record UserAuthSnapshot(boolean exists, boolean disabled, boolean admin, boolean superAdmin) {
    }

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    /**
     * Task 0.5.3：JWT 黑名单服务，用于校验 jti 是否已被主动撤销（用户登出）。
     * 通过构造器注入，real profile 下由 {@link com.campuslove.api.auth.RedisTokenBlacklistService} 提供。
     */
    private final TokenBlacklistService tokenBlacklistService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    /**
     * R4-00273：媒体查询参数 token 严格模式（默认 false 兼容旧客户端）。
     * 开启后 /api/v1/media/** 的 ?token= 仅接受 scope=media 的短期媒体令牌，
     * 拒绝完整用户 JWT 进入 URL（防访问日志/浏览器历史泄露）。
     */
    @org.springframework.beans.factory.annotation.Value("${app.security.media-query-token-strict:false}")
    private boolean strictMediaQueryToken;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                   UserRepository userRepository,
                                   TokenBlacklistService tokenBlacklistService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    /**
     * 从数据库加载用户认证快照（缓存 miss 时调用）。
     *
     * @param userId 用户 ID
     * @return 认证快照（exists=false 表示记录不存在）
     */
    private UserAuthSnapshot loadAuthSnapshot(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return new UserAuthSnapshot(false, false, false, false);
        }
        return new UserAuthSnapshot(
                true,
                user.isDisabled(),
                user.isAdmin(),
                user.isSuperAdmin());
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
        // 标记 token 来源：query 参数（仅 /api/v1/media/** 开放，R4-00273 scope 校验用）
        boolean tokenFromQuery = false;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (pathMatcher.match(MEDIA_PROXY_PATH_PATTERN, requestPath)) {
            // Task 0.3.2：媒体鉴权代理端点支持 ?token=xxx 查询参数
            // 仅对 /api/v1/media/** 路径开放，避免其他端点出现 token 在 URL 中泄露到日志/Referer 的风险。
            // R4-00273：优先接受短期媒体访问令牌（JwtTokenProvider.generateMediaToken，
            // TTL 5 分钟、scope=media）——即使进入访问日志/浏览器历史，泄露窗口与冒用
            // 范围也远小于完整用户 JWT。完整 JWT 查询参数方式仍兼容（后端提供
            // GET /api/v1/media/token 签发短期令牌，前端迁移后可将
            // app.security.media-query-token-strict 置为 true 强制仅接受媒体令牌）。
            String queryToken = request.getParameter(TOKEN_QUERY_PARAM);
            if (queryToken != null && !queryToken.isBlank()) {
                token = queryToken.trim();
                tokenFromQuery = true;
            }
        }

        if (token == null) {
            // 无 token，继续过滤器链（由 SecurityConfig 决定是否拒绝）
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Task 0.5.3：先从 token 中提取 jti，检查是否在 jti 黑名单中（用户已登出）。
            // R4-00274：统一为 jti 单黑名单——RedisTokenBlacklistService.isRevoked 已合并
            // 本地内存降级（Redis 故障期间撤销的 jti 在恢复后仍被本地记录拦截），
            // 不再双轨检查完整 token 黑名单。
            String jti = jwtTokenProvider.getJtiFromToken(token);
            if (jti != null && !jti.isBlank() && tokenBlacklistService.isRevoked(jti)) {
                log.warn("JWT jti={} 已被撤销（用户已登出），拒绝认证", jti);
                // 清除 SecurityContext，由 AuthenticationEntryPoint 返回 401 + JSON
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 使用 JwtTokenProvider 验证 token 并提取 userId
            String userIdStr = jwtTokenProvider.getUserIdFromToken(token);
            if (userIdStr == null) {
                throw new BadCredentialsException(ErrorMessages.JWT_INVALID_OR_EXPIRED);
            }

            Long userId;
            try {
                userId = Long.parseLong(userIdStr);
            } catch (NumberFormatException e) {
                throw new BadCredentialsException(ErrorMessages.JWT_USER_ID_FORMAT_INVALID_PREFIX + userIdStr);
            }

            // R4-00273：?token= 查询参数路径仅接受媒体访问令牌（scope=media）。
            // 当 app.security.media-query-token-strict=true 时，完整用户 JWT 走查询参数
            // 会被拒绝，杜绝 24h 会话 JWT 进入 URL（访问日志/浏览器历史泄露面）。
            // 默认 false 保持对旧客户端的兼容（前端迁移至 /api/v1/media/token 后可开启）。
            if (tokenFromQuery && strictMediaQueryToken) {
                if (!JwtTokenProvider.MEDIA_SCOPE.equals(jwtTokenProvider.getTokenScope(token))) {
                    log.warn("媒体查询参数 token 缺少 media scope，拒绝认证: path={}, userId={}",
                            requestPath, userIdStr);
                    throw new BadCredentialsException("媒体访问令牌无效");
                }
            }

            // 修复：查询用户角色，根据角色注入对应权限
            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

            // R4-00272：角色/禁用状态走 60s 短 TTL 本地缓存，避免每请求一次 DB 往返。
            // 与原直查 DB 相比，被删除/禁用用户最长延迟约 60s 生效（可接受的安全窗口）。
            UserAuthSnapshot snapshot = userAuthCache.get(userId, this::loadAuthSnapshot);
            if (!snapshot.exists()) {
                // 修复（R2）：用户已被删除时，旧 token 不得继续访问业务接口
                throw new BadCredentialsException(ErrorMessages.USER_NOT_FOUND_OR_DELETED_PREFIX + userId);
            }
            if (snapshot.disabled()) {
                // 修复（R2 review MED）：disabled 用户（管理后台禁用）同样拒绝，
                // 旧实现只处理 user==null，被禁用用户的 token 仍可访问接口
                throw new BadCredentialsException(ErrorMessages.USER_DISABLED_PREFIX + userId);
            }
            if (snapshot.admin()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                log.debug("管理员用户登录，用户ID: {}", userId);
            }
            // infra R2-00025：超级管理员额外注入 ROLE_SUPER_ADMIN，
            // 供敏感配置端点 @PreAuthorize("hasRole('SUPER_ADMIN')") 校验
            if (snapshot.superAdmin()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"));
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
