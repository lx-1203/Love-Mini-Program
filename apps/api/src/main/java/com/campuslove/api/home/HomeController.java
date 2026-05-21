package com.campuslove.api.home;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home")
public class HomeController {

  private final HomeService homeService;

  public HomeController(HomeService homeService) {
    this.homeService = homeService;
  }

  @GetMapping("/dashboard")
  public HomeDashboardView getDashboard() {
    return homeService.getDashboard();
  }
}

/** 首页仪表盘响应: { scheduleSummary, recommendations, matchStatus } */
record HomeDashboardView(
    HomeCardView scheduleSummary,
    List<RecommendedPersonSummaryView> recommendations,
    String matchStatus
) {
}

record HomeCardView(
    String id,
    String title,
    String subtitle,
    String meta,
    String actionLabel
) {
}

/** 推荐用户摘要卡片 */
record RecommendedPersonSummaryView(
    String id,
    String name,
    String initials,
    String reason,
    String school,
    String grade
) {
}