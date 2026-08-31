package com.campuslove.api.home;

import com.campuslove.api.config.SecurityUtils;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 首页控制器。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/v1/home")
public class HomeController {

  private final HomeService homeService;

  public HomeController(HomeService homeService) {
    this.homeService = homeService;
  }

  /**
   * 首页「换一位」：只更换今日推荐，不记录跳过、不消耗寻觅额度。
   */
  @PostMapping("/today-recommendation/rotate")
  public TodayRecommendationView rotateTodayRecommendation() {
    Long userId = SecurityUtils.getCurrentUserId();
    return homeService.rotateTodayRecommendation(userId);
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
    ActivityPreviewView activityPreview,
    MatchCenterView matchCenter,
    HomeFeedView homeFeed
) {
}

/**
 * 匹配中心聚合视图（legacy：进入兼容期，不再新增首页字段）。
 */
record MatchCenterView(
    QuotaView quota,
    int onlineCount,
    RelationProgressView relation
) {
}

record QuotaView(int dailyLimit, int used, int remaining) {
}

record RelationProgressView(int crushing, int matched, int whispers) {
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

/** 首页 Feed 契约（寻觅 v3：首页 = 今日恋爱首页，非匹配中心）。 */
record HomeFeedView(
    TodayRecommendationView todayRecommendation,
    LoveProgressView loveProgress,
    RelationActivityView relationActivity,
    List<InterestCircleSummaryView> interestRecommendations,
    List<NearbyPersonSummaryView> nearbyPeople,
    List<CommunityPostSummaryView> communityPosts
) {
}

record TodayRecommendationView(
    Long userId,
    String name,
    Integer age,
    String campusName,
    String gradeLabel,
    List<String> tags,
    String bio,
    String expectation,
    String distanceText,
    boolean certified,
    boolean online,
    int matchScore,
    String photoUrl,
    String constellation
) {
}

record LoveProgressView(int completed, int total, List<LoveProgressStepView> steps) {
}

record LoveProgressStepView(
    String id,
    String title,
    String description,
    boolean completed,
    String action
) {
}

record RelationActivityView(
    int likesReceived,
    int whispers,
    int visitors,
    int newMatches,
    int totalUnread,
    java.util.List<String> likesAvatars,
    java.util.List<String> whisperAvatars,
    java.util.List<String> visitorAvatars,
    java.util.List<String> matchAvatars
) {
}

record InterestCircleSummaryView(
    Long id,
    String name,
    String icon,
    int memberCount,
    boolean joined
) {
}

record NearbyPersonSummaryView(
    Long userId,
    String name,
    String distanceText,
    String avatarUrl,
    boolean online,
    List<String> commonInterests
) {
}

record CommunityPostSummaryView(
    Long id,
    Long authorId,
    String authorName,
    String authorAvatar,
    String circleName,
    String timeText,
    String content,
    List<String> images,
    int likeCount,
    int commentCount
) {
}
