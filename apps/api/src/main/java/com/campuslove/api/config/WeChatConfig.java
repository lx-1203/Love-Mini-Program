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

    /**
     * 本地联调降级开关（P0-33 修复）：WECHAT_APPID/WECHAT_SECRET 未配置时
     * 微信登录必然 502；开启后 code2Session 按 code 派生固定 openid（dev-wechat-{code}），
     * 走正常登录/注册链路。生产环境必须保持关闭（默认 false）。
     */
    private boolean devFallbackEnabled = false;

    public boolean isDevFallbackEnabled() {
        return devFallbackEnabled;
    }

    public void setDevFallbackEnabled(boolean devFallbackEnabled) {
        this.devFallbackEnabled = devFallbackEnabled;
    }

    /**
     * 社交摘要推送模板ID。
     */
    private String socialDigestTemplateId = "";

    /**
     * 推荐刷新推送模板ID。
     */
    private String recommendRefreshTemplateId = "";

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

    public String getSocialDigestTemplateId() {
        return socialDigestTemplateId;
    }

    public void setSocialDigestTemplateId(String socialDigestTemplateId) {
        this.socialDigestTemplateId = socialDigestTemplateId;
    }

    public String getRecommendRefreshTemplateId() {
        return recommendRefreshTemplateId;
    }

    public void setRecommendRefreshTemplateId(String recommendRefreshTemplateId) {
        this.recommendRefreshTemplateId = recommendRefreshTemplateId;
    }
}
