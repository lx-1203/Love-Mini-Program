package com.campuslove.api.auth;

import com.campuslove.api.config.WeChatConfig;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 微信小程序登录客户端。
 * 仅在 real profile 下激活，负责调用微信 jscode2session 接口。
 */
@Component
@Profile("real")
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
     * @param code 微信小程序登录凭证
     * @return 包含 openid 和 session_key 的响应对象
     * @throws WeChatAuthException 当微信接口返回错误码时抛出
     */
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
        } catch (Exception ex) {
            log.error("Failed to call WeChat jscode2session API", ex);
            throw new WeChatAuthException("Network error calling WeChat API: " + ex.getMessage(), ex);
        }
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
