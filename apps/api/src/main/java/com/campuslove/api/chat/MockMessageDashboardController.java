package com.campuslove.api.chat;

import com.campuslove.api.config.SecurityUtils;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 消息首页聚合控制器 Mock 实现（2026-08-23）。
 *
 * <p>mock profile 下 MessageDashboardController（real-only）未激活，本控制器在 mock
 * 下提供关系仪表板数据：预置「最近聊天 / 正在升温 / 有人喜欢你 / 等待回复」，用于
 * 本地演示与小程序截图验证。</p>
 */
@Profile("mock")
@RestController
@RequestMapping("/api/v1/messages")
public class MockMessageDashboardController {

    private final PrivateMessageService privateMessageService;

    public MockMessageDashboardController(PrivateMessageService privateMessageService) {
        this.privateMessageService = privateMessageService;
    }

    /**
     * 获取消息首页聚合数据。
     * GET /api/v1/messages/relationship-dashboard
     */
    @GetMapping("/relationship-dashboard")
    public MessageDashboardView getRelationshipDashboard() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ConversationView> conversations = privateMessageService.getConversations(userId);

        List<RelationshipPersonView> warmPeople = conversations.stream()
                .filter(c -> c.relationship() != null && c.relationship().score() > 20)
                .map(c -> toRelationshipPerson(userId, c))
                .sorted(Comparator.comparingInt((RelationshipPersonView p) -> p.relationship().score()).reversed())
                .limit(8)
                .toList();

        int likedMeCount = 3;
        int waitingReplyCount = Math.max(1, (int) conversations.stream()
                .filter(c -> c.unreadCount() > 0).count());
        TodayHeartView todayHeart = new TodayHeartView(likedMeCount, waitingReplyCount, warmPeople.size());

        List<AssistantSuggestionView> assistant = buildAssistantSuggestions(likedMeCount, warmPeople);
        List<PersonSummaryView> recommendedPeople = buildRecommendedPeople();

        return new MessageDashboardView(todayHeart, assistant, warmPeople, recommendedPeople, conversations);
    }

    private RelationshipPersonView toRelationshipPerson(Long currentUserId, ConversationView conversation) {
        Long peerUserId = currentUserId != null && currentUserId.equals(conversation.userAId())
                ? conversation.userBId()
                : conversation.userAId();
        String avatar = conversation.otherUserAvatar();
        if (avatar == null || avatar.isBlank()) {
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
        List<AssistantSuggestionView> suggestions = new ArrayList<>();
        if (likedMeCount > 0) {
            suggestions.add(new AssistantSuggestionView("❤️", "有人喜欢你",
                    likedMeCount + " 个人想认识你", "/pages/likes-visitors/index"));
        }
        suggestions.add(new AssistantSuggestionView("🌿", "周末附近有约会活动",
                "去发现适合你的线下活动", "/subpackages/discover/activities/index"));
        if (!warmPeople.isEmpty()) {
            RelationshipPersonView p = warmPeople.get(0);
            suggestions.add(new AssistantSuggestionView("💬", "建议回复" + p.name(),
                    "你们最近正在升温，主动聊一句", "/pages/chat-session/index?userId=" + p.userId()));
        }
        return suggestions.stream().limit(3).toList();
    }

    private List<PersonSummaryView> buildRecommendedPeople() {
        return List.of(
            new PersonSummaryView(1001L, "林晓", "/static/assets/images/avatars/avatar-1.jpg",
                "工业设计大三 · 摄影", List.of("摄影", "旅行"), "1.2km"),
            new PersonSummaryView(1002L, "周沐", "/static/assets/images/avatars/avatar-2.jpg",
                "计算机研二 · 电影", List.of("电影", "音乐"), "2.4km"),
            new PersonSummaryView(1003L, "许诺", "/static/assets/images/avatars/avatar-3.jpg",
                "艺术学院 · 音乐", List.of("音乐", "live"), "0.8km")
        );
    }
}