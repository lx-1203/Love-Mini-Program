package com.campuslove.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 微信小程序配置属性。
 * 绑定 application.yml 中 app.wechat.* 前缀的配置项。
 */
@ConfigurationProperties(prefix = "app.wechat")
public class WeChatConfig {

    /**
     * 微信小程序 AppID。
     */
    private String appId;

    /**
     * 微信小程序 AppSecret。
     */
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
}
