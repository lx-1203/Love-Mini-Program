package com.campuslove.api.home;

import com.campuslove.api.discover.ActivityService;
import com.campuslove.api.discover.ActivityView;
import com.campuslove.api.discover.DailyQuestionService;
import com.campuslove.api.discover.DailyQuestionView;
import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.discover.RecommendedPersonView;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.growth.CheckInService;
import com.campuslove.api.growth.CheckInStatusView;
import com.campuslove.api.repository.PostRepository;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * 真实首页服务实现。
 * 在 db profile 下激活，从各个子服务聚合真实数据返回首页仪表盘视图。
 * 每个子服务调用均有独立的错误处理，单个服务异常不会影响其他数据的聚合。
 */
@Profile("db")
@Service
public class RealHomeService implements HomeService {

    private static final Logger log = LoggerFactory.getLogger(RealHomeService.class);

    /** 活动推荐最大条数 */
    private static final int MAX_ACTIVITY_COUNT = 3;
    /** 村口热门帖子最大条数 */
    private static final int MAX_HOT_POST_COUNT = 3;

    private final RecommendationService recommendationService;
    private final CheckInService checkInService;
    private final DailyQuestionService dailyQuestionService;
    private final ActivityService activityService;
    private final PostRepository postRepository;

    /**
     * 构造函数，注入所有子服务依赖。
     */
    public RealHomeService(
            RecommendationService recommendationService,
            CheckInService checkInService,
            DailyQuestionService dailyQuestionService,
            ActivityService activityService,
            PostRepository postRepository) {
        this.recommendationService = recommendationService;
        this.checkInService = checkInService;
        this.dailyQuestionService = dailyQuestionService;
        this.activityService = activityService;
        this.postRepository = postRepository;
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
     * 从各子服务聚合推荐人物、签到状态、每日一问、活动推荐、村口热门帖子等数据。
     * 每个子服务调用均有独立的 try-catch，确保单个服务异常不影响整体数据返回。
     *
     * @param userId 当前用户 ID，可为 null（匿名访问时返回通用数据）
     * @return 首页仪表盘数据
     */
    @Override
    public HomeDashboardView getDashboard(Long userId) {
        // 1. 聚合推荐人物卡片
        List<RecommendedPersonSummaryView> recommendedPeople = aggregateRecommendedPeople(userId);

        // 2. 聚合签到状态，生成签到卡片
        HomeCardView scheduleSummary = aggregateCheckInStatus(userId);

        // 3. 聚合每日一问，生成 AI 推荐卡片（复用 aiPlan 卡片位置展示每日一问）
        HomeCardView aiPlan = aggregateDailyQuestion(userId);

        // 4. 聚合活动推荐（限制 3 条）
        ActivityPreviewView activityPreview = aggregateActivities();

        // 5. 聚合村口热门帖子（限制 3 条，按点赞数排序），展示在 activityPreview 的 pulse 区域
        List<ActivityPreviewItemView> hotPosts = aggregateHotPosts();

        // 将热门帖子合并到活动预览中，作为补充展示
        List<ActivityPreviewItemView> combinedItems =
                new java.util.ArrayList<>(activityPreview.items());
        combinedItems.addAll(hotPosts);

        return new HomeDashboardView(
            /* scheduleSummary */ scheduleSummary,
            /* freeSlots */ List.of(),
            /* aiPlan */ aiPlan,
            /* recommendedPeople */ recommendedPeople,
            /* peopleLead */ recommendedPeople.isEmpty() ? "发现更多有趣的人" : "为你推荐",
            /* activityPreview */ new ActivityPreviewView(
                activityPreview.title(),
                activityPreview.subtitle(),
                activityPreview.actionLabel(),
                combinedItems,
                activityPreview.pulseTitle(),
                activityPreview.pulseMeta()
            )
        );
    }

    /**
     * 聚合推荐人物卡片。
     * 调用 RecommendationService 获取推荐列表，映射为首页展示的摘要视图。
     *
     * @param userId 当前用户 ID
     * @return 推荐人物摘要列表，异常时返回空列表
     */
    private List<RecommendedPersonSummaryView> aggregateRecommendedPeople(Long userId) {
        if (userId == null) {
            return List.of();
        }
        try {
            List<RecommendedPersonView> recommendations = recommendationService.getRecommendations(userId);
            return recommendations.stream()
                .map(person -> new RecommendedPersonSummaryView(
                    String.valueOf(person.id()),
                    person.name(),
                    person.initials(),
                    person.headline(),
                    person.commonGround(),
                    person.availability()
                ))
                .toList();
        } catch (Exception e) {
            log.warn("聚合推荐人物数据失败, userId={}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    /**
     * 聚合签到状态，生成课表摘要卡片。
     * 复用 scheduleSummary 卡片位置展示签到信息。
     *
     * @param userId 当前用户 ID
     * @return 签到状态卡片，异常时返回默认提示
     */
    private HomeCardView aggregateCheckInStatus(Long userId) {
        if (userId == null) {
            return new HomeCardView(
                "schedule-summary", "暂无课表数据", "请先完善您的日程资料", null, "去设置"
            );
        }
        try {
            CheckInStatusView status = checkInService.getCheckInStatus(userId);
            if (status.checkedInToday()) {
                return new HomeCardView(
                    "schedule-summary",
                    "今日已签到",
                    "连续签到 " + status.consecutiveDays() + " 天",
                    "额外推荐配额 +" + status.extraQuota(),
                    "去推荐"
                );
            } else {
                return new HomeCardView(
                    "schedule-summary",
                    "今日尚未签到",
                    "签到可获得额外推荐配额",
                    null,
                    "去签到"
                );
            }
        } catch (Exception e) {
            log.warn("聚合签到状态失败, userId={}: {}", userId, e.getMessage());
            return new HomeCardView(
                "schedule-summary", "签到服务暂不可用", "请稍后再试", null, "去设置"
            );
        }
    }

    /**
     * 聚合每日一问，生成 AI 推荐卡片。
     * 复用 aiPlan 卡片位置展示每日一问内容。
     *
     * @param userId 当前用户 ID
     * @return 每日一问卡片，异常时返回默认提示
     */
    private HomeCardView aggregateDailyQuestion(Long userId) {
        try {
            DailyQuestionView question = dailyQuestionService.getTodayQuestion(userId);
            if (question != null) {
                String meta = question.hasAnswered()
                    ? "已回答 · 共 " + question.answerCount() + " 人参与"
                    : "今日尚未回答 · 共 " + question.answerCount() + " 人参与";
                return new HomeCardView(
                    "ai-plan",
                    "每日一问",
                    question.questionText(),
                    meta,
                    question.hasAnswered() ? "查看回答" : "去回答"
                );
            }
        } catch (Exception e) {
            log.warn("聚合每日一问失败, userId={}: {}", userId, e.getMessage());
        }
        // 默认兜底
        return new HomeCardView(
            "ai-plan", "每日一问", "今日问题加载中，请稍后再试", null, null
        );
    }

    /**
     * 聚合活动推荐。
     * 调用 ActivityService 获取近期活动，限制最多 3 条。
     *
     * @return 活动预览视图，异常时返回空列表
     */
    private ActivityPreviewView aggregateActivities() {
        try {
            Page<ActivityView> activities = activityService.getActivities(null, PageRequest.of(0, MAX_ACTIVITY_COUNT));
            List<ActivityPreviewItemView> items = activities.getContent().stream()
                .map(activity -> new ActivityPreviewItemView(
                    String.valueOf(activity.id()),
                    activity.title(),
                    activity.location(),
                    activity.scheduleText()
                ))
                .toList();
            return new ActivityPreviewView(
                "活动推荐",
                "查看近期活动",
                "查看活动",
                items,
                null,
                null
            );
        } catch (Exception e) {
            log.warn("聚合活动推荐失败: {}", e.getMessage());
            return new ActivityPreviewView(
                "活动推荐", "查看近期活动", "查看活动", List.of(), null, null
            );
        }
    }

    /**
     * 聚合村口热门帖子。
     * 从 PostRepository 查询按点赞数倒序的活跃帖子，限制最多 3 条。
     *
     * @return 热门帖子预览列表，异常时返回空列表
     */
    private List<ActivityPreviewItemView> aggregateHotPosts() {
        try {
            Page<Post> hotPosts = postRepository.findByStatusOrderByLikesCountDesc(
                PostStatus.active,
                PageRequest.of(0, MAX_HOT_POST_COUNT)
            );
            return hotPosts.getContent().stream()
                .map(post -> new ActivityPreviewItemView(
                    String.valueOf(post.getId()),
                    truncateContent(post.getContent(), 30),
                    "点赞 " + post.getLikesCount() + " · 评论 " + post.getCommentsCount(),
                    post.getCategory().name()
                ))
                .toList();
        } catch (Exception e) {
            log.warn("聚合村口热门帖子失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * 截断内容字符串，超出最大长度时添加省略号。
     *
     * @param content   原始内容
     * @param maxLength 最大长度
     * @return 截断后的内容
     */
    private String truncateContent(String content, int maxLength) {
        if (content == null) {
            return "";
        }
        if (content.length() <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + "...";
    }
}
