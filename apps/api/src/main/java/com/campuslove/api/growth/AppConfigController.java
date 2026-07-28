package com.campuslove.api.growth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 应用配置控制器。
 *
 * <p>提供前端启动期所需的静态配置查询端点，例如登录页 Hero 图配置。
 * 配置项由管理后台维护，前端按需拉取以驱动首屏渲染。</p>
 */
@RestController
@RequestMapping("/api/v1/app-config")
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
