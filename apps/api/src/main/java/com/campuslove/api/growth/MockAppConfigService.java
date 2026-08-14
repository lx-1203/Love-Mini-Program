package com.campuslove.api.growth;

import com.campuslove.api.mock.MockRuntimeState;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 应用配置服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟配置。
 */
@Profile("mock")
@Service
public class MockAppConfigService implements AppConfigService {

    /** 默认站点标题（与 Flyway seed 的 app_config.site.title 一致） */
    private static final String DEFAULT_SITE_TITLE = "校园恋爱";

    private final MockRuntimeState runtimeState;

    public MockAppConfigService(MockRuntimeState runtimeState) {
        this.runtimeState = runtimeState;
    }

    @Override
    public LoginHeroConfigView getLoginHeroConfig() {
        MockRuntimeState.LoginHeroData loginHero = runtimeState.loginHero();

        return new LoginHeroConfigView(
            loginHero.heroMode(),
            loginHero.heroVideoUrl(),
            loginHero.heroPosterUrl(),
            loginHero.heroAnimationTheme(),
            loginHero.heroTitle(),
            loginHero.heroSubtitle(),
            loginHero.videoFallbackToAnimation()
        );
    }

    /**
     * Mock 模式客户端配置聚合：全部开关默认开启（维护模式关闭），
     * 规则使用内置默认值（与 real 模式 DB 降级语义一致），保证 mock 端功能不收敛。
     *
     * @return 客户端配置聚合视图（全开默认值）
     */
    @Override
    public AppConfigView getClientConfig() {
        Map<String, Boolean> switches = new LinkedHashMap<>();
        switches.put(SWITCH_MAINTENANCE_MODE, Boolean.FALSE);
        switches.put(SWITCH_REGISTER_OPEN, Boolean.TRUE);
        switches.put(SWITCH_LOGIN_OPEN, Boolean.TRUE);
        switches.put(SWITCH_MATCH_OPEN, Boolean.TRUE);
        switches.put(SWITCH_RECOMMEND_OPEN, Boolean.TRUE);
        switches.put(SWITCH_POST_PUBLISH_OPEN, Boolean.TRUE);
        switches.put(SWITCH_FEEDBACK_OPEN, Boolean.TRUE);

        Map<String, Integer> rules = new LinkedHashMap<>();
        rules.put(RULE_DAILY_RECOMMEND_LIMIT, 10);
        rules.put(RULE_HEART_SIGNAL_EXPIRE_HOURS, 48);

        return new AppConfigView(switches, rules, DEFAULT_SITE_TITLE);
    }

    /**
     * Mock 模式功能开关恒为开启（true），保证 mock 端业务强制点不拦截。
     *
     * @param switchKey 开关键（mock 下忽略）
     * @return true（始终开启）
     */
    @Override
    public boolean isSwitchEnabled(String switchKey) {
        return true;
    }
}
