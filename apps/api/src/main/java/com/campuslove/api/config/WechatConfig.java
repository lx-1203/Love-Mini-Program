package com.campuslove.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * 微信小程序配置，从 application.yml 中 wechat.miniapp 前缀读取。
 * 环境变量覆盖：WECHAT_APP_ID / WECHAT_APP_SECRET。
 */
@Configuration
@ConfigurationProperties(prefix = "wechat.miniapp")
public class WechatConfig {

    /** 微信小程序 AppID */
    private String appId;

    /** 微信小程序 AppSecret（服务端保密） */
    private String appSecret;

    public String getAppId() {
        return appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public String getAppSecret() {
        return appSecret;
    }

    public void setAppSecret(String appSecret) {
        this.appSecret = appSecret;
    }

    /**
     * 提供 RestTemplate bean，供 WechatService 等使用。
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}