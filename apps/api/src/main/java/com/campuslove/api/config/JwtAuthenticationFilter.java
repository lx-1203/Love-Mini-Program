package com.campuslove.api.config;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.auth.TokenRevokedException;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaTokenPolicy;
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
 * 配合 SecurityConfig 中的 .requestMatchers("/api/v1/admin/**") 规则实现权限校验。
 *
 * <p>三级角色 AUDITOR（只读审核员）：仅注入 ROLE_AUDITOR（不注入 ROLE_ADMIN），
 * 后台读写分离在 SecurityConfig 按 HTTP 方法完成。</p>
 *
 * <p>Task 0.5.3 安全加固：集成 {@link TokenBlacklistService}，对 token 的 jti 进行黑名单校验。
 * 当检测到 jti 已被撤销（用户已登出）时，清除 SecurityContext，
 * 由后续 {@code AuthenticationEntryPoint} 返回 HTTP 401 + 标准 JSON 错误体。</p>
 *
 * <p>Task 2.4.1：所有路径统一升级为 /api/v1/**。</p>
 *
 * <p>P0-2 媒体令牌降权：{@code scope=media} 的短期令牌（
 * {@link JwtTokenProvider#generateMediaToken}）无论来自 {@code Authorization} 头还是
 * {@code ?token=} 查询参数，都只被授予 {@code ROLE_MEDIA}（只读媒体），
 * 永不再换算成 {@code ROLE_USER} / {@code ROLE_ADMIN} / {@code ROLE_SUPER_ADMIN} /
 * {@code ROLE_AUDITOR} 会话；非媒体读取路径上更是直接不建立认证（401）。
 * 判定口径真源见 {@link MediaTokenPolicy}，授权规则见 {@link SecurityConfig}。</p>
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

    /** {@link #MEDIA_PROXY_PATH_PATTERN} 的定长前缀，用于从媒体路径里切出 {userId} 段。 */
    private static final String MEDIA_PROXY_PATH_PREFIX = "/api/v1/media/";

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
     * @param admin      是否可写管理员（ADMIN / SUPER_ADMIN）
     * @param superAdmin 是否超级管理员
     * @param auditor    是否只读审核员（AUDITOR）
     */
    record UserAuthSnapshot(
            boolean exists, boolean disabled, boolean admin, boolean superAdmin, boolean auditor) {
    }

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    /**
     * Task 0.5.3：JWT 黑名单服务，用于校验 jti 是否已被主动撤销（用户登出）。
     * 通过构造器注入，real profile 下由 {@link com.campuslove.api.auth.RedisTokenBlacklistService} 提供。
     */
    private final TokenBlacklistService tokenBlacklistService;
    /**
     * P0-2：能力型媒体 URL 签名校验器。构造器注入（不给可选注入留「签名器为 null
     * 就静默放行/静默拒绝」两种歧义），因此三个测试构造点需同步补参。
     */
    private final com.campuslove.api.media.MediaUrlSigner mediaUrlSigner;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    /**
     * R4-00273：媒体查询参数 token 严格模式。
     *
     * <p>开启后 /api/v1/media/** 的 {@code ?token=} 仅接受 scope=media 的短期媒体令牌，
     * 拒绝完整用户 JWT 进入 URL（防访问日志/浏览器历史/上游代理日志泄露）。</p>
     *
     * <p>默认值由 false 翻为 **true**（P0-2 收口最后一寸）：客户端已改用
     * {@code POST /api/v1/media/sign} 签发的能力型 URL，不再需要把会话 JWT 拼进图片地址。
     * 保留开关是为了给「线上仍有旧版本客户端」留一条回退路——那种情况下应显式
     * 设 {@code APP_MEDIA_QUERY_TOKEN_STRICT=false} 并在收口记录里写明版本与期限，
     * 而不是让默认值长期替旧客户端兜底。</p>
     */
    @org.springframework.beans.factory.annotation.Value("${app.security.media-query-token-strict:true}")
    private boolean strictMediaQueryToken;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                   UserRepository userRepository,
                                   TokenBlacklistService tokenBlacklistService,
                                   com.campuslove.api.media.MediaUrlSigner mediaUrlSigner) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.tokenBlacklistService = tokenBlacklistService;
        this.mediaUrlSigner = mediaUrlSigner;
    }

    /**
     * 认「能力型媒体 URL」：{@code GET /api/v1/media/{userId}/...?exp=<epochSec>&sig=<hex>}。
     *
     * <p>只在同时满足三条时建立认证：签名对该路径未过期且逐字匹配、请求是媒体读取
     * （GET/HEAD + 已归一化路径 + 媒体读路径，判定与媒体令牌同源）、路径里的 userId 是数字。
     * 任一条不过即返回 false，让既有的令牌通道与 401 兜底继续处理——
     * 本方法**不会**因为签名无效而放行，也不会给出比 401 更细的原因。</p>
     *
     * @return 是否已按签名建立认证（true 时调用方应直接继续过滤器链）
     */
    private boolean authenticateSignedMediaUrl(HttpServletRequest request, String requestPath) {
        if (!pathMatcher.match(MEDIA_PROXY_PATH_PATTERN, requestPath)) {
            return false;
        }
        String expiresRaw = request.getParameter(com.campuslove.api.media.MediaUrlSigner.PARAM_EXPIRES);
        String signature = request.getParameter(com.campuslove.api.media.MediaUrlSigner.PARAM_SIGNATURE);
        if (expiresRaw == null || signature == null) {
            return false;
        }
        long expiresAt;
        Long subjectUserId;
        try {
            expiresAt = Long.parseLong(expiresRaw.trim());
        } catch (NumberFormatException notNumeric) {
            return false;
        }
        try {
            subjectUserId = mediaSubjectUserIdFromPath(requestPath);
        } catch (NumberFormatException tempOrOther) {
            subjectUserId = null;
        }
        // 临时会话图片（2026-10-28）：路径为 /api/v1/media/temp/{sessionUid}/...，
        // 不含 userId；签名本身即能力凭据（签发时已校验会话双方），
        // 认证主体用哨兵 0 区分「签名直读」与「媒体令牌读取」。
        if (subjectUserId == null && requestPath.startsWith("/api/v1/media/temp/")) {
            String remainder = requestPath.substring("/api/v1/media/temp/".length());
            int slash = remainder.indexOf('/');
            String sessionUid = slash > 0 ? remainder.substring(0, slash) : "";
            if (sessionUid.matches("[A-Za-z0-9_-]{1,64}") && slash > 0
                    && slash + 1 < remainder.length()) {
                subjectUserId = 0L;
            }
        }
        if (subjectUserId == null
                || !mediaUrlSigner.verify(requestPath, expiresAt, signature)
                || !MediaTokenPolicy.isMediaReadRequest(request)) {
            if (log.isDebugEnabled()) {
                log.debug("媒体签名 URL 校验未通过，按未认证处理: path={}", requestPath);
            }
            return false;
        }
        authenticateMediaOnlyRequest(request, requestPath, subjectUserId, SIGNED_URL_CREDENTIALS);
        return true;
    }

    /** 签名 URL 建立认证时写入 credentials 的占位串（不参与任何授权判定）。 */
    private static final String SIGNED_URL_CREDENTIALS = "signed-media-url";

    /** 媒体路径形态：{@code /api/v1/media/{userId}/...}；不符合返回 null。 */
    private Long mediaSubjectUserIdFromPath(String requestPath) {
        String remainder = requestPath.substring(MEDIA_PROXY_PATH_PREFIX.length());
        int slash = remainder.indexOf('/');
        String userIdSegment = slash >= 0 ? remainder.substring(0, slash) : remainder;
        if (userIdSegment.isEmpty() || userIdSegment.indexOf('*') >= 0) {
            return null;
        }
        return Long.valueOf(userIdSegment);
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
            return new UserAuthSnapshot(false, false, false, false, false);
        }
        return new UserAuthSnapshot(
                true,
                user.isDisabled(),
                // 三级角色 AUDITOR：admin 取「可写管理员」而非 isAdmin()（含 AUDITOR），
                // 否则只读审核员会被授予 ROLE_ADMIN，绕过写操作拦截
                user.isWriteAdmin(),
                user.isSuperAdmin(),
                user.isAuditor());
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

        // P0-2 收口最后一寸：能力型签名 URL（?exp=&sig=）不携带任何会话凭据，
        // 因此必须在「找令牌」之前先认它——否则图片请求会因为没带 JWT 而 401。
        // 认证走与媒体令牌同一条通道（authenticateMediaOnlyRequest），
        // 所以「只有 ROLE_MEDIA、进不了业务接口/上传/刷新/WebSocket」这套既有规则
        // 与既有测试原样适用，不新增第二份授权口径。
        //
        // ⚠ 建立认证后必须继续走 filterChain.doFilter：本方法只负责「认不认」，
        // 不代替容器放行。真机验证时发现过只 return 不 doFilter 的写法——
        // 表现是 HTTP 200 + 0 字节（Authorization 头同一路径能拿到 70 字节），
        // 只看状态码的测试全绿，图片实际一张都下不来。
        if (authenticateSignedMediaUrl(request, requestPath)) {
            filterChain.doFilter(request, response);
            return;
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

            // P0-2 媒体令牌降权：scope=media 的短期令牌与「令牌从哪儿来」无关，
            // 一律只具备读媒体文件的能力（ROLE_MEDIA），不得换算成完整用户会话。
            // 原实现只对查询参数 + 严格开关做 scope 判定，同一个媒体令牌放进
            // Authorization 头就按 userId 查库拿到 ROLE_USER（管理员还会带出
            // ROLE_ADMIN/ROLE_SUPER_ADMIN/ROLE_AUDITOR），等于 5 分钟令牌 = 24h 会话。
            // 每请求只解析一次 scope（下面两处判定共用），避免为认证路径再叠一次 JWT 解析。
            boolean mediaScopeToken = jwtTokenProvider.isMediaToken(token);

            // R4-00273：?token= 查询参数路径仅接受媒体访问令牌（scope=media）。
            // 当 app.security.media-query-token-strict=true 时，完整用户 JWT 走查询参数
            // 会被拒绝，杜绝 24h 会话 JWT 进入 URL（访问日志/浏览器历史泄露面）。
            // 默认 false 保持对旧客户端的兼容（前端迁移至 /api/v1/media/token 后可开启）；
            // 无论开关与否，媒体令牌都拿不到完整会话（见上面的 mediaScopeToken）。
            if (tokenFromQuery && strictMediaQueryToken && !mediaScopeToken) {
                log.warn("媒体查询参数 token 缺少 media scope，拒绝认证: path={}, userId={}",
                        requestPath, userIdStr);
                throw new BadCredentialsException("媒体访问令牌无效");
            }

            // 修复：查询用户角色，根据角色注入对应权限
            // R4-00272：角色/禁用状态走 60s 短 TTL 本地缓存，避免每请求一次 DB 往返。
            // 与原直查 DB 相比，被删除/禁用用户最长延迟约 60s 生效（可接受的安全窗口）。
            // P0-2：账号状态校验对媒体令牌同样生效——媒体令牌也代表某个账号，
            // 属主被禁用/删除后不得继续读其可见的媒体文件（不因此放宽归属规则）。
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

            if (mediaScopeToken) {
                authenticateMediaOnlyRequest(request, requestPath, userId, token);
                filterChain.doFilter(request, response);
                return;
            }

            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

            if (snapshot.admin()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                log.debug("管理员用户登录，用户ID: {}", userId);
            }
            // infra R2-00025：超级管理员额外注入 ROLE_SUPER_ADMIN，
            // 供敏感配置端点 @PreAuthorize("hasRole('SUPER_ADMIN')") 校验
            if (snapshot.superAdmin()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"));
            }
            // 三级角色 AUDITOR（只读审核员）：仅授予 ROLE_AUDITOR，绝不授予 ROLE_ADMIN——
            // 后台读权限由 SecurityConfig 的 hasAnyRole(...,"AUDITOR") 放行，
            // 写权限（POST/PUT/PATCH/DELETE）由同一配置的 hasAnyRole("ADMIN","SUPER_ADMIN") 拦截
            if (snapshot.auditor()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_AUDITOR"));
                log.debug("只读审核员登录，用户ID: {}", userId);
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
     * P0-2：为 {@code scope=media} 的短期令牌建立「只读媒体」认证。
     *
     * <p>两条规则：</p>
     * <ol>
     *   <li>请求必须是媒体读取（GET/HEAD 的 {@code /api/v1/media/{userId}/{资源路径}}，
     *       判定真源 {@link MediaTokenPolicy#isMediaReadRequest}；其中还含一道
     *       「原始 URI 必须已归一化」的前置闸 {@link MediaTokenPolicy#isNormalizedRequestPath}，
     *       带 {@code ..} 段、百分号编码、{@code //} 的原始串不参与媒体读取判定，
     *       防止「按原始串放行、按归一化串路由」的错位把媒体令牌送到别的资源上）；
     *       此时只注入 {@code ROLE_MEDIA}，<b>不注入</b> {@code ROLE_USER} 与任何管理角色；
     *       principal 仍是令牌属主的 userId，媒体归属/分级校验
     *       （{@link com.campuslove.api.media.MediaAccessService} +
     *       {@link com.campuslove.api.media.MediaTierPolicy}）照旧生效，
     *       所以「媒体可读范围」既没被放大也没被打断；</li>
     *   <li>其余任何路径（业务接口、管理端、上传、{@code /api/v1/media/token} 签发）
     *       <b>不建立任何认证</b>：清空 SecurityContext，由
     *       {@link com.campuslove.api.auth.JwtAuthenticationEntryPoint} 出 401。
     *       安全链另有 {@code MediaTokenPolicy.mediaOnlyAuthenticationMatcher()} 的
     *       deny 规则兜底，两层同源，避免「过滤器认一套、授权规则认一套」留出缝隙。</li>
     * </ol>
     *
     * <p>日志纪律：只记录路径与 userId，不记录令牌内容也不记录 scope 原文之外的声明，
     * 防止令牌经日志外泄。</p>
     *
     * @param request     当前请求
     * @param requestPath 请求路径（用于判定是否为媒体读取）
     * @param userId      令牌属主 userId（作为 principal）
     * @param token       已验证的媒体令牌（仅作为 credentials 占位，不进入授权判定）
     */
    private void authenticateMediaOnlyRequest(HttpServletRequest request, String requestPath,
                                              Long userId, String token) {
        if (!MediaTokenPolicy.isMediaReadRequest(request)) {
            log.warn("媒体令牌（scope=media）访问非媒体读取路径，不建立会话: path={}, userId={}",
                    requestPath, userId);
            SecurityContextHolder.clearContext();
            return;
        }
        PreAuthenticatedAuthenticationToken mediaAuthentication =
                new PreAuthenticatedAuthenticationToken(userId, token, MediaTokenPolicy.mediaAuthorities());
        mediaAuthentication.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(mediaAuthentication);
        log.debug("媒体令牌认证成功（仅 ROLE_MEDIA），用户ID: {}，路径: {}", userId, requestPath);
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
