package com.campuslove.api.service;

import com.campuslove.api.config.WechatConfig;
import com.campuslove.api.dto.WechatSession;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * 微信小程序服务，封装 code2Session 调用。
 * 当 appId 以 "wx_test_" 开头时，返回测试 mock openid。
 */
@Service
public class WechatService {

    private static final Logger log = LoggerFactory.getLogger(WechatService.class);

    private static final String CODE2SESSION_URL =
            "https://api.weixin.qq.com/sns/jscode2session"
                    + "?appid={appid}&secret={secret}&js_code={code}&grant_type=authorization_code";

    private final WechatConfig wechatConfig;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public WechatService(WechatConfig wechatConfig, RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.wechatConfig = wechatConfig;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 调用微信 code2Session 接口，用临时 code 换取 openid 和 session_key。
     * 测试模式下（appId 以 "wx_test_" 开头）返回 mock 数据。
     *
     * @param code 小程序端 wx.login() 返回的临时 code
     * @return WechatSession 包含 openid, sessionKey, unionid
     * @throws WechatApiException 当微信返回错误时
     */
    public WechatSession code2Session(String code) throws WechatApiException {
        // 测试模式：appId 以 "wx_test_" 开头时返回 mock openid
        if (wechatConfig.getAppId().startsWith("wx_test_")) {
            log.info("WeChat test mode: returning mock openid for code={}", code);
            return new WechatSession(
                    "mock_openid_" + code.hashCode(),
                    "mock_session_key",
                    null);
        }

        // 真实微信调用
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    CODE2SESSION_URL,
                    String.class,
                    wechatConfig.getAppId(),
                    wechatConfig.getAppSecret(),
                    code);

            JsonNode json = objectMapper.readTree(response.getBody());

            // 检查微信返回的错误
            if (json.has("errcode") && json.get("errcode").asInt() != 0) {
                int errcode = json.get("errcode").asInt();
                String errmsg = json.has("errmsg") ? json.get("errmsg").asText() : "unknown";
                log.error("WeChat code2Session error: errcode={}, errmsg={}", errcode, errmsg);

                throw new WechatApiException(errcode, errmsg);
            }

            String openid = json.get("openid").asText();
            String sessionKey = json.get("session_key").asText();
            String unionid = json.has("unionid") ? json.get("unionid").asText() : null;

            log.info("WeChat code2Session success: openid={}", openid);
            return new WechatSession(openid, sessionKey, unionid);

        } catch (WechatApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("WeChat code2Session failed: {}", e.getMessage(), e);
            throw new WechatApiException(-1, "微信服务调用失败: " + e.getMessage());
        }
    }

    /**
     * 微信 API 异常。
     */
    public static class WechatApiException extends Exception {

        private final int errcode;

        public WechatApiException(int errcode, String message) {
            super(message);
            this.errcode = errcode;
        }

        public int getErrcode() {
            return errcode;
        }
    }
}