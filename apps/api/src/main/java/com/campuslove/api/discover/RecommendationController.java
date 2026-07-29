package com.campuslove.api.discover;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/v1")
public class RecommendationController {

  private final RecommendationService recommendationService;

  public RecommendationController(RecommendationService recommendationService) {
    this.recommendationService = recommendationService;
  }

  /**
   * 获取讨论推荐列表。
   * GET /api/recommendations/discussions
   *
   * <p>返回基于热度与兴趣匹配的讨论推荐，供首页"讨论"模块展示。</p>
   *
   * @return 讨论推荐视图列表
   */
  @GetMapping("/recommendations/discussions")
  public List<DiscussionRecommendationView> getDiscussions() {
    return recommendationService.getDiscussions();
  }

  /**
   * 获取活动推荐列表。
   * GET /api/recommendations/activities
   *
   * <p>返回基于用户偏好与报名热度的活动推荐，供首页"活动"模块展示。</p>
   *
   * @return 活动推荐视图列表
   */
  @GetMapping("/recommendations/activities")
  public List<ActivityRecommendationView> getActivities() {
    return recommendationService.getActivities();
  }

  /**
   * 获取当前用户的推荐偏好设置。
   * GET /api/recommendations/preferences
   *
   * <p>返回用户已保存的推荐偏好（如推荐时间、范围、校园优先级）。
   * 未设置过偏好的用户返回默认值。</p>
   *
   * @return 推荐偏好视图
   */
  @GetMapping("/recommendations/preferences")
  public RecommendationPreferencesView getPreferences() {
    return recommendationService.getPreferences();
  }

  /**
   * 更新当前用户的推荐偏好设置。
   * PUT /api/recommendations/preferences
   *
   * <p>仅 USER 角色可调用。更新成功后立即生效，后续推荐结果按新偏好计算。</p>
   *
   * @param prefs 推荐偏好视图（含 dailyNotifyTime / scope / campusPriority）
   * @return 更新后的推荐偏好视图
   */
  @PutMapping("/recommendations/preferences")
  @PreAuthorize("hasRole('USER')")
  public RecommendationPreferencesView updatePreferences(@Valid @RequestBody RecommendationPreferencesView prefs) {
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
    // Task 15.2：隐私字段过滤白名单校验，确保推荐列表不返回手机号/身份证/真实姓名
    // RecommendedPersonView 为 record，字段在编译期固定，本调用为防御性校验：
    // 若未来有人向 record 误添加敏感字段，sanitize 会抛 IllegalStateException，
    // 由 GlobalExceptionHandler 转 500，强制运维修复
    return PrivacyFieldFilter.sanitize(recommendationService.getRecommendations(userId, filter));
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
  @PreAuthorize("hasRole('USER')")
  public RecommendationPreferencesView savePreferences(
          @Valid @RequestBody SavePreferencesRequest request) {
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
    // Task 15.2：与 getRecommendations 一致，对历史列表应用隐私字段过滤校验
    return PrivacyFieldFilter.sanitize(recommendationService.getHistory(userId));
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
    @NotBlank(message = "dailyNotifyTime 不能为空") @Size(max = 16) String dailyNotifyTime,
    @NotBlank(message = "scope 不能为空") @Size(max = 32) String scope,
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
    @NotBlank(message = "preferredTime 不能为空") @Size(max = 16) String preferredTime,
    @NotBlank(message = "scope 不能为空") @Size(max = 32) String scope,
    /** 校园优先：同校用户推荐权重+30% */
    Boolean campusPriority
) {}
