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
}
