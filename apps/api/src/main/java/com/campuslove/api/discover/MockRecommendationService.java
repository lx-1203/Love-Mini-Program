package com.campuslove.api.discover;

import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.runtime.MockRuntimeState;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 推荐服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟数据。
 */
@Profile("mock")
@Service
public class MockRecommendationService implements RecommendationService {

  private final MockRuntimeState runtimeState;

  /**
   * Mock 报名状态存储：activityId -> enrolled
   */
  private final Map<String, Boolean> enrollmentMap = new ConcurrentHashMap<>();

  public MockRecommendationService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  @Override
  public List<DiscussionRecommendationView> getDiscussions() {
    return runtimeState.discussionRecommendations().stream()
        .map(item -> new DiscussionRecommendationView(
            item.id(),
            item.title(),
            item.summary(),
            item.heatLabel()
        ))
        .toList();
  }

  @Override
  public List<ActivityRecommendationView> getActivities() {
    return runtimeState.activityRecommendations().stream()
        .map(item -> new ActivityRecommendationView(
            item.id(),
            item.title(),
            item.location(),
            item.scheduleText(),
            item.description(),
            item.enrollmentCount(),
            item.participantAvatars()
        ))
        .toList();
  }

  @Override
  public ActivityEnrollmentView enrollActivity(String activityId, boolean enrolled, Long userId) {
    if (activityId == null || activityId.isBlank()) {
      throw new IllegalArgumentException("activityId is required");
    }

    MockRuntimeState.ActivityRecommendationData activity = runtimeState.activityRecommendations().stream()
        .filter(a -> a.id().equals(activityId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

    enrollmentMap.put(activityId, enrolled);

    int enrollmentCount = enrolled
        ? activity.enrollmentCount() + 1
        : activity.enrollmentCount();

    return new ActivityEnrollmentView(activityId, enrolled, enrollmentCount);
  }

  @Override
  public ActivityDetailView getActivityDetail(String activityId, Long userId) {
    if (activityId == null || activityId.isBlank()) {
      throw new IllegalArgumentException("activityId is required");
    }

    MockRuntimeState.ActivityRecommendationData activity = runtimeState.activityRecommendations().stream()
        .filter(a -> a.id().equals(activityId))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

    boolean isEnrolled = enrollmentMap.getOrDefault(activityId, false);

    return new ActivityDetailView(
        Long.valueOf(activity.id()),
        activity.title(),
        activity.location(),
        activity.scheduleText(),
        activity.description(),
        activity.enrollmentCount(),
        activity.participantAvatars(),
        "upcoming",
        LocalDate.now().plusDays(1),
        isEnrolled
    );
  }

  @Override
  public RecommendationPreferencesView getPreferences() {
    return new RecommendationPreferencesView("12:00", "campus_first", true);
  }

  @Override
  public RecommendationPreferencesView updatePreferences(RecommendationPreferencesView prefs) {
    if (prefs == null || prefs.dailyNotifyTime() == null || prefs.scope() == null) {
      throw new IllegalArgumentException("dailyNotifyTime and scope are required");
    }
    return prefs;
  }

  @Override
  public List<RecommendedPersonView> getRecommendations(Long userId) {
    // Mock 实现：将 MockRuntimeState.recommendedPeople 转换为 RecommendedPersonView
    return runtimeState.recommendedPeople().stream()
        .map(this::toView)
        .toList();
  }

  @Override
  public List<RecommendedPersonView> getRecommendations(Long userId, RecommendationFilter filter) {
    // Phase B - Task B2.12: 在 mock 候选池上实现 in-memory filter，
    // 复用与 RealRecommendationService.matchesFilter 相同的逻辑。
    // filter 为 null 或空时返回全部 mock 数据，向后兼容。
    if (filter == null || filter.isEmpty()) {
      return getRecommendations(userId);
    }
    return runtimeState.recommendedPeople().stream()
        .filter(person -> matchesFilter(person, filter))
        .map(this::toView)
        .toList();
  }

  /**
   * 将 mock 数据记录转换为推荐人物视图。
   *
   * @param person mock 推荐人物数据
   * @return 推荐人物视图
   */
  private RecommendedPersonView toView(MockRuntimeState.RecommendedPersonData person) {
    return new RecommendedPersonView(
        tryParseLong(person.id()),
        person.name(),
        person.initials(),
        person.headline(),
        person.commonGround(),
        person.availability(),
        "", // campusName：mock 数据未维护，留空
        null, // avatarUrl
        person.interestTags(),
        person.bio() != null ? person.bio() : "",
        List.of(),
        false,
        false,
        0,
        person.height(),
        person.educationLevel(),
        List.of(),
        null,
        null,
        "none"
    );
  }

  /**
   * 将 mock 数据 id（如 person-1）解析为 Long，失败时返回 null。
   * 用于将字符串 ID 转换为视图所需的 Long ID。
   *
   * @param id 字符串 ID
   * @return Long 类型 ID，无法解析时返回 null
   */
  private Long tryParseLong(String id) {
    if (id == null || id.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(id);
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  /**
   * 判断 mock 数据是否满足筛选条件（与 RealRecommendationService.matchesFilter 逻辑一致）。
   * 任一维度不满足即返回 false；所有激活的维度都通过才返回 true。
   *
   * <p>实现说明：直接对原始 RecommendedPersonData 进行筛选，避免视图转换丢失
   * relationshipStatus/hometownProvince/hometownCity/futureCity 等字段。
   * mock 数据已包含全部筛选维度，不需要 DB 回查。</p>
   *
   * @param person mock 推荐人物数据
   * @param filter 筛选条件
   * @return true 表示满足筛选条件
   */
  private boolean matchesFilter(MockRuntimeState.RecommendedPersonData person,
                                RecommendationFilter filter) {
    // 1. height 范围（闭区间）
    if (filter.heightMin() != null) {
      if (person.height() == null || person.height() < filter.heightMin()) {
        return false;
      }
    }
    if (filter.heightMax() != null) {
      if (person.height() == null || person.height() > filter.heightMax()) {
        return false;
      }
    }
    // 2. educationLevel 多选
    if (!filter.educationLevels().isEmpty()) {
      if (person.educationLevel() == null
          || !filter.educationLevels().contains(person.educationLevel())) {
        return false;
      }
    }
    // 3. relationshipStatus 多选
    if (!filter.relationshipStatuses().isEmpty()) {
      if (person.relationshipStatus() == null
          || !filter.relationshipStatuses().contains(person.relationshipStatus())) {
        return false;
      }
    }
    // 4. hometownProvince 等值
    if (filter.hometownProvince() != null) {
      if (person.hometownProvince() == null
          || !filter.hometownProvince().equals(person.hometownProvince())) {
        return false;
      }
    }
    // 5. hometownCity 等值
    if (filter.hometownCity() != null) {
      if (person.hometownCity() == null
          || !filter.hometownCity().equals(person.hometownCity())) {
        return false;
      }
    }
    // 6. futureCity 等值
    if (filter.futureCity() != null) {
      if (person.futureCity() == null
          || !filter.futureCity().equals(person.futureCity())) {
        return false;
      }
    }
    // 7. keyword 模糊匹配 nickname/bio/interestTags
    if (filter.keyword() != null) {
      String kw = filter.keyword().toLowerCase(Locale.ROOT);
      boolean inName = person.name() != null
          && person.name().toLowerCase(Locale.ROOT).contains(kw);
      boolean inBio = person.bio() != null
          && person.bio().toLowerCase(Locale.ROOT).contains(kw);
      boolean inTags = person.interestTags() != null
          && person.interestTags().stream()
              .anyMatch(t -> t != null && t.toLowerCase(Locale.ROOT).contains(kw));
      if (!(inName || inBio || inTags)) {
        return false;
      }
    }
    return true;
  }

  @Override
  public RecommendationPreferencesView getPreferences(Long userId) {
    return new RecommendationPreferencesView("12:00", "campus_first", true);
  }

  @Override
  public RecommendationPreferencesView savePreferences(Long userId, String preferredTime, String scope, Boolean campusPriority) {
    if (preferredTime == null || scope == null) {
      throw new IllegalArgumentException("preferredTime and scope are required");
    }
    return new RecommendationPreferencesView(preferredTime, scope, campusPriority != null ? campusPriority : true);
  }

  @Override
  public RecommendationPreferencesView updatePreferences(Long userId, RecommendationPreference data) {
    // Mock 实现：不持久化，直接返回传入的偏好数据
    if (userId == null) {
      throw new IllegalArgumentException("userId 不能为空");
    }
    if (data == null) {
      throw new IllegalArgumentException("偏好数据不能为空");
    }
    return new RecommendationPreferencesView(data.getPreferredTime(), data.getScope(), data.getCampusPriority());
  }

  @Override
  public List<RecommendedPersonView> getHistory(Long userId) {
    // Mock 实现：返回空列表
    return List.of();
  }
}
