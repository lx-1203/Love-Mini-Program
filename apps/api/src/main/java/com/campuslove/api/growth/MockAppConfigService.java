package com.campuslove.api.growth;

import com.campuslove.api.runtime.MockRuntimeState;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 应用配置服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟配置。
 */
@Profile("mock")
@Service
public class MockAppConfigService implements AppConfigService {

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
}
