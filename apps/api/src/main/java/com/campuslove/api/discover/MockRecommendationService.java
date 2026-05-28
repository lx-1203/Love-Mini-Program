package com.campuslove.api.discover;

import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.runtime.MockRuntimeState;
import java.time.LocalDate;
import java.util.List;
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
    // Mock 实现：返回空列表
    return List.of();
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
