package com.campuslove.api.discover;

import com.campuslove.api.config.SecurityUtils;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
   *
   * <p>Phase B - Task B2 扩展：支持以下查询参数（均为可选）：</p>
   * <ul>
   *   <li>{@code heightMin} / {@code heightMax} —— 身高范围（闭区间）</li>
   *   <li>{@code educationLevel} —— 学历多选（逗号分隔，如 bachelor,master）</li>
   *   <li>{@code relationshipStatus} —— 感情状态多选（逗号分隔）</li>
   *   <li>{@code hometownProvince} / {@code hometownCity} —— 籍贯省/市</li>
   *   <li>{@code futureCity} —— 未来定居城市</li>
   *   <li>{@code keyword} —— 模糊匹配 nickname/bio/interestTags</li>
   * </ul>
   * <p>无参数时返回全部推荐（向后兼容）。</p>
   */
  @GetMapping("/recommendations/people")
  public List<RecommendedPersonView> getRecommendations(
          @RequestParam(value = "heightMin", required = false) Integer heightMin,
          @RequestParam(value = "heightMax", required = false) Integer heightMax,
          @RequestParam(value = "educationLevel", required = false) String educationLevel,
          @RequestParam(value = "relationshipStatus", required = false) String relationshipStatus,
          @RequestParam(value = "hometownProvince", required = false) String hometownProvince,
          @RequestParam(value = "hometownCity", required = false) String hometownCity,
          @RequestParam(value = "futureCity", required = false) String futureCity,
          @RequestParam(value = "keyword", required = false) String keyword) {
    Long userId = SecurityUtils.getCurrentUserId();
    RecommendationFilter filter = new RecommendationFilter(
            heightMin,
            heightMax,
            parseCsvToSet(educationLevel),
            parseCsvToSet(relationshipStatus),
            hometownProvince,
            hometownCity,
            futureCity,
            keyword
    );
    return recommendationService.getRecommendations(userId, filter);
  }

  /**
   * 将逗号分隔的字符串解析为去重、去空白的 Set。
   * null 或空字符串返回空 Set。
   */
  private Set<String> parseCsvToSet(String csv) {
    if (csv == null || csv.isBlank()) {
      return java.util.Collections.emptySet();
    }
    return Arrays.stream(csv.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .collect(Collectors.toCollection(LinkedHashSet::new));
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
