package com.campuslove.api.growth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 应用配置控制器。
 *
 * <p>提供前端启动期所需的静态配置查询端点，例如登录页 Hero 图配置、
 * 客户端配置聚合（维护模式 / 功能开关 / 站点标题）。配置项由管理后台维护，
 * 前端按需拉取以驱动首屏渲染。SecurityConfig 已对 /api/v1/app-config/** 放行。</p>
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

  /**
   * 获取客户端配置聚合视图（B6：后台配置即时生效，前后端联动）。
   *
   * <p>返回 {@code {switches: {...}, rules: {...}, siteTitle: "..."}} 扁平结构，
   * 小程序端启动期 / 切 Tab 时按 TTL 拉取。数据源为 app_switch / app_rule /
   * app_config 三张表，不缓存——管理后台更新后客户端下一次拉取即为最新值。
   * 数据库异常时服务端降级为内置默认值，保证客户端首屏可用。</p>
   *
   * @return 客户端配置聚合视图
   */
  @GetMapping
  public AppConfigView getAppConfig() {
    return appConfigService.getClientConfig();
  }
}
