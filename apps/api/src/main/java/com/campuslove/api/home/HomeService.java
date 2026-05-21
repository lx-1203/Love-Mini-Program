package com.campuslove.api.home;

import com.campuslove.api.runtime.MockRuntimeState;
import com.campuslove.api.service.RecommendationService;
import com.campuslove.api.service.RecommendationService.RecommendationResult;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class HomeService {

  private final MockRuntimeState runtimeState;
  private final RecommendationService recommendationService;

  public HomeService(MockRuntimeState runtimeState,
                     @Qualifier("userRecommendationService") RecommendationService recommendationService) {
    this.runtimeState = runtimeState;
    this.recommendationService = recommendationService;
  }

  public HomeDashboardView getDashboard() {
    MockRuntimeState.ScheduleProfileData schedule = runtimeState.scheduleProfile();
    int savedBlocks = schedule.courseBlocks().size();

    List<RecommendationResult> recommendations =
        recommendationService.getTodayRecommendations("user-1001");

    return new HomeDashboardView(
        new HomeCardView(
            "schedule-summary",
            "已保存 " + savedBlocks + " 个课表块",
            "你大部分的空闲时间仍然会从 18:30 之后开始。",
            schedule.preferredCampusArea(),
            "更新课表"
        ),
        recommendations.stream()
            .map(r -> new RecommendedPersonSummaryView(
                r.id(),
                r.nickname(),
                r.initials(),
                r.reason(),
                r.school(),
                r.grade()
            ))
            .toList(),
        "已为你匹配 " + recommendations.size() + " 位推荐用户，基于课表空闲与兴趣偏好。"
    );
  }
}