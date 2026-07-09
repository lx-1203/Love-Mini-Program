package com.campuslove.api.growth;

import com.campuslove.api.config.WeChatConfig;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 微信订阅消息推送服务。
 * 仅在 real profile 下激活，负责调用微信订阅消息接口。
 */
@Component
@Profile("real")
public class WeChatPushService {

    private static final Logger log = LoggerFactory.getLogger(WeChatPushService.class);

    private static final String ACCESS_TOKEN_URL =
            "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appId}&secret={appSecret}";

    private static final String SUBSCRIBE_MESSAGE_URL =
            "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={accessToken}";

    private final WeChatConfig weChatConfig;
    private final RestClient restClient;

    /** 缓存 access_token，有效期 2 小时 */
    private String cachedAccessToken;
    private long tokenExpireTime = 0;

    public WeChatPushService(WeChatConfig weChatConfig, RestClient.Builder restClientBuilder) {
        this.weChatConfig = weChatConfig;
        this.restClient = restClientBuilder.build();
    }

    /**
     * 获取微信 access_token，带缓存。
     *
     * @return access_token 字符串
     */
    public String getAccessToken() {
        long now = System.currentTimeMillis();
        if (cachedAccessToken != null && now < tokenExpireTime) {
            return cachedAccessToken;
        }

        String url = ACCESS_TOKEN_URL
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

            cachedAccessToken = response.getAccessToken();
            // 提前 5 分钟过期，避免边界情况
            tokenExpireTime = now + (response.getExpiresIn() - 300) * 1000L;
            log.info("WeChat access_token refreshed, expires_in={}", response.getExpiresIn());
            return cachedAccessToken;
        } catch (Exception ex) {
            log.error("Failed to call WeChat access_token API", ex);
            return null;
        }
    }

    /**
     * 发送订阅消息。
     *
     * @param openId     用户 openid
     * @param templateId 模板 ID
     * @param page       跳转页面路径
     * @param data       模板数据
     * @return 是否发送成功
     */
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

        String url = SUBSCRIBE_MESSAGE_URL.replace("{accessToken}", accessToken);

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

            log.info("Subscribe message sent successfully to {}", openId);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send subscribe message to {}", openId, ex);
            return false;
        }
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
    public boolean sendSocialDigestPush(String openId, long visitorCount, long likeCount,
                                         long interactionCount) {
        String templateId = weChatConfig.getSocialDigestTemplateId();
        if (templateId == null || templateId.isBlank()) {
            log.warn("Social digest template ID not configured, skip push");
            return false;
        }

        Map<String, TemplateDataItem> data = new HashMap<>();
        data.put("thing1", new TemplateDataItem("校园恋爱"));
        data.put("thing2", new TemplateDataItem(buildDigestContent(visitorCount, likeCount, interactionCount)));
        data.put("time3", new TemplateDataItem(java.time.LocalDateTime.now()
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
    public boolean sendRecommendRefreshPush(String openId, long recommendCount) {
        String templateId = weChatConfig.getRecommendRefreshTemplateId();
        if (templateId == null || templateId.isBlank()) {
            log.warn("Recommend refresh template ID not configured, skip push");
            return false;
        }

        Map<String, TemplateDataItem> data = new HashMap<>();
        data.put("thing1", new TemplateDataItem("校园恋爱"));
        data.put("number2", new TemplateDataItem(String.valueOf(recommendCount)));
        data.put("time3", new TemplateDataItem(java.time.LocalDateTime.now()
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
