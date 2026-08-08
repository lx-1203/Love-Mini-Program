package com.campuslove.api.auth;

import com.campuslove.api.config.Resilience4jConfig;
import com.campuslove.api.config.WeChatConfig;
import com.campuslove.api.utils.SensitiveDataMasker;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.annotation.PostConstruct;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 微信小程序登录客户端。
 * 仅在 real profile 下激活，负责调用微信 jscode2session 接口。
 */
@Component
@Profile("real")
public class WeChatClient {

    private static final Logger log = LoggerFactory.getLogger(WeChatClient.class);

    /**
     * jscode2session 接口的 query string 模板（与 base URL 拼接）。
     * 使用 URI 变量占位符 {appId}/{appSecret}/{code}，由 RestClient 自动 URL 编码，
     * 避免直接字符串拼接导致特殊字符注入风险。
     */
    private static final String JSCODE2SESSION_QUERY =
            "?appid={appId}&secret={appSecret}&js_code={code}&grant_type=authorization_code";

    /**
     * 微信 jscode2session 接口 base URL，从配置 {@code app.wechat.jscode2session-url} 注入。
     *
     * <p>原代码硬编码 {@code https://api.weixin.qq.com/sns/jscode2session}，无法适应
     * 微信 API 域名切换或代理转发场景；改为配置注入后，可通过环境变量
     * {@code WECHAT_JSCODE2SESSION_URL} 覆盖（如内网代理地址）。
     * 默认值为官方文档地址，保证开箱即用。</p>
     */
    @Value("${app.wechat.jscode2session-url:${WECHAT_JSCODE2SESSION_URL:https://api.weixin.qq.com/sns/jscode2session}}")
    private String jscode2sessionBaseUrl;

    private final WeChatConfig weChatConfig;
    private final RestClient restClient;

    /**
     * Spring 环境（R4-00270：生产 profile 启动强校验）。
     * 用于读取激活 profile（spring.profiles.active）判断是否生产环境；
     * 可选注入，测试直接 new 场景为 null 时跳过校验。
     */
    @Autowired(required = false)
    private Environment environment;

    public WeChatClient(WeChatConfig weChatConfig, RestClient.Builder restClientBuilder) {
        this.weChatConfig = weChatConfig;
        this.restClient = restClientBuilder.build();
    }

    /**
     * 生产环境 dev-fallback 强校验（R4-00270）。
     *
     * <p>devFallbackEnabled 开启时任意 code 派生固定 openid（dev-wechat-{code}）直接走
     * 真实登录/注册链路——生产误开 WECHAT_DEV_FALLBACK_ENABLED=true 即可无凭据伪造微信身份
     * 登录任意新账号。本项目生产 profile 约定为 prod / real（见
     * GlobalExceptionHandler.isProductionProfile 口径），激活生产 profile 时
     * 该开关必须为 false，否则拒绝启动（fail-fast）。</p>
     *
     * <p>本地开发请使用 mock profile（内存演示登录链路，不依赖微信）；
     * 确需以 real profile 联调时需配置真实 WECHAT_APPID/WECHAT_SECRET。</p>
     */
    @PostConstruct
    public void validateDevFallbackDisabledInProduction() {
        if (!weChatConfig.isDevFallbackEnabled()) {
            return;
        }
        if (environment != null && isProductionProfile()) {
            throw new IllegalStateException(
                    "WECHAT_DEV_FALLBACK_ENABLED=true 禁止在生产环境（profile 含 prod/real）开启："
                    + "任意 code 可派生固定 openid 伪造微信身份。请关闭该开关（生产必须接入真实微信配置），"
                    + "本地联调请使用 mock profile。");
        }
    }

