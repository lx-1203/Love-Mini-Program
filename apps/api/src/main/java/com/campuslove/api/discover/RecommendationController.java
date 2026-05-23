package com.campuslove.api.discover;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 推荐控制器。
 * 提供讨论推荐、活动推荐、推荐偏好、人物推荐等 API。
 * 活动详情和报名功能已迁移至 ActivityController。
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
  public List<RecommendedPersonView> getRecommendations(
          @RequestParam(name = "userId") Long userId) {
    return recommendationService.getRecommendations(userId);
  }

  /**
   * 获取推荐偏好设置（带用户 ID）。
   * GET /api/recommendations/preferences/{userId}
   */
  @GetMapping("/recommendations/preferences/{userId}")
  public RecommendationPreferencesView getPreferencesByUserId(
          @PathVariable("userId") Long userId) {
    return recommendationService.getPreferences(userId);
  }

  /**
   * 保存推荐偏好设置。
   * PUT /api/recommendations/preferences/{userId}
   */
  @PutMapping("/recommendations/preferences/{userId}")
  public RecommendationPreferencesView savePreferences(
          @PathVariable("userId") Long userId,
          @RequestBody SavePreferencesRequest request) {
    return recommendationService.savePreferences(userId, request.preferredTime(), request.scope());
  }

  /**
   * 获取推荐历史。
   * GET /api/recommendations/history
   */
  @GetMapping("/recommendations/history")
  public List<RecommendedPersonView> getHistory(
          @RequestParam(name = "userId") Long userId) {
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
    String scope
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
    String scope
) {}
