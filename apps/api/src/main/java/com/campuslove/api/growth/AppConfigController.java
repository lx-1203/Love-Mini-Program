package com.campuslove.api.growth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/app-config")
public class AppConfigController {

  private final AppConfigService appConfigService;

  public AppConfigController(AppConfigService appConfigService) {
    this.appConfigService = appConfigService;
  }

  @GetMapping("/login-hero")
  public LoginHeroConfigView getLoginHero() {
    return appConfigService.getLoginHeroConfig();
  }
}
