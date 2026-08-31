package com.campuslove.api.home;

import com.campuslove.api.mock.MockRuntimeState;
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
        ),
        new MatchCenterView(
            new QuotaView(-1, 0, -1),
            32,
            new RelationProgressView(1, 1, 0)
        ),
        getHomeFeed(userId)
    );
  }

  @Override
  public HomeFeedView getHomeFeed(Long userId) {
    return new HomeFeedView(
        new TodayRecommendationView(
            1001L,
            "林晓",
            22,
            "北京大学",
            "大三",
            List.of("摄影", "旅行", "音乐"),
            "喜欢用镜头记录生活的美好瞬间",
            "期待与你一起探索这个世界",
            "1.2km",
            true,
            true,
            92,
            "/static/assets/images/people/person-01.png",
            null // V2026.08.17.0001 星座（mock/fallback 未维护）
        ),
        new LoveProgressView(
            2,
            4,
            List.of(
                new LoveProgressStepView("profile", "完善资料", "让更多人了解你", true, "profile"),
                new LoveProgressStepView("discover", "认识新人", "认识一位心动的人", true, "discover"),
                new LoveProgressStepView("whisper", "回复悄悄话", "回复一条悄悄话", false, "messages"),
                new LoveProgressStepView("interest", "参与兴趣互动", "参与一个兴趣圈", false, "nearby")
            )
        ),
        new RelationActivityView(3, 2, 5, 1, 11, java.util.List.of(), java.util.List.of(), java.util.List.of(), java.util.List.of()),
        List.of(
            new InterestCircleSummaryView(1L, "摄影圈", "📷", 12000, false),
            new InterestCircleSummaryView(2L, "旅行圈", "✈️", 8932, false),
            new InterestCircleSummaryView(3L, "音乐圈", "🎵", 16000, false),
            new InterestCircleSummaryView(4L, "美食圈", "🍜", 9210, false)
        ),
        List.of(
            new NearbyPersonSummaryView(1001L, "林晓", "1.2km", "/static/assets/images/people/person-01.png", true, List.of("摄影")),
            new NearbyPersonSummaryView(1002L, "夏言", "1.5km", "/static/assets/images/people/person-02.png", true, List.of("建筑")),
            new NearbyPersonSummaryView(1003L, "阿辰", "1.8km", "/static/assets/images/people/person-03.png", false, List.of("日语")),
            new NearbyPersonSummaryView(1004L, "小满", "2.1km", "/static/assets/images/people/person-04.png", false, List.of("编程")),
            new NearbyPersonSummaryView(1005L, "Luna", "2.8km", "/static/assets/images/people/person-05.png", false, List.of("新闻"))
        ),
        List.of(
                        new CommunityPostSummaryView(
                1L,
                1001L,
                "林晓",
                "/static/assets/images/people/person-01.png",
                "摄影圈",
                "15 分钟前",
                "今天在颐和园拍到超美的落日，光影太治愈了～",
                List.of("/static/assets/images/posts/post-1.jpg","/static/assets/images/posts/post-2.jpg","/static/assets/images/posts/post-3.jpg"),
                128,
                24
            ),
            new CommunityPostSummaryView(
                2L,
                1003L,
                "阿辰",
                "/static/assets/images/people/person-02.png",
                "旅行圈",
                "1 小时前",
                "周末去了香山，大片超好看！一起感受大自然的鬼斧神工吧～",
                List.of("/static/assets/images/posts/post-4.jpg","/static/assets/images/posts/post-5.jpg","/static/assets/images/posts/post-6.jpg"),
                96,
                18
            ),
            new CommunityPostSummaryView(
                3L,
                1005L,
                "草莓奶酪",
                "/static/assets/images/people/person-03.png",
                "美食圈",
                "2 小时前",
                "新发现一家超好吃的日料店！食材新鲜、味道超绝～",
                List.of("/static/assets/images/posts/post-6.jpg","/static/assets/images/posts/post-7.jpg","/static/assets/images/posts/post-8.jpg"),
                78,
                12
            )
        )
    );
  }

  @Override
  public TodayRecommendationView rotateTodayRecommendation(Long userId) {
    return new TodayRecommendationView(
        1002L,
        "夏言",
        24,
        "清华大学",
        "研一",
        List.of("旅行", "摄影"),
        "喜欢在路上遇见不同的风景",
        "想和你分享旅途里的故事",
        "1.5km",
        true,
        true,
        90,
        "/static/assets/images/people/person-02.png",
            null // V2026.08.17.0001 星座（mock/fallback 未维护）
    );
  }

}
