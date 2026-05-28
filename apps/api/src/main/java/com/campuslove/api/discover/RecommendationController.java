package com.campuslove.api.discover;

import com.campuslove.api.config.SecurityUtils;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 推荐控制器。
 * 提供讨论推荐、活动推荐、推荐偏好、人物推荐等 API。
 * 活动详情和报名功能已迁移至 ActivityController。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api")
public class RecommendationController {

  private final RecommendationService recommendationService;

  public RecommendationController(RecommendationService recommendationService) {
    this.recommendationService = recommendationService;
  }

  @GetMapping("/recommendations/discussions")
  public List<DiscussionRecommendationView> getDiscussions() {
    return recommendationService.getDiscussions();
  }

  @GetMapping("/recommendations/activities")
  public List<ActivityRecommendationView> getActivities() {
    return recommendationService.getActivities();
  }

  @GetMapping("/recommendations/preferences")
  public RecommendationPreferencesView getPreferences() {
    return recommendationService.getPreferences();
  }

  @PutMapping("/recommendations/preferences")
  public RecommendationPreferencesView updatePreferences(@RequestBody RecommendationPreferencesView prefs) {
    return recommendationService.updatePreferences(prefs);
  }

  // ---- Phase 2 新增：人物推荐端点 ----

  /**
   * 获取推荐人物列表。
   * GET /api/recommendations/people
   */
  @GetMapping("/recommendations/people")
  public List<RecommendedPersonView> getRecommendations() {
    Long userId = SecurityUtils.getCurrentUserId();
    return recommendationService.getRecommendations(userId);
  }

  /**
   * 获取推荐偏好设置。
   * GET /api/recommendations/preferences/me
   */
  @GetMapping("/recommendations/preferences/me")
  public RecommendationPreferencesView getPreferencesByUserId() {
    Long userId = SecurityUtils.getCurrentUserId();
    return recommendationService.getPreferences(userId);
  }

  /**
   * 保存推荐偏好设置。
   * PUT /api/recommendations/preferences/me
   */
  @PutMapping("/recommendations/preferences/me")
  public RecommendationPreferencesView savePreferences(
          @RequestBody SavePreferencesRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    return recommendationService.savePreferences(userId, request.preferredTime(), request.scope(), request.campusPriority());
  }

  /**
   * 获取推荐历史。
   * GET /api/recommendations/history
   */
  @GetMapping("/recommendations/history")
  public List<RecommendedPersonView> getHistory() {
    Long userId = SecurityUtils.getCurrentUserId();
    return recommendationService.getHistory(userId);
  }
}

// ---- Views ----

record DiscussionRecommendationView(
    String id,
    String title,
    String summary,
    String heatLabel
) {
}

record ActivityRecommendationView(
    String id,
    String title,
    String location,
    String scheduleText,
    String description,
    int enrollmentCount,
    List<String> participantAvatars
) {
}

record RecommendationPreferencesView(
    String dailyNotifyTime,
    String scope,
    /** 校园优先：同校用户排序靠前 */
    Boolean campusPriority
) {
}

/**
 * 报名请求体
 */
record EnrollRequest(
    boolean enrolled
) {
}

/**
 * 报名操作响应
 */
record ActivityEnrollmentView(
    String activityId,
    boolean enrolled,
    int enrollmentCount
) {
}

/**
 * 保存偏好请求体
 */
record SavePreferencesRequest(
    String preferredTime,
    String scope,
    /** 校园优先：同校用户推荐权重+30% */
    Boolean campusPriority
) {}
