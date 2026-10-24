package com.campuslove.api.media;

import com.campuslove.api.config.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Locale;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.AntPathMatcher;

/**
 * P0-2 媒体令牌降权：「什么算媒体读取请求」与「什么算媒体令牌会话」的唯一判定真源。
 *
 * <p>背景：{@code scope=media} 的短期令牌（{@link JwtTokenProvider#generateMediaToken}）
 * 设计意图是给 {@code <image src>} 这类无法携带 Authorization 头的场景使用，
 * 只应有「读媒体」这一项能力。改造前该令牌一旦从请求头进来，过滤器会照常授予
 * {@code ROLE_USER}（乃至 ADMIN/SUPER_ADMIN/AUDITOR），等于把短期令牌当完整会话用。</p>
 *
 * <p>本类把收敛后的口径集中成一处，供三方共用，避免「过滤器认一套、安全链认一套」
 * 的缝隙（缝隙正是越权的来源）：</p>
 * <ul>
 *   <li>{@link com.campuslove.api.config.JwtAuthenticationFilter}：媒体令牌只有在
 *       {@link #isMediaReadRequest(HttpServletRequest)} 为真时才注入 {@link #ROLE_MEDIA}；</li>
 *   <li>{@link com.campuslove.api.config.SecurityConfig} /
 *       {@link com.campuslove.api.config.MockSecurityConfig}：
 *       {@link #mediaReadRequestMatcher()} 放行媒体读取，
 *       {@link #mediaOnlyAuthenticationMatcher()} 把媒体会话在其余一切路径上拒掉；</li>
 *   <li>{@link MediaTierPolicy}：媒体会话沿用「本人可读 / 内容档公开图片可读」既有契约，
 *       不因降权而新增可读范围。</li>
 * </ul>
 *
 * <p><b>fail-closed 方向</b>：路径为 null/空白、方法非 GET/HEAD、主体为 null/匿名，
 * 一律判定为「不是媒体读取」，宁可多拒一次也不放开业务接口。</p>
 */
public final class MediaTokenPolicy {

    /**
     * 媒体令牌专属权限（Spring Security 的 {@code hasRole("MEDIA")} 对应权限名）。
     *
     * <p>与 {@code ROLE_USER}/{@code ROLE_ADMIN} 等业务权限互斥：媒体令牌只拿本权限，
     * 因此所有以「已登录用户」为前提的业务端点天然拒绝它。</p>
     */
    public static final String ROLE_MEDIA = "ROLE_MEDIA";

    /** {@code hasRole/hasAnyRole} 使用的角色名（不带 {@code ROLE_} 前缀）——媒体 */
    private static final String ROLE_MEDIA_NAME = "MEDIA";

    /** {@code hasRole/hasAnyRole} 使用的角色名（不带 {@code ROLE_} 前缀）——完整用户会话 */
    private static final String ROLE_USER_NAME = "USER";

    /** 完整用户会话权限（由 JwtAuthenticationFilter 对无 scope 的令牌注入） */
    private static final String ROLE_USER = "ROLE_USER";

    /**
     * 媒体读取路径模式：{@code /api/v1/media/{userId}/{至少一段资源路径}}
     * （含 app-assets 公开资产）。
     *
     * <p>结尾的 {@code /**} 是有意为之：Ant 的 {@code **} 可匹配零段，因此本模式
     * 等价于「userId 之后必须还有资源段」。形如 {@code /api/v1/media/100}（只有目录、
     * 没有资源文件）不属于读取，不接受媒体令牌——控制器对它也只会返回 400。</p>
     */
    private static final String MEDIA_READ_PATH_PATTERN = "/api/v1/media/*/*/**";

    /**
     * 同前缀但不是「读文件」的端点：令牌签发与文件上传。
     *
     * <p>显式列出并置于读取判定之前，防止将来出现
     * {@code /api/v1/media/upload/**}、{@code /api/v1/media/token/**} 这类
     * 带子路径的写端点时被通用读取模式误判为可读。</p>
     */
    private static final List<String> NON_READ_MEDIA_PATH_PATTERNS = List.of(
            "/api/v1/media/token",
            "/api/v1/media/token/**",
            "/api/v1/media/upload",
            "/api/v1/media/upload/**");

    /** 允许媒体读取的 HTTP 方法（只读语义：GET 取内容、HEAD 取元信息） */
    private static final List<String> READ_METHODS = List.of("GET", "HEAD");

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private MediaTokenPolicy() {
    }

    /**
     * 判断 HTTP 方法是否属于媒体读取方法（GET/HEAD）。
     *
     * @param method 请求方法（可为 null）
     * @return true 表示只读方法
     */
    public static boolean isMediaReadMethod(String method) {
        if (method == null || method.isBlank()) {
            return false;
        }
        return READ_METHODS.contains(method.trim().toUpperCase(Locale.ROOT));
    }

