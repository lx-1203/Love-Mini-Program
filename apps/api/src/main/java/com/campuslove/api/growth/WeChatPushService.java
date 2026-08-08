package com.campuslove.api.growth;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.Resilience4jConfig;
import com.campuslove.api.config.WeChatConfig;
import com.campuslove.api.utils.SensitiveDataMasker;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 微信订阅消息推送服务。
 * 仅在 real profile 下激活，负责调用微信订阅消息接口。
 *
 * <p>日志脱敏（P0 CRITICAL FIN-00001/00002 Task 1.2）：
 * 所有日志输出中的 openId 均通过 {@link SensitiveDataMasker#mask(String)} 脱敏，
 * 避免日志文件、APM 链路追踪、异常堆栈中泄露用户身份标识。</p>
 */
@Component
@Profile("real")
public class WeChatPushService {

    private static final Logger log = LoggerFactory.getLogger(WeChatPushService.class);

    /**
     * R4-01812：access_token 提前过期余量（秒）。
     * 微信默认 expires_in=7200，提前 300 秒刷新，避免边界失效。
     */
    private static final int ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 300;

    /**
     * access_token 接口 URL（R4-00353 外部化配置）。
     * 默认微信官方地址，可通过 {@code app.wechat.access-token-url} 覆盖
     * （如内网代理/沙箱环境）。
     */
    @org.springframework.beans.factory.annotation.Value("${app.wechat.access-token-url:https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appId}&secret={appSecret}}")
    private String accessTokenUrl;

    /**
     * 订阅消息发送 URL（R4-00353 外部化配置）。
     * 默认微信官方地址，可通过 {@code app.wechat.subscribe-message-url} 覆盖。
     */
    @org.springframework.beans.factory.annotation.Value("${app.wechat.subscribe-message-url:https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={accessToken}}")
    private String subscribeMessageUrl;

    private final WeChatConfig weChatConfig;
    private final RestClient restClient;

    /**
     * 缓存 access_token，有效期 2 小时。
     *
     * <p>Task 2.3.4：声明为 {@code volatile} 以保证多线程可见性。
     * {@code getAccessToken()} 使用 synchronized + 双重检查锁定模式：
     * 进入 synchronized 块前先读 {@code cachedAccessToken}（快速路径），
     * 通过 volatile 的 happens-before 语义确保读到的是最新写入值，
     * 避免线程长时间持有锁，同时避免 JVM 重排序导致的"半初始化"读取问题。</p>
     */
    private volatile String cachedAccessToken;
    /**
     * access_token 的过期时间戳（毫秒）。
     * <p>Task 2.3.4：声明为 {@code volatile}，与 {@link #cachedAccessToken} 同步更新，
     * 保证双重检查锁定中读到的过期时间与 token 是同一写入者发布的值。</p>
     */
    private volatile long tokenExpireTime = 0;

    public WeChatPushService(WeChatConfig weChatConfig, RestClient.Builder restClientBuilder) {
        this.weChatConfig = weChatConfig;
        this.restClient = restClientBuilder.build();
    }

    /**
     * 获取微信 access_token，带缓存（线程安全）。
     *
     * <p>Task 2.3.3：通过 Resilience4j 注解组合实现外部依赖韧性：</p>
     * <ul>
     *   <li>{@code @CircuitBreaker(wechatApi)}：连续失败超阈值时熔断 30s，避免持续打微信接口</li>
     *   <li>{@code @Retry(wechatApi)}：网络抖动自动重试 2 次（共 3 次），指数退避 500ms→1s→2s</li>
     *   <li>{@code @RateLimiter(wechatApi)}：每秒最多 10 次调用，避免突发触发微信侧 QPS 限制</li>
     * </ul>
     *
     * <p>fallback 方法 {@link #getAccessTokenFallback(Throwable)} 在熔断 / 重试耗尽时返回 null，
     * 由 {@link #sendSubscribeMessage} 检测到 null 时跳过推送，不影响业务主流程。</p>
     *
     * @return access_token 字符串；熔断 / 重试耗尽时返回 null
     */
    @CircuitBreaker(name = Resilience4jConfig.WECHAT_API_BACKEND, fallbackMethod = "getAccessTokenFallback")
    @Retry(name = Resilience4jConfig.WECHAT_API_BACKEND)
    @RateLimiter(name = Resilience4jConfig.WECHAT_API_BACKEND)
    public synchronized String getAccessToken() {
        long now = System.currentTimeMillis();
        // 双重检查：快速路径避免不必要的同步等待
        if (cachedAccessToken != null && now < tokenExpireTime) {
            return cachedAccessToken;
        }

        String url = accessTokenUrl
                .replace("{appId}", weChatConfig.getAppId())
                .replace("{appSecret}", weChatConfig.getAppSecret());

        try {
            AccessTokenResponse response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(AccessTokenResponse.class);

            if (response == null || response.getAccessToken() == null) {
                log.error("Failed to get WeChat access_token: empty response");
                return null;
            }

            if (response.getErrcode() != null && response.getErrcode() != 0) {
                log.error("WeChat access_token error: errcode={}, errmsg={}",
                        response.getErrcode(), response.getErrmsg());
                return null;
            }

            // 双重检查：获取 token 前再次确认缓存未被其他线程更新
            long nowAfterFetch = System.currentTimeMillis();
            if (cachedAccessToken != null && nowAfterFetch < tokenExpireTime) {
                log.debug("WeChat access_token 已被其他线程刷新，复用缓存");
                return cachedAccessToken;
            }

            cachedAccessToken = response.getAccessToken();
            // R4-00354：expires_in 判空兜底（微信异常响应缺该字段时按默认 7200s 计算），
            // 避免 Integer 拆箱 NPE；R4-01812：提前 300 秒过期避免边界情况
            int expiresIn = response.getExpiresIn() != null ? response.getExpiresIn() : 7200;
            tokenExpireTime = nowAfterFetch + (expiresIn - ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS) * 1000L;
            log.info("WeChat access_token refreshed, expires_in={}", expiresIn);
            return cachedAccessToken;
        } catch (RestClientException ex) {
            log.error("Failed to call WeChat access_token API", ex);
            return null;
        }
    }

    /**
     * Task 2.3.3：{@link #getAccessToken()} 的 fallback 方法。
     *
     * <p>触发场景：熔断器打开 / 重试耗尽 / 限流器拒绝。
     * 降级策略：返回 null，由 {@link #sendSubscribeMessage} 检测到 null 时跳过推送，
     * 业务主流程不受影响（订阅消息推送失败不应阻塞用户操作）。</p>
     *
     * @param ex 触发 fallback 的异常
     * @return 始终返回 null
     */
    private String getAccessTokenFallback(Throwable ex) {
        log.warn("WeChat access_token 调用降级: errorType={}, message={}",
                ex.getClass().getSimpleName(), ex.getMessage());
        return null;
    }

    /**
     * 发送订阅消息。
     *
     * <p>Task 2.3.3：通过 Resilience4j 注解组合实现外部依赖韧性：</p>
     * <ul>
     *   <li>{@code @CircuitBreaker(wechatApi)}：连续失败超阈值时熔断 30s</li>
     *   <li>{@code @Retry(wechatApi)}：网络抖动自动重试 2 次，指数退避 500ms→1s→2s</li>
     *   <li>{@code @RateLimiter(wechatApi)}：每秒最多 10 次调用</li>
     * </ul>
     *
     * <p>fallback 方法 {@link #sendSubscribeMessageFallback(String, String, String, Map, Throwable)}
     * 在熔断 / 重试耗尽时返回 false，业务方检测到 false 时记录日志，不影响主流程。</p>
     *
     * @param openId     用户 openid
     * @param templateId 模板 ID
     * @param page       跳转页面路径
     * @param data       模板数据
     * @return 是否发送成功；熔断 / 重试耗尽时返回 false
     */
    @Transactional
    @CircuitBreaker(name = Resilience4jConfig.WECHAT_API_BACKEND,
            fallbackMethod = "sendSubscribeMessageFallback")
    @Retry(name = Resilience4jConfig.WECHAT_API_BACKEND)
    @RateLimiter(name = Resilience4jConfig.WECHAT_API_BACKEND)
    public boolean sendSubscribeMessage(String openId, String templateId, String page,
                                         Map<String, TemplateDataItem> data) {
        String accessToken = getAccessToken();
        if (accessToken == null) {
            log.error("Cannot send subscribe message: access_token is null");
            return false;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("touser", openId);
        body.put("template_id", templateId);
        body.put("page", page);
        body.put("data", data);

        String url = subscribeMessageUrl.replace("{accessToken}", accessToken);

        try {
            SubscribeMessageResponse response = restClient.post()
                    .uri(url)
                    .body(body)
                    .retrieve()
                    .body(SubscribeMessageResponse.class);

            if (response == null) {
                log.error("Empty response from subscribe message API");
                return false;
            }

            if (response.getErrcode() != null && response.getErrcode() != 0) {
                log.error("Subscribe message error: errcode={}, errmsg={}",
                        response.getErrcode(), response.getErrmsg());
                return false;
            }

            log.info("Subscribe message sent successfully to openId={}",
                    SensitiveDataMasker.mask(openId));
            return true;
        } catch (RestClientException ex) {
            log.error("Failed to send subscribe message to openId={}",
                    SensitiveDataMasker.mask(openId), ex);
            return false;
        }
    }

    /**
     * Task 2.3.3：{@link #sendSubscribeMessage(String, String, String, Map)} 的 fallback 方法。
     *
     * <p>触发场景：熔断器打开 / 重试耗尽 / 限流器拒绝。
     * 降级策略：返回 false，由调用方记录"推送失败"日志，不影响用户主流程
     * （社交动态摘要 / 推荐刷新推送均为辅助功能，失败不阻塞核心业务）。</p>
     *
     * @param openId     用户 openid（与原方法签名一致）
     * @param templateId 模板 ID
     * @param page       跳转页面路径
     * @param data       模板数据
     * @param ex         触发 fallback 的异常
     * @return 始终返回 false
     */
    private boolean sendSubscribeMessageFallback(String openId, String templateId, String page,
                                                  Map<String, TemplateDataItem> data, Throwable ex) {
        log.warn("WeChat subscribe message 调用降级: openId={}, templateId={}, errorType={}, message={}",
                SensitiveDataMasker.mask(openId), templateId, ex.getClass().getSimpleName(), ex.getMessage());
        return false;
    }

    /**
     * 获取社交动态推送模板 ID（FIN-00048 修复）。
     *
     * <p>暴露给 {@code mq.NotificationConsumer} 用于在调用微信订阅消息前
     * 显式校验 templateId 是否已配置（未配置时跳过推送并告警），
     * 避免静默空模板发送。</p>
     *
     * @return 社交动态模板 ID，未配置时为空字符串
     */
    public String getSocialDigestTemplateId() {
        return weChatConfig.getSocialDigestTemplateId();
    }

    /**
     * 发送社交动态摘要推送。
     *
     * @param openId           用户 openid
     * @param visitorCount     访客数
     * @param likeCount        喜欢数
     * @param interactionCount 互动数
     * @return 是否发送成功
     */
    @Transactional
    public boolean sendSocialDigestPush(String openId, long visitorCount, long likeCount,
                                         long interactionCount) {        String templateId = weChatConfig.getSocialDigestTemplateId();
        if (templateId == null || templateId.isBlank()) {
            log.warn("Social digest template ID not configured, skip push");
            return false;
        }

        Map<String, TemplateDataItem> data = new HashMap<>();
        data.put("thing1", new TemplateDataItem("校园恋爱"));
        data.put("thing2", new TemplateDataItem(buildDigestContent(visitorCount, likeCount, interactionCount)));
        data.put("time3", new TemplateDataItem(java.time.LocalDateTime.now(TimeZones.BUSINESS)
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))));

        return sendSubscribeMessage(openId, templateId, "/pages/likes/index", data);
    }

    /**
     * 发送推荐刷新推送。
     *
     * @param openId          用户 openid
     * @param recommendCount  推荐人数
     * @return 是否发送成功
     */
    @Transactional
    public boolean sendRecommendRefreshPush(String openId, long recommendCount) {
        String templateId = weChatConfig.getRecommendRefreshTemplateId();
        if (templateId == null || templateId.isBlank()) {
            log.warn("Recommend refresh template ID not configured, skip push");
            return false;
        }

        Map<String, TemplateDataItem> data = new HashMap<>();
        data.put("thing1", new TemplateDataItem("校园恋爱"));
        data.put("number2", new TemplateDataItem(String.valueOf(recommendCount)));
        data.put("time3", new TemplateDataItem(java.time.LocalDateTime.now(TimeZones.BUSINESS)
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))));

        return sendSubscribeMessage(openId, templateId, "/pages/discover/index", data);
    }

    private String buildDigestContent(long visitorCount, long likeCount, long interactionCount) {
        StringBuilder sb = new StringBuilder();
        if (visitorCount > 0) {
            sb.append(visitorCount).append("人查看了你");
        }
        if (likeCount > 0) {
            if (sb.length() > 0) {
                sb.append("，");
            }
            sb.append(likeCount).append("人喜欢了你");
        }
        if (interactionCount > 0) {
            if (sb.length() > 0) {
                sb.append("，");
            }
            sb.append("帖子获得").append(interactionCount).append("次互动");
        }
        if (sb.length() == 0) {
            sb.append("暂无新动态");
        }
        return sb.toString();
    }

    /**
     * 订阅消息模板数据项。
     */
    public static class TemplateDataItem {
        private String value;

        public TemplateDataItem(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }

    /**
     * access_token 响应体。
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class AccessTokenResponse {
        @JsonProperty("access_token")
        private String accessToken;

        @JsonProperty("expires_in")
        private Integer expiresIn;

        @JsonProperty("errcode")
        private Integer errcode;

        @JsonProperty("errmsg")
        private String errmsg;

        public String getAccessToken() {
            return accessToken;
        }

        public Integer getExpiresIn() {
            return expiresIn;
        }

        public Integer getErrcode() {
            return errcode;
        }

        public String getErrmsg() {
            return errmsg;
        }
    }

    /**
     * 订阅消息发送响应体。
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class SubscribeMessageResponse {
        @JsonProperty("errcode")
        private Integer errcode;

        @JsonProperty("errmsg")
        private String errmsg;

        public Integer getErrcode() {
            return errcode;
        }

        public String getErrmsg() {
            return errmsg;
        }
    }
}
