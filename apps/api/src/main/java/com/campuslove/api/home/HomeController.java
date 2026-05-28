package com.campuslove.api.home;

import com.campuslove.api.config.SecurityUtils;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 首页控制器。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/home")
public class HomeController {

  private final HomeService homeService;

  public HomeController(HomeService homeService) {
    this.homeService = homeService;
  }

  /**
   * 获取首页仪表盘数据。
   * 从JWT认证上下文获取用户ID以提供个性化推荐数据。
   */
  @GetMapping("/dashboard")
  public HomeDashboardView getDashboard() {
    Long userId = SecurityUtils.getCurrentUserId();
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