    /**
     * 判断路径是否为媒体读取路径（不含方法判定）。
     *
     * @param path 请求路径（可为 null）
     * @return true 表示是媒体文件读取路径
     */
    public static boolean isMediaReadPath(String path) {
        if (path == null || path.isBlank()) {
            return false; // fail-closed
        }
        for (String blocked : NON_READ_MEDIA_PATH_PATTERNS) {
            if (PATH_MATCHER.match(blocked, path)) {
                return false; // 签发/上传端点永远不算读取
            }
        }
        return PATH_MATCHER.match(MEDIA_READ_PATH_PATTERN, path);
    }

    /**
     * 判断请求是否为「媒体读取请求」= 只读方法 + 媒体读取路径。
     *
     * @param request HTTP 请求（可为 null）
     * @return true 表示媒体令牌可以服务该请求
     */
    public static boolean isMediaReadRequest(HttpServletRequest request) {
        if (request == null) {
            return false;
        }
        return isMediaReadMethod(request.getMethod()) && isMediaReadPath(request.getRequestURI());
    }

    /**
     * 供 Spring Security 授权规则使用的「媒体读取请求」匹配器。
     *
     * <p>与 {@link #isMediaReadRequest(HttpServletRequest)} 同源，保证过滤器与安全链
     * 对「什么是读取」永远一致。</p>
     *
     * @return 媒体读取请求匹配器
     */
    public static RequestMatcher mediaReadRequestMatcher() {
        return MediaTokenPolicy::isMediaReadRequest;
    }

    /**
     * 判断认证主体是否为「媒体令牌会话」：带 {@link #ROLE_MEDIA} 且不带 {@link #ROLE_USER}。
     *
     * <p>完整用户会话永远带 ROLE_USER（含管理员的 ROLE_ADMIN 组合），因此不会被本判定命中，
     * 媒体降权规则只作用于纯媒体令牌。</p>
     *
     * @param authentication 当前认证主体，可为 null
     * @return true 表示这是纯媒体令牌会话
     */
    public static boolean isMediaOnlyAuthentication(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        boolean hasMedia = false;
        boolean hasUser = false;
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String granted = authority == null ? null : authority.getAuthority();
            if (ROLE_MEDIA.equals(granted)) {
                hasMedia = true;
            } else if (ROLE_USER.equals(granted)) {
                hasUser = true;
            }
        }
        return hasMedia && !hasUser;
    }

    /**
     * 供 Spring Security 授权规则使用的「当前请求由媒体令牌发起」匹配器。
     *
     * <p>该匹配器读取 {@link org.springframework.security.core.context.SecurityContextHolder}
     * 中的认证主体（授权过滤器执行时认证已写入上下文），命中后配合 {@code denyAll()}
     * 把媒体令牌挡在所有非媒体读取路径之外——业务接口、管理端、上传、令牌签发全覆盖，
     * 且无需为每条业务路由单独写规则（漏写一条就是越权面）。</p>
     *
     * @return 媒体会话匹配器
     */
    public static RequestMatcher mediaOnlyAuthenticationMatcher() {
        return request -> isMediaOnlyAuthentication(
                org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication());
    }

    /**
     * 把媒体令牌规则装进 Spring Security 的授权链（real 与 mock 两套配置共用同一次调用）。
     *
     * <p>两条规则，顺序即语义（{@code authorizeHttpRequests} 取首个匹配规则）：</p>
     * <ol>
     *   <li>{@code GET/HEAD /api/v1/media/{userId}/{资源路径}} → {@code hasAnyRole(USER, MEDIA)}：
     *       媒体读取允许媒体会话，完整用户会话照旧；</li>
     *   <li>其后 {@code mediaOnlyAuthenticationMatcher()} → {@code denyAll()}：
     *       纯媒体会话出现在任何其它路径上（业务接口、管理端、上传、
     *       {@code /api/v1/media/token} 签发）一律 403——不必逐条枚举业务路由，
     *       漏写一条就是越权面。</li>
     * </ol>
     *
     * <p>必须插在 {@code /api/v1/media/app-assets/**} 的 permitAll 之后、
     * 通用 {@code /api/v1/**} 的 authenticated 之前；两处配置都调用本方法，
     * 规则本体只有一份，杜绝「real 收紧了、mock 没跟上」或反之的漂移。</p>
     *
     * @param registry {@code authorizeHttpRequests} 回调收到的授权注册表
     */
    public static void applyMediaTokenRules(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry) {
        registry.requestMatchers(mediaReadRequestMatcher())
                .hasAnyRole(ROLE_USER_NAME, ROLE_MEDIA_NAME)
                .requestMatchers(mediaOnlyAuthenticationMatcher()).denyAll();
    }

    /**
     * 构造媒体令牌会话的权限列表（只含 {@link #ROLE_MEDIA}）。
     *
     * <p>媒体令牌的能力边界就是这一项权限：任何写方法注解
     * （如上传端点的 {@code @PreAuthorize("hasRole('USER')")}）与管理端规则都天然拒掉它。</p>
     *
     * @return 不可变权限列表
     */
    public static List<SimpleGrantedAuthority> mediaAuthorities() {
        return List.of(new SimpleGrantedAuthority(ROLE_MEDIA));
    }
}
