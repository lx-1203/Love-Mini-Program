package com.campuslove.api.growth;

import com.campuslove.api.runtime.MockRuntimeState;
import org.springframework.stereotype.Service;

@Service
public class AppConfigService {

  private final MockRuntimeState runtimeState;

  public AppConfigService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

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
