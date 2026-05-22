package com.campuslove.api.discover;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

  private final RecommendationService recommendationService;

  public RecommendationController(RecommendationService recommendationService) {
    this.recommendationService = recommendationService;
  }

  @GetMapping("/discussions")
  public List<DiscussionRecommendationView> getDiscussions() {
    return recommendationService.getDiscussions();
  }

  @GetMapping("/activities")
  public List<ActivityRecommendationView> getActivities() {
    return recommendationService.getActivities();
  }

  @GetMapping("/preferences")
  public RecommendationPreferencesView getPreferences() {
    return recommendationService.getPreferences();
  }

  @PutMapping("/preferences")
  public RecommendationPreferencesView updatePreferences(@RequestBody RecommendationPreferencesView prefs) {
    return recommendationService.updatePreferences(prefs);
  }
}

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
    String scheduleText
) {
}