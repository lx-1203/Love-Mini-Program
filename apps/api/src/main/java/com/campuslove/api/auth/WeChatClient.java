package com.campuslove.api.auth;

import com.campuslove.api.config.Resilience4jConfig;
import com.campuslove.api.config.WeChatConfig;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 微信小程序登录客户端。
 * 仅在 real profile 下激活，负责调用微信 jscode2session 接口。
 */
@Component
@Profile("real & !dev")
public class WeChatClient {

    private static final Logger log = LoggerFactory.getLogger(WeChatClient.class);
    private static final String JSCODE2SESSION_URL =
            "https://api.weixin.qq.com/sns/jscode2session?appid={appId}&secret={appSecret}"
                    + "&js_code={code}&grant_type=authorization_code";

    private final WeChatConfig weChatConfig;
    private final RestClient restClient;

    public WeChatClient(WeChatConfig weChatConfig, RestClient.Builder restClientBuilder) {
        this.weChatConfig = weChatConfig;
        this.restClient = restClientBuilder.build();
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

        String url = JSCODE2SESSION_URL
                .replace("{appId}", weChatConfig.getAppId())
                .replace("{appSecret}", weChatConfig.getAppSecret())
                .replace("{code}", code);

        try {
            WeChatSessionResponse response = restClient.get()
                    .uri(url)
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
        log.warn("WeChat jscode2session 调用降级: code={}, errorType={}, message={}",
                code, ex.getClass().getSimpleName(), ex.getMessage());
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
