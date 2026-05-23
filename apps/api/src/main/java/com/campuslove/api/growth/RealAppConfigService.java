package com.campuslove.api.growth;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 真实应用配置服务实现。
 * 在 real profile 下激活，Phase 2 将使用 Repository 实现数据库查询。
 */
@Profile("real")
@Service
public class RealAppConfigService implements AppConfigService {

    // TODO: Phase 2 - 注入 AppConfigRepository 等

    @Override
    public LoginHeroConfigView getLoginHeroConfig() {
        // 返回默认登录页主视觉配置
        // 后续可通过数据库或配置中心动态管理
        return new LoginHeroConfigView(
            "animation",        // heroMode: 使用动画模式
            null,               // heroVideoUrl: 无视频
            null,               // heroPosterUrl: 无海报
            "romantic",         // heroAnimationTheme: 浪漫主题
            "遇见对的人",        // heroTitle
            "校园恋爱，从这里开始", // heroSubtitle
            true                // videoFallbackToAnimation: 视频失败回退到动画
        );
    }
}
