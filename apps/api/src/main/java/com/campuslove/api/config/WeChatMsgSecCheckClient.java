package com.campuslove.api.config;

import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.net.URI;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 微信官方内容安全检测客户端（msgSecCheck v2，2026-08-10 C1）。
 *
 * <p><b>条件启用</b>：仅 real profile 且配置了
 * {@code app.content-security.wechat-secret}（环境变量 CONTENT_SECURITY_WECHAT_SECRET）
 * 时才注册，并 {@code @Primary} 优先于本地过滤；未配置凭据时完全不存在（本地过滤兜底）。
 * 微信 msgSecCheck 需要正式 AppID/AppSecret 与认证主体——属"需额外授权"项，
 * 用户决策（2026-08-10）为：不强接入，凭据就绪后启用即可。</p>
 *
 * <p><b>fail-closed 语义</b>：微信 API 调用失败/超时（网络、token、openid 缺失等）
 * 一律降级调用本地敏感词过滤，绝不直接放行；同时记录告警日志便于排查。</p>
 *
 * <p>限制与实现取舍：msgSecCheck v2 要求 openid 为近 2 小时访问过小程序的用户，
 * 本地联调/无 openid 场景必然失败 → 自动降级本地，符合预期。</p>
 */
@Profile("real")
@ConditionalOnProperty(name = "app.content-security.wechat-secret")
@Primary
@Component
public class WeChatMsgSecCheckClient implements ContentSecurityChecker {

    private static final Logger log = LoggerFactory.getLogger(WeChatMsgSecCheckClient.class);

    private static final String TOKEN_URL =
            "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential";
    private static final String MSG_SEC_CHECK_URL =
            "https://api.weixin.qq.com/wxa/msg_sec_check";
    /** 检测文本长度上限（官方 ≤2500 字符，超长截断） */
    private static final int MAX_CONTENT_LENGTH = 2500;
    /** access_token 提前刷新窗口（官方有效期 7200s，提前 300s 刷新） */
    private static final long TOKEN_REFRESH_AHEAD_SECONDS = 300;

    private final RestClient restClient;
    private final WeChatConfig weChatConfig;
    private final LocalContentSecurityChecker localChecker;
    private final UserRepository userRepository;
    private final String wechatSecret;

    /** access_token 缓存（单机内存即可；多实例部署需迁移 Redis） */
    private volatile String cachedAccessToken;
    private volatile long tokenExpiresAtEpochSeconds;

    public WeChatMsgSecCheckClient(RestClient.Builder restClientBuilder,
                                   WeChatConfig weChatConfig,
                                   LocalContentSecurityChecker localChecker,
                                   UserRepository userRepository,
                                   @Value("${app.content-security.wechat-secret:}") String wechatSecret) {
        // 超时与连接池走全局 RestClient 默认配置；调用失败/超时统一 catch 降级本地过滤
        this.restClient = restClientBuilder.build();
        this.weChatConfig = weChatConfig;
        this.localChecker = localChecker;
        this.userRepository = userRepository;
        this.wechatSecret = wechatSecret;
    }

    @Override
    public ContentSecurityVerdict check(String content, Long userId, String scene) {
        if (content == null || content.isBlank()) {
            return ContentSecurityVerdict.pass();
        }
        String trimmed = content.length() > MAX_CONTENT_LENGTH
                ? content.substring(0, MAX_CONTENT_LENGTH) : content;
        try {
            String accessToken = obtainAccessToken();
            String openid = resolveOpenid(userId);
            // msgSecCheck v2 要求 openid（近两小时访问过）；无 openid 时按 fail-closed 降级
            if (accessToken == null || accessToken.isBlank() || openid == null || openid.isBlank()) {
                log.warn("[content-security] 缺少 access_token 或 openid，降级本地过滤: userId={}, scene={}", userId, scene);
                return localChecker.check(trimmed, userId, scene);
            }
            Map<String, Object> body = Map.of(
                    "version", 2,
                    "openid", openid,
                    "scene", scene == null ? 3 : scene,
                    "content", trimmed);
            MsgSecCheckResponse resp = restClient.post()
                    .uri(URI.create(MSG_SEC_CHECK_URL + "?access_token=" + accessToken))
                    .body(body)
                    .retrieve()
                    .body(MsgSecCheckResponse.class);
            if (resp == null || resp.result() == null) {
                log.warn("[content-security] 微信检测返回空响应，降级本地过滤: userId={}", userId);
                return localChecker.check(trimmed, userId, scene);
            }
            String suggest = resp.result().suggest();
            if ("risky".equalsIgnoreCase(suggest) || "review".equalsIgnoreCase(suggest)) {
                log.info("[content-security] 微信检测 {} : userId={}, scene={}, label={}",
                        suggest, userId, scene, resp.result().label());
            }
            return new ContentSecurityVerdict(suggest, String.valueOf(resp.result().label()), "wechat");
        } catch (RuntimeException e) {
            // fail-closed：微信侧任何异常（含 RestClientException 网络/超时）均降级本地过滤，不直接放行
            log.warn("[content-security] 微信检测异常，降级本地过滤: {}", e.getMessage());
            return localChecker.check(trimmed, userId, scene);
        }
    }

    /** 获取 access_token（带缓存与提前刷新）。 */
    private String obtainAccessToken() {
        long now = System.currentTimeMillis() / 1000;
        if (cachedAccessToken != null && now < tokenExpiresAtEpochSeconds - TOKEN_REFRESH_AHEAD_SECONDS) {
            return cachedAccessToken;
        }
        String appId = weChatConfig.getAppId();
        if (appId == null || appId.isBlank() || wechatSecret == null || wechatSecret.isBlank()) {
            return null;
        }
        TokenResponse resp = restClient.get()
                .uri(TOKEN_URL + "&appid=" + appId + "&secret=" + wechatSecret)
                .retrieve()
                .body(TokenResponse.class);
        if (resp == null || resp.accessToken() == null || resp.accessToken().isBlank()) {
            log.warn("[content-security] 获取 access_token 失败: errcode={}, errmsg={}",
                    resp == null ? "null" : resp.errcode(), resp == null ? "null" : resp.errmsg());
            return null;
        }
        cachedAccessToken = resp.accessToken();
        tokenExpiresAtEpochSeconds = now + (resp.expiresIn() > 0 ? resp.expiresIn() : 7200);
        return cachedAccessToken;
    }

    /** 解析当前用户的 openid（msgSecCheck v2 必需；无 openid 返回 null → 降级）。 */
    private String resolveOpenid(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            Optional<User> user = userRepository.findById(userId);
            return user.map(User::getOpenid).filter(o -> o != null && !o.isBlank()).orElse(null);
        } catch (RuntimeException e) {
            log.warn("[content-security] 查询 openid 失败: {}", e.getMessage());
            return null;
        }
    }

    /** msgSecCheck v2 响应。 */
    public record MsgSecCheckResponse(Integer errcode, String errmsg, Result result) {
        public record Result(String suggest, Integer label, Integer prob, String trace_id) {
        }
    }

    /** access_token 响应。 */
    public record TokenResponse(String accessToken, Integer expiresIn, Integer errcode, String errmsg) {
    }
}
