package com.campuslove.api.discover;

import java.util.List;
import org.springframework.stereotype.Service;
import com.campuslove.api.runtime.MockRuntimeState;

@Service
public class RecommendationService {

  private final MockRuntimeState runtimeState;

  public RecommendationService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

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

  public List<ActivityRecommendationView> getActivities() {
    return runtimeState.activityRecommendations().stream()
        .map(item -> new ActivityRecommendationView(
            item.id(),
            item.title(),
            item.location(),
            item.scheduleText()
        ))
        .toList();
  }

  /**
   * 获取推荐偏好设置，返回默认值。
   */
  public RecommendationPreferencesView getPreferences() {
    return new RecommendationPreferencesView("12:00", "campus_first");
  }

  /**
   * 更新推荐偏好设置（mock 实现，直接返回输入值）。
   */
  public RecommendationPreferencesView updatePreferences(RecommendationPreferencesView prefs) {
    if (prefs == null || prefs.dailyNotifyTime() == null || prefs.scope() == null) {
      throw new IllegalArgumentException("dailyNotifyTime and scope are required");
    }
    return prefs;
  }
}

record RecommendationPreferencesView(
    String dailyNotifyTime,
    String scope
) {}