    /** 判断激活 profile 是否为生产环境（prod / real，与 GlobalExceptionHandler 口径一致）。 */
    private boolean isProductionProfile() {
        String[] activeProfiles = environment.getActiveProfiles();
        if (activeProfiles == null || activeProfiles.length == 0) {
            // 无显式 profile 时按默认 profile 判断（spring.profiles.default）
            activeProfiles = environment.getDefaultProfiles();
        }
        for (String profile : activeProfiles) {
            if ("prod".equals(profile) || "real".equals(profile)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 调用微信 jscode2session 接口，用临时登录凭证 code 换取 openid 和 session_key。
     *
     * <p>Task 2.3.3：通过 Resilience4j 注解组合实现外部依赖韧性：</p>
     * <ul>
     *   <li>{@code @CircuitBreaker(wechatApi)}：连续失败超阈值时熔断 30s，
     *       避免微信 API 故障时持续打垮登录链路；半开后试探 3 次请求。</li>
     *   <li>{@code @Retry(wechatApi)}：网络抖动 / 临时 5xx 自动重试 2 次（共 3 次），
     *       指数退避 500ms→1s→2s；业务异常 WeChatAuthException 不重试。</li>
     *   <li>{@code @RateLimiter(wechatApi)}：每秒最多 10 次调用，
     *       避免突发流量触发微信侧 QPS 限制。</li>
     * </ul>
     *
     * <p>fallback 方法 {@link #code2SessionFallback(String, Throwable)} 在熔断打开 /
     * 重试耗尽时返回 null，由 {@link com.campuslove.api.auth.RealAuthService} 转换为
     * WechatLoginError.WECHAT_API_ERROR 返回客户端，不阻塞登录链路。</p>
     *
     * @param code 微信小程序登录凭证
     * @return 包含 openid 和 session_key 的响应对象；熔断 / 重试耗尽时返回 null
     * @throws WeChatAuthException 当微信接口返回错误码时抛出（不触发熔断 / 重试）
     */
    @CircuitBreaker(name = Resilience4jConfig.WECHAT_API_BACKEND, fallbackMethod = "code2SessionFallback")
    @Retry(name = Resilience4jConfig.WECHAT_API_BACKEND)
    @RateLimiter(name = Resilience4jConfig.WECHAT_API_BACKEND)
    public WeChatSessionResponse code2Session(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("WeChat login code must not be blank");
        }

        // P0-33 修复（2026-08-08）：本地联调 dev 降级——
        // WECHAT_APPID/WECHAT_SECRET 未配置（本地/CI 环境）时微信 API 必然失败
        // （errcode=41002 appid missing → 502），微信登录按钮不可用。
        // 开启 app.wechat.dev-fallback-enabled（WECHAT_DEV_FALLBACK_ENABLED=true）
        // 后按 code 派生固定 openid（dev-wechat-{code}），走正常登录/注册链路，
        // 与 ADMIN_OPENID 本地联调体系对齐。生产环境必须保持关闭。
        if (weChatConfig.isDevFallbackEnabled()) {
            log.warn("WeChat dev-fallback 生效（WECHAT_DEV_FALLBACK_ENABLED=true，仅限本地联调）: code={}",
                    SensitiveDataMasker.maskToken(code));
            WeChatSessionResponse devResp = new WeChatSessionResponse();
            devResp.setOpenid("dev-wechat-" + code);
            devResp.setSessionKey("dev-session-key");
            return devResp;
        }

        String url = jscode2sessionBaseUrl + JSCODE2SESSION_QUERY;
        // URI 变量由 RestClient 自动 URL 编码，避免直接字符串拼接导致的特殊字符注入风险
        Map<String, String> uriVariables = Map.of(
                "appId", weChatConfig.getAppId(),
                "appSecret", weChatConfig.getAppSecret(),
                "code", code);

        try {
            WeChatSessionResponse response = restClient.get()
                    .uri(url, uriVariables)
                    .retrieve()
                    .body(WeChatSessionResponse.class);

            if (response == null) {
                throw new WeChatAuthException("Empty response from WeChat API");
            }

            if (response.getErrcode() != null && response.getErrcode() != 0) {
                log.error("WeChat jscode2session error: errcode={}, errmsg={}",
                        response.getErrcode(), response.getErrmsg());
                throw new WeChatAuthException(
                        "WeChat auth failed: " + response.getErrmsg(),
                        response.getErrcode());
            }

            if (response.getOpenid() == null || response.getOpenid().isBlank()) {
                throw new WeChatAuthException("WeChat auth returned empty openid");
            }

            return response;
        } catch (WeChatAuthException ex) {
            throw ex;
        } catch (RestClientException ex) {
            log.error("Failed to call WeChat jscode2session API", ex);
            throw new WeChatAuthException("Network error calling WeChat API: " + ex.getMessage(), ex);
        }
    }

    /**
     * Task 2.3.3：{@link #code2Session(String)} 的 fallback 方法。
     *
     * <p>触发场景：
     * <ul>
     *   <li>熔断器打开（CircuitBreaker OPEN）：直接调用 fallback，不发起下游请求</li>
     *   <li>重试耗尽（Retry exhausted）：3 次重试后仍失败，调用 fallback 返回</li>
     *   <li>限流器拒绝（RateLimiter permits exhausted）：直接调用 fallback</li>
     * </ul>
     * </p>
     *
     * <p>降级策略：返回 null，由 {@link com.campuslove.api.auth.RealAuthService}
     * 检测到 null 时转换为 WechatLoginError.WECHAT_API_ERROR，
     * 客户端展示"微信服务暂时不可用，请稍后重试"提示。</p>
     *
     * <p>注意：WeChatAuthException（业务异常，如 errcode != 0）已通过 yml 中
     * {@code ignore-exceptions} 配置排除在熔断 / 重试之外，不会触发此 fallback。</p>
     *
     * @param code 微信小程序登录凭证（与原方法签名一致，Resilience4j 自动透传）
     * @param ex   触发 fallback 的异常（CircuitBreakerOpenException / Retry exhausted 等）
     * @return 始终返回 null，由调用方处理降级
     */
    private WeChatSessionResponse code2SessionFallback(String code, Throwable ex) {
        // infra R2-00227: 日志中的 code（临时登录凭证）脱敏，避免凭证泄露
        log.warn("WeChat jscode2session 调用降级: code={}, errorType={}, message={}",
                SensitiveDataMasker.maskToken(code), ex.getClass().getSimpleName(), ex.getMessage());
        return null;
    }

    /**
     * 微信 jscode2session 接口响应体。
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WeChatSessionResponse {

        @JsonProperty("openid")
        private String openid;

        @JsonProperty("session_key")
        private String sessionKey;

        @JsonProperty("unionid")
        private String unionid;

        @JsonProperty("errcode")
        private Integer errcode;

        @JsonProperty("errmsg")
        private String errmsg;

        public String getOpenid() {
            return openid;
        }

        public void setOpenid(String openid) {
            this.openid = openid;
        }

        public String getSessionKey() {
            return sessionKey;
        }

        public void setSessionKey(String sessionKey) {
            this.sessionKey = sessionKey;
        }

        public String getUnionid() {
            return unionid;
        }

        public void setUnionid(String unionid) {
            this.unionid = unionid;
        }

        public Integer getErrcode() {
            return errcode;
        }

        public void setErrcode(Integer errcode) {
            this.errcode = errcode;
        }

        public String getErrmsg() {
            return errmsg;
        }

        public void setErrmsg(String errmsg) {
            this.errmsg = errmsg;
        }
    }

    /**
     * 微信认证异常。
     */
    public static class WeChatAuthException extends RuntimeException {

        private final Integer errcode;

        public WeChatAuthException(String message) {
            super(message);
            this.errcode = null;
        }

        public WeChatAuthException(String message, Integer errcode) {
            super(message);
            this.errcode = errcode;
        }

        public WeChatAuthException(String message, Throwable cause) {
            super(message, cause);
            this.errcode = null;
        }

        public Integer getErrcode() {
            return errcode;
        }
    }
}
