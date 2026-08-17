package com.campuslove.api.chat;

import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.discover.RecommendedPersonView;
import com.campuslove.api.entity.Like;
import com.campuslove.api.repository.LikeRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * 消息首页聚合服务（消息 V3）。
 */
@Service
public class MessageDashboardService {

    private final PrivateMessageService privateMessageService;
    private final LikeRepository likeRepository;
    private final RecommendationService recommendationService;

    public MessageDashboardService(
            PrivateMessageService privateMessageService,
            LikeRepository likeRepository,
            RecommendationService recommendationService) {
        this.privateMessageService = privateMessageService;
        this.likeRepository = likeRepository;
        this.recommendationService = recommendationService;
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
        return new RelationshipPersonView(
                peerUserId,
                conversation.otherUserName(),
                conversation.otherUserAvatar(),
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
            String name = warmPeople.get(0).name();
            suggestions.add(new AssistantSuggestionView("💬", "建议回复" + name,
                    "你们最近正在升温，主动聊一句", "/pages/chat-session/index?userId="
                            + warmPeople.get(0).userId()));
        }
        return suggestions.stream().limit(3).toList();
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
