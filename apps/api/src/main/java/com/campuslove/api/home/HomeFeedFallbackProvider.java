package com.campuslove.api.home;

import java.util.List;
import org.springframework.stereotype.Component;

/**
 * 首页 Feed 兜底数据提供器（寻觅 v3）。
 *
 * <p>只在 RealHomeService 聚合真实数据后仍为空时使用，避免首页出现
 * “今日推荐空白 / 兴趣推荐空白 / 附近无人 / 社区无动态”的冷启动失败。
 * 这里不使用 mock fixtures，而是返回确定性的静态兜底视图，保证 mp-weixin
 * real 模式下首页也永远有可展示内容。</p>
 */
@Component
public class HomeFeedFallbackProvider {

    public TodayRecommendationView fallbackTodayRecommendation() {
        return new TodayRecommendationView(
            10001L,
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
        );
    }

    public List<InterestCircleSummaryView> fallbackInterestRecommendations() {
        return List.of(
            new InterestCircleSummaryView(1L, "摄影", "📷", 12000, false),
            new InterestCircleSummaryView(2L, "旅行", "🧳", 8932, false),
            new InterestCircleSummaryView(3L, "音乐", "🎵", 8123, false),
            new InterestCircleSummaryView(4L, "运动", "⚽", 6532, false)
        );
    }

    public List<NearbyPersonSummaryView> fallbackNearbyPeople() {
        // 2026-09-02 推荐去重红线：10001 林晓已是兜底今日推荐，附近的人不再重复出现
        return List.of(
            new NearbyPersonSummaryView(10002L, "夏言", "1.5km", "/static/assets/images/people/person-02.png", true, List.of("建筑")),
            new NearbyPersonSummaryView(10003L, "阿辰", "1.8km", "/static/assets/images/people/person-03.png", false, List.of("日语")),
            new NearbyPersonSummaryView(10004L, "小满", "2.1km", "/static/assets/images/people/person-04.png", false, List.of("编程")),
            new NearbyPersonSummaryView(10005L, "Luna", "2.8km", "/static/assets/images/people/person-05.png", false, List.of("新闻"))
        );
    }

    public List<CommunityPostSummaryView> fallbackCommunityPosts() {
        return List.of(
            new CommunityPostSummaryView(
                1L,
                1001L,
                "林晓",
                "/static/assets/images/people/person-01.png",
                "摄影圈",
                "15 分钟前",
                "今天在颐和园拍到超美的落日，光影太治愈了～",
                List.of(
                    "/static/assets/images/posts/post-1.jpg",
                    "/static/assets/images/posts/post-2.jpg",
                    "/static/assets/images/posts/post-3.jpg"
                ),
                128,
                24
            )
        );
    }
}
