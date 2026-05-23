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

  /**
   * 获取首页仪表盘数据。
   * 支持传入 userId 以获取个性化推荐数据，userId 为可选参数。
   */
  @GetMapping("/dashboard")
  public HomeDashboardView getDashboard(
      @org.springframework.web.bind.annotation.RequestParam(name = "userId", required = false) Long userId) {
    return homeService.getDashboard(userId);
  }
}

record HomeDashboardView(
    HomeCardView scheduleSummary,
    List<HomeCardView> freeSlots,
    HomeCardView aiPlan,
    List<RecommendedPersonSummaryView> recommendedPeople,
    String peopleLead,
    ActivityPreviewView activityPreview
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

record RecommendedPersonSummaryView(
    String id,
    String name,
    String initials,
    String headline,
    String commonGround,
    String availability
) {
}

record ActivityPreviewView(
    String title,
    String subtitle,
    String actionLabel,
    List<ActivityPreviewItemView> items,
    String pulseTitle,
    String pulseMeta
) {
}

record ActivityPreviewItemView(
    String id,
    String title,
    String subtitle,
    String meta
) {
}
