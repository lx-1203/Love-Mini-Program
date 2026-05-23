package com.campuslove.api.growth;

/**
 * 应用配置服务接口。
 * 提供获取登录主视觉配置等功能。
 */
public interface AppConfigService {

    /**
     * 获取登录主视觉配置。
     *
     * @return 登录主视觉配置视图
     */
    LoginHeroConfigView getLoginHeroConfig();
}
