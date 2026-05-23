package com.campuslove.api.home;

import com.campuslove.api.runtime.MockRuntimeState;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 首页服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟数据。
 */
@Profile("mock")
@Service
public class MockHomeService implements HomeService {

  private final MockRuntimeState runtimeState;

  public MockHomeService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  /**
   * 获取首页仪表盘视图（兼容无 userId 调用）。
   */
  @Override
  public HomeDashboardView getDashboard() {
    return getDashboard(null);
  }

  /**
   * 获取首页仪表盘视图。
   * Mock 实现忽略 userId，始终返回固定的模拟数据。
   */
  @Override
  public HomeDashboardView getDashboard(Long userId) {
    MockRuntimeState.ScheduleProfileData schedule = runtimeState.scheduleProfile();
    int savedBlocks = schedule.courseBlocks().size();
    MockRuntimeState.DiscussionRecommendationData discussionPulse =
        runtimeState.discussionRecommendations().isEmpty()
            ? null
            : runtimeState.discussionRecommendations().get(0);

    return new HomeDashboardView(
        new HomeCardView(
            "schedule-summary",
            "已保存 " + savedBlocks + " 个课表块",
            "你大部分的空闲时间仍然会从 18:30 之后开始。",
            schedule.preferredCampusArea(),
            "更新课表"
        ),
        List.of(
            new HomeCardView(
                "free-1",
                "今晚 19:00-20:30",
                "北草坪和咖啡馆都可以安排。",
                "适合轻松散步或喝杯咖啡",
                "用于推荐"
            ),
            new HomeCardView(
                "free-2",
                "周五 16:00-18:00",
                "时间足够，适合更完整的一次聊天。",
                "也有安静的室内兜底地点",
                "保留空档"
            )
        ),
        new HomeCardView(
            "ai-plan",
            "人工编辑兜底计划",
            "当前 AI 关闭，所以首页展示静态推荐块。",
            "当前开关 chat_ai_enabled = false",
            null
        ),
        runtimeState.recommendedPeople().stream()
            .map(person -> new RecommendedPersonSummaryView(
                person.id(),
                person.name(),
                person.initials(),
                person.headline(),
                person.commonGround(),
                person.availability()
            ))
            .toList(),
        "把推荐位作为进入聊天的主入口。",
        new ActivityPreviewView(
            "活动入口",
            "先看近期小活动，再决定是否去匹配或提交新的活动提案。",
            "查看活动",
            runtimeState.activityRecommendations().stream()
                .map(item -> new ActivityPreviewItemView(
                    item.id(),
                    item.title(),
                    item.location(),
                    item.scheduleText()
                ))
                .toList(),
            discussionPulse == null ? null : discussionPulse.title(),
            discussionPulse == null ? null : discussionPulse.heatLabel()
        )
    );
  }
}
