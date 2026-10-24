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
 * <p><b>fail-closed 方向</b>：路径为 null/空白、路径为<b>未归一化形态</b>（含 {@code .}/{@code ..}
 * 段、百分号编码、矩阵参数分号 {@code ;}、{@code //}、反斜杠——见 {@link #isNormalizedRequestPath(String)}）、
 * 方法非 GET/HEAD、主体为 null/匿名，
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
     * 判断路径是否为「已经归一化的原始请求路径」——媒体读取判定的前置闸（P0-2 收口）。
     *
     * <p><b>为什么需要这一步</b>：授权判定读的是 {@link HttpServletRequest#getRequestURI()}，
     * 那是容器交给安全链的<b>原始</b>串（不解码、不折叠 {@code .}/{@code ..}、不折叠空段）；
     * 而 Spring MVC 用来路由与授权规则匹配的是「解码 + 归一化之后」的串。两个串一旦不等价，
     * 「按原始串放行媒体读取」就变成了用一把钥匙开另一扇门：
     * {@code /api/v1/media/x/y/../../../posts/1} 会被读取模式里的 {@code **} 段当成媒体读取
     * 而授予 ROLE_MEDIA，真实路由却是业务接口（此前只是碰巧被框架自己的 400 兜住，
     * 不是 P0-2 的功劳）。</p>
     *
     * <p><b>为什么不调用 {@code getServletPath()}/{@code getPathInfo()} 来"归一化后再比"</b>：
     * 那两个方法本身就是 MVC 的路由输入（{@code UrlPathHelper} 会做解码 + 归一化 + 后缀裁剪），
     * 拿它当判定依据等于让路由自己给自己的授权结论背书；且再手工解码一次会引入
     * 双重解码缺陷（{@code %252e} 一类）。因此这里只在原始串上做「形态是否已归一」的
     * 白名单式判定，不做任何解码。</p>
     *
     * <p>判否的形态（一律 fail-closed，不按媒体读取放行）：</p>
     * <ul>
     *   <li>为 {@code null}/空白、不以 {@code '/'} 开头（不像是请求 URI）；</li>
     *   <li>含 {@code .}/{@code ..}/纯点段（{@code ...} 等）——即路径遍历段；</li>
     *   <li>含任何百分号转义（{@code %2e}/{@code %2f}/{@code %5c} 与双重编码 {@code %252e}
     *       都只在这一步被排除）。<b>更正一处易误导的说法</b>：本仓库的应用资产里确有中文名
     *       文件（如 {@code app-assets/assets/images/login-split/登录页_r01_c01.png}），它们在
     *       URL 中必然以百分号编码出现，所以「应用资产都是 ASCII、不含百分号」并不成立；但
     *       百分比一律拒掉<b>不会</b>误伤它们——真正的理由是
     *       {@code /api/v1/media/app-assets/**} 的 permitAll 规则排在媒体读取匹配器<b>之前</b>，
     *       公开应用资产（ASCII 或中文名皆然）由那条规则先行放行，根本不经过本归一化闸；而
     *       服务端为<b>用户</b>产出的媒体 URL 是 {@code UUID.扩展名} 形态，本身不含百分号。
     *       因此保持「任何百分号一律 fail-closed」，既守住归一化不变式又不影响真实读取；</li>
     *   <li>含反斜杠（部分容器/操作系统视作分隔符）、裸空格、控制字符；</li>
     *   <li>含分号 {@code ;}（矩阵参数：容器/MVC 在路由前会剥掉段内 ';' 及其后的参数，
     *       {@code '..;'} 剥参后即 {@code '..'} 穿越段、{@code 'a.jpg;jsessionid=…'} 剥参后
     *       才是真实文件名，原始串因此不再唯一标识被路由资源）。即便 {@code StrictHttpFirewall}
     *       今天会把分号拦在链外，授权判定也不能只依赖这层兜底（换容器或放宽防火墙即失守），
     *       且合法媒体 URL 本就禁分号（见 {@link MediaAccessService} 的 {@code validateSubPath}），
     *       故对 ';' 一律 fail-closed；</li>
     *   <li>含空段 {@code //}（归一化会折叠，说明原始串不是规范形态）。</li>
     * </ul>
     *
     * <p>合法形态里的点是允许的：{@code avatar.png}、{@code a.b.c.svg}、
     * 以点开头的 {@code .svg} 都不是遍历段。</p>
     *
     * @param path 原始请求路径（通常来自 {@code getRequestURI()}）
     * @return true 表示该路径已是归一化形态，可以放心参与媒体读取判定
     */
    public static boolean isNormalizedRequestPath(String path) {
        if (path == null || path.isBlank() || path.charAt(0) != '/') {
            return false; // fail-closed：不像是请求 URI
        }
        if (path.indexOf('%') >= 0) {
            return false; // 任何百分号转义：原始串 ≠ 容器解码后的路由输入
        }
        if (path.indexOf('\\') >= 0) {
            return false; // 反斜杠：可能被当作分隔符，等价于多插一段
        }
        if (path.indexOf(';') >= 0) {
            // 分号矩阵参数：容器/Spring MVC 在路由前会剥掉路径段里 ';' 及其后的矩阵参数
            // （'..;' → '..'，'a.jpg;jsessionid=...' → 'a.jpg'），因此带 ';' 的原始串
            // 不再唯一标识被路由的资源——用它放行媒体读取，等于拿一把钥匙开另一扇门。
            // StrictHttpFirewall 今天虽会把分号拦在链外（400），但授权判定不能只依赖这一层
            // 兜底（换容器/放宽防火墙即失守），故对 ';' 一律 fail-closed；
            // 合法媒体 URL 本就不含分号（见 MediaAccessService#validateSubPath 明确禁止）。
            return false;
        }
        int segmentStart = 1;
        for (int i = 1; i < path.length(); i++) {
            char c = path.charAt(i);
            if (c == ' ' || c < 0x20 || c == 0x7F) {
                return false; // 原始请求 URI 不该出现裸空格/控制字符
            }
            if (c == '/') {
                if (i == segmentStart) {
                    return false; // 空段（"//"）：归一化会把它折叠掉
                }
                if (isDotOnlySegment(path.substring(segmentStart, i))) {
                    return false; // "." / ".." / "..." 遍历段
                }
                segmentStart = i + 1;
            }
        }
        // 最后一段允许为空（尾随 '/'），但不允许是纯点段
        return !isDotOnlySegment(path.substring(segmentStart));
    }

    /**
     * 是否为「全是点」的路径段（{@code .}、{@code ..}、{@code ...}……）。
     *
     * @param segment 待判定的路径段（可为空串）
     * @return true 表示该段等价于遍历段
     */
    private static boolean isDotOnlySegment(String segment) {
        if (segment.isEmpty()) {
            return false;
        }
        for (int i = 0; i < segment.length(); i++) {
            if (segment.charAt(i) != '.') {
                return false;
            }
        }
        return true;
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
     * <p>P0-2 收口：先要 {@link #isNormalizedRequestPath(String)} 判定「原始串已归一」，
     * 未归一（含 {@code ..} 段、百分号编码、矩阵参数分号 {@code ;}、{@code //}、反斜杠）的路径
     * 一律不按媒体读取处理——
     * 这类请求既不该由过滤器拿到 ROLE_MEDIA 会话，也不该命中安全链的媒体放行规则，
     * 会落到其后的 {@link #mediaOnlyAuthenticationMatcher()} deny 规则上被拒。</p>
     *
     * @param path 请求路径（可为 null）
     * @return true 表示是媒体文件读取路径
     */
    public static boolean isMediaReadPath(String path) {
        if (path == null || path.isBlank()) {
            return false; // fail-closed
        }
        if (!isNormalizedRequestPath(path)) {
            return false; // fail-closed：原始串与路由输入不等价时不做媒体读取判定
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
     * <p>路径取 {@link HttpServletRequest#getRequestURI()}（原始串，不解码不归一化），
     * 因此必须先过 {@link #isNormalizedRequestPath(String)}：原始串与容器解码归一化后的
     * 路由输入不等价时（{@code ..} 段、{@code %2e}/{@code %2f}、{@code //} 等）判否，
     * 避免「按原始串放行、按归一化串路由」的错位越权。</p>
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
