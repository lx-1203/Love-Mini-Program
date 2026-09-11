package com.campuslove.api.chat;

import org.springframework.context.annotation.Profile;
import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.discover.RecommendedPersonView;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Like;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.LikeRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * 消息首页聚合服务（消息 V3）。
 */
@Profile("real")
@Service
public class MessageDashboardService {

    private final PrivateMessageService privateMessageService;
    private final LikeRepository likeRepository;
    private final RecommendationService recommendationService;
    private final ActivityRepository activityRepository;

    public MessageDashboardService(
            PrivateMessageService privateMessageService,
            LikeRepository likeRepository,
            RecommendationService recommendationService,
            ActivityRepository activityRepository) {
        this.privateMessageService = privateMessageService;
        this.likeRepository = likeRepository;
        this.recommendationService = recommendationService;
        this.activityRepository = activityRepository;
    }

    public MessageDashboardView getDashboard(Long userId) {
        List<ConversationView> conversations = privateMessageService.getConversations(userId);

        List<RelationshipPersonView> warmPeople = conversations.stream()
                .filter(c -> c.relationship() != null && c.relationship().score() > 20)
                .map(c -> toRelationshipPerson(userId, c))
                .sorted(Comparator.comparingInt((RelationshipPersonView p) -> p.relationship().score()).reversed())
                .limit(8)
                .toList();

        int likedMeCount = (int) likeRepository.countByTargetUserIdAndStatus(userId, Like.LikeStatus.active);
        int mutualCount = countMutualLikes(userId);
        int sentCount = likeRepository.findByUserIdAndStatus(userId, Like.LikeStatus.active).size();
        int waitingReplyCount = Math.max(0, sentCount - mutualCount);

        TodayHeartView todayHeart = new TodayHeartView(likedMeCount, waitingReplyCount, warmPeople.size());

        List<AssistantSuggestionView> assistant = buildAssistantSuggestions(
                likedMeCount, warmPeople);

        List<PersonSummaryView> recommendedPeople = recommendationService.getRecommendations(userId)
                .stream()
                .limit(6)
                .map(this::toPersonSummary)
                .toList();

        return new MessageDashboardView(todayHeart, assistant, warmPeople, recommendedPeople, conversations);
    }

    private RelationshipPersonView toRelationshipPerson(Long currentUserId, ConversationView conversation) {
        Long peerUserId = currentUserId.equals(conversation.userAId())
                ? conversation.userBId()
                : conversation.userAId();
        String avatar = conversation.otherUserAvatar();
        if (avatar == null || avatar.isBlank()) {
            // 2026-08-21：种子用户无头像时用默认人物素材兜底，避免消息页"正在升温"显示占位符
            avatar = "/static/assets/images/avatars/avatar-" + ((Math.abs(peerUserId) % 12) + 1) + ".jpg";
        }
        return new RelationshipPersonView(
                peerUserId,
                conversation.otherUserName(),
                avatar,
                conversation.headline(),
                conversation.relationship());
    }

    private List<AssistantSuggestionView> buildAssistantSuggestions(
            int likedMeCount, List<RelationshipPersonView> warmPeople) {
        // 2026-09-06 修复"建议卡片无法点击"：targetUrl 此前为不存在的页面路径
        // （/pages/likes-visitors/index、/pages/chat-session/index），openAppPath 静默失败；
        // 已改为 app.json 中的真实分包路由
        // R20（2026-09-08）：「活动推荐」接真实 upcoming 活动——原静态「周末附近有约会活动」
        // 占位卡与真实活动并存时内容重复/失真；无真实活动时才回退推广卡
        List<AssistantSuggestionView> suggestions = new ArrayList<>();
        List<Activity> upcoming = activityRepository
                .findByStatusOrderByActivityDateAsc(Activity.ActivityStatus.upcoming, PageRequest.of(0, 2))
                .getContent()
                .stream()
                .filter(a -> Boolean.TRUE.equals(a.getPublished()))
                .toList();
        for (Activity activity : upcoming) {
            String when = activity.getScheduleText() != null && !activity.getScheduleText().isBlank()
                    ? activity.getScheduleText()
                    : String.valueOf(activity.getActivityDate());
            suggestions.add(new AssistantSuggestionView(activityIcon(activity.getTitle()), activity.getTitle(),
                    when + " · " + activity.getLocation(),
                    "/subpackages/tools/activities/detail?id=" + activity.getId()));
        }
        if (upcoming.isEmpty()) {
            suggestions.add(new AssistantSuggestionView("🌿", "周末附近有约会活动",
                    "去发现适合你的线下活动", "/subpackages/discover/activities/index"));
        } else if (likedMeCount > 0 && suggestions.size() < 3) {
            suggestions.add(new AssistantSuggestionView("❤️", "有人喜欢你",
                    likedMeCount + " 人喜欢了你", "/subpackages/discover-extra/likes-visitors/index"));
        }
        if (!warmPeople.isEmpty()) {
            String name = warmPeople.get(0).name();
            suggestions.add(new AssistantSuggestionView("💬", "建议回复" + name,
                    "你们最近正在升温，主动聊一句", "/subpackages/chat/chat-session/index?userId="
                            + warmPeople.get(0).userId()));
        }
        return suggestions.stream().limit(3).toList();
    }

    /**
     * R3（MP-R3-MSG-003）：按活动标题关键词映射图标——
     * 原实现所有活动统一 🌿，篮球赛/骑行与绿叶图标语义不符（judged 截图证据）。
     */
    private String activityIcon(String title) {
        if (title == null || title.isBlank()) {
            return "🌿";
        }
        if (title.contains("篮球") || title.contains("足球") || title.contains("排球")
                || title.contains("羽毛球") || title.contains("乒乓") || title.contains("球")) {
            return "🏀";
        }
        if (title.contains("骑行") || title.contains("骑车") || title.contains("踏青") || title.contains("单车")) {
            return "🚴";
        }
        if (title.contains("跑") || title.contains("徒步") || title.contains("爬山") || title.contains("登山")) {
            return "🏃";
        }
        if (title.contains("读书") || title.contains("阅读") || title.contains("分享会")) {
            return "📚";
        }
        if (title.contains("电影") || title.contains("观影")) {
            return "🎬";
        }
        return "🌿";
    }

    private int countMutualLikes(Long userId) {
        List<Like> sentLikes = likeRepository.findByUserIdAndStatus(userId, Like.LikeStatus.active);
        int mutual = 0;
        for (Like sent : sentLikes) {
            boolean likedBack = likeRepository
                    .findByUserIdAndTargetUserId(sent.getTargetUserId(), userId)
                    .map(l -> l.getStatus() == Like.LikeStatus.active)
                    .orElse(false);
            if (likedBack) {
                mutual++;
            }
        }
        return mutual;
    }

    private PersonSummaryView toPersonSummary(RecommendedPersonView person) {
        return new PersonSummaryView(
                person.id(),
                person.name(),
                person.avatarUrl(),
                person.headline(),
                person.tags(),
                person.distanceText());
    }
}
