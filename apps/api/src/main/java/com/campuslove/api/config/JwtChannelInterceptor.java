package com.campuslove.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

/**
 * WebSocket STOMP 通道拦截器。
 * 在 CONNECT 阶段校验 JWT 令牌，在 SUBSCRIBE 阶段校验订阅路径权限，
 * 在 SEND/MESSAGE 阶段校验发送目标（P2 修复，2026-10-31）。
 *
 * 安全策略:
 * - CONNECT: 必须携带有效 JWT，验证成功后将用户信息写入 header
 * - SUBSCRIBE: 只允许订阅 /user/{自身userId}/queue/** 和 /topic/**
 * - SEND / MESSAGE: 目标必须落在应用前缀（缺省 /app/**）之下，其余一律拒绝
 * - 其他命令（DISCONNECT/ACK/NACK 等）: 直接放行
 *
 * <p>为什么 SEND 必须单独设限（P2，2026-10-31）：本应用用
 * {@code enableSimpleBroker("/topic","/queue")}，而 SUBSCRIBE 把 {@code /topic/**}
 * 放开给所有认证用户。STOMP 的简单代理对「订阅」与「发送」不做区分——没有 SEND 侧过滤时，
 * 任何认证用户都能 {@code SEND destination=/topic/anything} 直接往广播命名空间注入内容
 * （绕开所有 {@code @MessageMapping} 里的关系校验、内容安全校验与限流），或往他人的
 * {@code /queue/*} 前缀投递。当前 API 里没有任何 {@code /topic} 发送方（服务端全部走
 * {@code /user/**}\/{@code /queue}），所以这是<b>潜在</b>影响面；但一旦有人加上广播主题，
 * 缺口立刻变成现实的伪造推送通道。规则：客户端只能把消息交给应用前缀下的
 * {@code @MessageMapping} 处理器，代理命名空间对客户端只读。</p>
 *
 * Token 提取说明（Phase 3 任务 15）:
 * - 客户端通过 STOMP CONNECT 帧的 JWT 令牌（Authorization header / token 原生 header）建立会话
 * - 不从 URL 查询参数提取 token（已由 WebSocketConfig.JwtHandshakeInterceptor 在握手阶段处理）
 */
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtChannelInterceptor.class);

    /** Authorization header 名称 */
    private static final String AUTH_HEADER = "Authorization";

    /** Bearer 前缀 */
    private static final String BEARER_PREFIX = "Bearer ";

    /** STOMP 连接时传递 token 的原生 header 名称 */
    private static final String TOKEN_HEADER = "token";

    /**
     * 「客户端可发送目标」的配置项名（逗号分隔前缀列表）。
     *
     * <p>与 {@link WebSocketConfig#configureMessageBroker} 注册的应用前缀<b>同一个键、同一份缺省</b>：
     *  broker 侧用它路由到 {@code @MessageMapping}，拦截器侧用它做白名单，两处不能各自硬编码，
     * 否则改前缀时授权口径会与路由脱节。</p>
     */
    public static final String APP_DESTINATION_PREFIXES_PROPERTY =
            "app.websocket.application-destination-prefixes";

    /** 应用目标前缀缺省值（与 WebSocketConfig 的历史硬编码口径一致） */
    public static final String DEFAULT_APP_DESTINATION_PREFIX = "/app";

    /** 前缀缺省集合（{@value #APP_DESTINATION_PREFIXES_PROPERTY} 未配置或为空时使用） */
    private static final List<String> DEFAULT_APP_DESTINATION_PREFIXES =
            List.of(DEFAULT_APP_DESTINATION_PREFIX);

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * R4-00281：用户状态查询（CONNECT 阶段校验用户未被禁用）。
     * 可选注入：mock profile 无 JPA Repository（为 null 时跳过禁用检查，
     * 由 mock 分支先行短路）。
     */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.campuslove.api.repository.UserRepository userRepository;

    /**
     * 运行环境（R4-00280）：mock profile 下跳过真实 JWT 校验，
     * 与 MockSecurityConfig 的 mock 认证语义保持一致（mock-token 无法通过 validateToken）。
     */
    private final org.springframework.core.env.Environment environment;

    /** R4-00280：mock 模式兜底用户 ID（配置 app.mock.principal-user-id，与 MockSecurityConfig 对齐） */
    @org.springframework.beans.factory.annotation.Value("${app.mock.principal-user-id:1}")
    private long mockPrincipalUserId;

    /**
     * 客户端 SEND/MESSAGE 允许的目标前缀（默认仅 {@value #DEFAULT_APP_DESTINATION_PREFIX}）。
     *
     * <p>与 {@link WebSocketConfig} 注册的应用前缀同源（同一个配置键）；未经 Spring 注入时
     * （单元测试直接 new 出本类）回落 {@link #defaultAppDestinationPrefixes()}，缺省口径不变。</p>
     */
    @org.springframework.beans.factory.annotation.Value(
            "${" + APP_DESTINATION_PREFIXES_PROPERTY + ":" + DEFAULT_APP_DESTINATION_PREFIX + "}")
    private List<String> applicationDestinationPrefixes;

    public JwtChannelInterceptor(JwtTokenProvider jwtTokenProvider,
                                 org.springframework.core.env.Environment environment) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.environment = environment;
    }

    /** 是否处于 mock profile（R4-00280） */
    private boolean isMockProfile() {
        return java.util.Arrays.asList(environment.getActiveProfiles()).contains("mock");
    }

    /** 将认证用户写入 STOMP header（供 SUBSCRIBE/SEND 权限校验使用） */
    private void setAuthenticatedUser(StompHeaderAccessor accessor, String userId) {
        accessor.setUser(new Principal() {
            @Override
            public String getName() {
                return userId;
            }
        });
    }

    /**
     * 在消息发送到通道之前进行拦截。
     * 根据 STOMP 命令类型执行不同的安全校验。
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (command == null) {
            return message;
        }

        switch (command) {
            case CONNECT -> handleConnect(accessor);
            case SUBSCRIBE -> handleSubscribe(accessor);
            // P2（2026-10-31）：SEND/MESSAGE 也必须授权——代理命名空间（/topic、/queue）
            // 对客户端只读，客户端只能把消息交给应用前缀下的 @MessageMapping 处理器
            case SEND, MESSAGE -> handleSend(accessor);
            default -> { /* DISCONNECT/ACK/NACK 等无目标语义的控制帧不做额外校验 */ }
        }

        return message;
    }

    /**
     * 处理 SEND / MESSAGE 命令：目标必须落在应用前缀（缺省 {@code /app/**}）之下。
     *
     * <p>被拒绝的目标形态：{@code /topic/**}（广播命名空间，任何认证用户都能 SUBSCRIBE，
     * 若允许 SEND 即等于任何人都能向全体在线用户伪造推送）、{@code /queue/**}
     * （点对点队列前缀）、{@code /user/**}（用户目的地由服务端解析，客户端不得自行投递）、
     * 以及无目标或空目标的帧。</p>
     *
     * @param accessor STOMP 帧头访问器
     * @throws org.springframework.messaging.MessageDeliveryException 目标不在应用前缀内时（403 语义）
     */
    private void handleSend(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            log.warn("WebSocket SEND 拒绝: 缺少目标地址, userId={}, sessionId={}",
                    principalName(accessor), accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Forbidden: SEND requires a destination under " + effectiveAppPrefixes());
        }
        if (!isApplicationDestination(destination)) {
            // 明确记录被拒目标：这是「客户端试图写代理命名空间」的唯一可见信号，
            // 线上据此判断是否有人在探测 /topic 注入面
            log.warn("WebSocket SEND 拒绝: userId={} 尝试发送到非应用前缀目标 destination={}, "
                            + "sessionId={}, 允许的前缀={}（/topic 与 /queue 属代理命名空间，对客户端只读）",
                    principalName(accessor), destination, accessor.getSessionId(), effectiveAppPrefixes());
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Forbidden: cannot send to destination " + destination
                            + "; client SEND is only accepted under " + effectiveAppPrefixes());
        }
        log.debug("WebSocket SEND 允许: userId={}, destination={}", principalName(accessor), destination);
    }

    /** 目标是否落在允许的应用前缀之下（前缀按「路径段」匹配，避免 /appx 被 /app 误放行）。 */
    private boolean isApplicationDestination(String destination) {
        for (String prefix : effectiveAppPrefixes()) {
            if (destination.equals(prefix) || destination.startsWith(prefix + "/")) {
                return true;
            }
        }
        return false;
    }

    /**
     * 生效中的应用目标前缀（已归一为带前导斜杠、不带尾随斜杠的形态）。
     *
     * <p>配置缺省、为空或全部非法时回落 {@link #DEFAULT_APP_DESTINATION_PREFIXES}，
     * 保证「忘记配置」不会变成「放开所有目标」（fail-closed）。</p>
     */
    private List<String> effectiveAppPrefixes() {
        List<String> configured = applicationDestinationPrefixes;
        if (configured == null || configured.isEmpty()) {
            configured = DEFAULT_APP_DESTINATION_PREFIXES;
        }
        List<String> normalized = new java.util.ArrayList<>(configured.size());
        for (String raw : configured) {
            String prefix = normalizePrefix(raw);
            if (prefix != null) {
                normalized.add(prefix);
            }
        }
        return normalized.isEmpty() ? DEFAULT_APP_DESTINATION_PREFIXES : normalized;
    }

    /** 前缀归一：补前导斜杠、去尾随斜杠；空白返回 null（由调用方丢弃）。 */
    private static String normalizePrefix(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        if (!value.startsWith("/")) {
            value = "/" + value;
        }
        while (value.length() > 1 && value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value.equals("/") ? null : value;
    }

    /** 当前会话认证主体名（未认证时为 "anonymous"，仅用于日志）。 */
    private static String principalName(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        return user == null ? "anonymous" : user.getName();
    }

    /**
     * 处理 CONNECT 命令：验证 JWT 令牌并设置认证用户。
     *
     * 令牌获取优先级:
     * 1. Authorization header (Bearer token)
     * 2. token 原生 header
     *
     * 验证成功后通过 accessor.setUser() 设置 Principal，
     * 后续 SUBSCRIBE/SEND 等操作可通过 getUser() 获取认证用户。
     */
    private void handleConnect(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);

        // R4-00280：mock profile 跳过真实 JWT 校验（mock-token 无法通过 validateToken），
        // 与 MockSecurityConfig 的 HTTP mock 认证语义保持一致，保证 mock 模式
        // WebSocket 联调可用。有 token 时尽力解析 userId，解析失败回退配置的 mock 用户。
        if (isMockProfile()) {
            // P0-2 媒体令牌降权：mock 档跳过的是「真实 JWT 校验」这份 demo 便利，
            // 不是媒体 scope 的能力边界——一份真签发的 scope=media 令牌在这里同样能被
            // 解析出 userId，若照旧放行就等于「demo 档里 5 分钟降权凭据 = 长连接会话」。
            // 判定与 HTTP 过滤器/握手拦截器同源（JwtTokenProvider#isMediaToken）。
            if (token != null && !token.isBlank() && jwtTokenProvider.isMediaToken(token)) {
                log.warn("WebSocket CONNECT 拒绝（mock 档）: 媒体访问令牌（media scope）不可建立长连接, sessionId={}",
                        accessor.getSessionId());
                throw new org.springframework.messaging.MessageDeliveryException(
                        "Unauthorized: media-scoped token cannot open WebSocket session");
            }
            String userId = null;
            if (token != null && !token.isBlank()) {
                try {
                    userId = jwtTokenProvider.getUserIdFromToken(token);
                } catch (RuntimeException ex) {
                    log.debug("mock 模式解析 JWT userId 失败，回退 mock 用户: {}", ex.getMessage());
                }
            }
            if (userId == null || userId.isBlank()) {
                userId = String.valueOf(mockPrincipalUserId);
            }
            setAuthenticatedUser(accessor, userId);
            log.info("WebSocket CONNECT mock 认证通过: userId={}, sessionId={}",
                    userId, accessor.getSessionId());
            return;
        }

        if (token == null || token.isBlank()) {
            log.warn("WebSocket CONNECT 拒绝: 未提供 JWT 令牌, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: missing JWT token");
        }

        if (!jwtTokenProvider.validateToken(token)) {
            log.warn("WebSocket CONNECT 拒绝: JWT 令牌无效或已过期, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: invalid JWT token");
        }

        // P0-2 媒体令牌降权：scope=media 的短期令牌只具备「读媒体文件」这一项能力，
        // WebSocket 是完整登录会话的能力面（收发消息、订阅私有队列），必须拒绝。
        // 与 HTTP 侧同源判定（JwtTokenProvider#isMediaToken），不区分令牌来自
        // Authorization 头还是 token 原生头——历史上两条通道都只看签名与有效期，
        // 一个泄露的 5 分钟媒体令牌即可建立长连接并以属主身份收发私信。
        if (jwtTokenProvider.isMediaToken(token)) {
            log.warn("WebSocket CONNECT 拒绝: 媒体访问令牌（media scope）不可建立长连接, sessionId={}",
                    accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Unauthorized: media-scoped token cannot open WebSocket session");
        }

        // 修复（R2）：校验 jti 黑名单——登出/撤销后的 token 不得建立 WebSocket 连接
        if (jwtTokenProvider.isTokenRevoked(token)) {
            log.warn("WebSocket CONNECT 拒绝: JWT 令牌已撤销, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: revoked JWT token");
        }

        String userId = jwtTokenProvider.getUserIdFromToken(token);
        if (userId == null || userId.isBlank()) {
            log.warn("WebSocket CONNECT 拒绝: 无法从 JWT 提取用户ID, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: invalid JWT token");
        }

        // R4-00281：补查用户状态——被禁用的用户不得建立 WebSocket 长连接
        // （原实现仅校验签名/过期，禁用用户仍可保持长连接收发消息）
        if (userRepository != null) {
            try {
                Long uid = Long.parseLong(userId);
                boolean disabled = userRepository.findById(uid)
                        .map(com.campuslove.api.entity.User::isDisabled)
                        .orElse(true);
                if (disabled) {
                    log.warn("WebSocket CONNECT 拒绝: 用户不存在或已被禁用, userId={}, sessionId={}",
                            userId, accessor.getSessionId());
                    throw new org.springframework.messaging.MessageDeliveryException(
                            "Unauthorized: user disabled");
                }
            } catch (NumberFormatException e) {
                log.warn("WebSocket CONNECT 拒绝: 无法解析用户ID, userId={}, sessionId={}",
                        userId, accessor.getSessionId());
                throw new org.springframework.messaging.MessageDeliveryException(
                        "Unauthorized: invalid user id");
            }
        }

        setAuthenticatedUser(accessor, userId);

        log.info("WebSocket CONNECT 认证成功: userId={}, sessionId={}", userId, accessor.getSessionId());
    }

    /**
     * 处理 SUBSCRIBE 命令：校验订阅路径权限。
     *
     * 允许的订阅路径:
     * - /topic/** : 公共广播主题，所有认证用户均可订阅
     * - /user/{自身userId}/queue/** : 用户专属队列，仅允许订阅自己的队列
     *
     * 禁止:
     * - 订阅其他用户的 /user/ 路径
     * - 订阅非 /topic 和非 /user 的路径
     */
    private void handleSubscribe(StompHeaderAccessor accessor) {
        // 验证用户已认证
        Principal user = accessor.getUser();
        if (user == null) {
            log.warn("WebSocket SUBSCRIBE 拒绝: 用户未认证, sessionId={}", accessor.getSessionId());
            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized: user not authenticated");
        }

        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            return; // 无目标路径的订阅请求直接放行
        }

        String userId = user.getName();

        // 允许订阅 /topic/** 公共主题
        if (destination.startsWith("/topic/")) {
            log.debug("WebSocket SUBSCRIBE 允许: userId={}, destination={}", userId, destination);
            return;
        }

        // 校验 /user/ 路径：只允许订阅自己的队列
        if (destination.startsWith("/user/")) {
            // 2026-09-02 修复：兼容 Spring 标准用户目的地简写 /user/queue/**。
            // 客户端按 STOMP 规范订阅 /user/queue/messages，服务端（UserDestinationMessageHandler）
            // 会把它解析为当前会话用户自己的队列，安全语义等价于"只订自己的 queue"。
            // 旧实现把第二段字面当作 userId（得到 "queue"），与真实 userId 恒不等，
            // 导致所有用户私有队列订阅被误判越权、实时推送全链路失效。
            String pathAfterUserPrefix = destination.substring("/user/".length());
            if (pathAfterUserPrefix.equals("queue") || pathAfterUserPrefix.startsWith("queue/")) {
                log.debug("WebSocket SUBSCRIBE 允许(简写自队列): userId={}, destination={}", userId, destination);
                return;
            }
            // 预期格式: /user/{userId}/queue/**
            // 去掉前缀 "/user/" 后，取第一段作为路径中的 userId
            int slashIndex = pathAfterUserPrefix.indexOf('/');
            String targetUserId = (slashIndex > 0)
                    ? pathAfterUserPrefix.substring(0, slashIndex)
                    : pathAfterUserPrefix;

            if (!userId.equals(targetUserId)) {
                log.warn("WebSocket SUBSCRIBE 拒绝: userId={} 尝试订阅其他用户路径 destination={}, sessionId={}",
                        userId, destination, accessor.getSessionId());
                throw new org.springframework.messaging.MessageDeliveryException(
                        "Forbidden: cannot subscribe to another user's queue");
            }

            // 进一步校验：/user/{userId}/ 之后的路径必须以 queue/ 开头
            if (slashIndex > 0) {
                String subPath = pathAfterUserPrefix.substring(slashIndex + 1);
                if (!subPath.startsWith("queue/")) {
                    log.warn("WebSocket SUBSCRIBE 拒绝: userId={} 订阅了非 queue 子路径 destination={}, sessionId={}",
                            userId, destination, accessor.getSessionId());
                    throw new org.springframework.messaging.MessageDeliveryException(
                            "Forbidden: only /user/{userId}/queue/** subscriptions are allowed");
                }
            }

            log.debug("WebSocket SUBSCRIBE 允许: userId={}, destination={}", userId, destination);
            return;
        }

        // 其他路径一律拒绝
        log.warn("WebSocket SUBSCRIBE 拒绝: userId={} 尝试订阅不允许的路径 destination={}, sessionId={}",
                userId, destination, accessor.getSessionId());
        throw new org.springframework.messaging.MessageDeliveryException(
                "Forbidden: subscription destination not allowed");
    }

    /**
     * 从 STOMP CONNECT 帧的 nativeHeaders 中提取 JWT 令牌。
     *
     * 提取优先级（Phase 3 任务 15）:
     * 1. Authorization header (Bearer token 格式) —— 客户端 STOMP CONNECT 帧主推方式
     * 2. token 原生 header (兼容直接传 token 字符串的场景)
     *
     * 注意: 不从 URL 查询参数提取 token，URL 参数方式已在 Phase 3 任务 15 中移除。
     */
    private String extractToken(StompHeaderAccessor accessor) {
        // 优先从 Authorization header 提取
        List<String> authHeaders = accessor.getNativeHeader(AUTH_HEADER);
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authValue = authHeaders.get(0);
            if (authValue != null && authValue.startsWith(BEARER_PREFIX)) {
                return authValue.substring(BEARER_PREFIX.length()).trim();
            }
            // 兼容直接传 token 值（无 Bearer 前缀）的情况
            if (authValue != null && !authValue.isBlank()) {
                return authValue.trim();
            }
        }

        // 其次从 token 原生 header 提取
        List<String> tokenHeaders = accessor.getNativeHeader(TOKEN_HEADER);
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            String tokenValue = tokenHeaders.get(0);
            if (tokenValue != null && !tokenValue.isBlank()) {
                return tokenValue.trim();
            }
        }

        return null;
    }
}
