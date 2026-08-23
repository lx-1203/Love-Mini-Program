package com.campuslove.api.chat;

import org.springframework.context.annotation.Profile;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.ProfileVisitorRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * 关系分数计算服务（消息 V3）。
 * 所有关系模块统一消费本服务，前端不自行计算。
 */
@Profile("real")
@Service
public class RelationshipScoreService {

    private final PrivateMessageRepository messageRepository;
    private final ProfileVisitorRepository profileVisitorRepository;
    private final ActivityEnrollmentRepository enrollmentRepository;
    private final LikeRepository likeRepository;
    private final UserFollowRepository followRepository;
    private final UserBasicProfileRepository basicProfileRepository;
    private final SuggestedActionService suggestedActionService;
    private final ObjectMapper objectMapper;

    public RelationshipScoreService(
            PrivateMessageRepository messageRepository,
            ProfileVisitorRepository profileVisitorRepository,
            ActivityEnrollmentRepository enrollmentRepository,
            LikeRepository likeRepository,
            UserFollowRepository followRepository,
            UserBasicProfileRepository basicProfileRepository,
            SuggestedActionService suggestedActionService,
            ObjectMapper objectMapper) {
        this.messageRepository = messageRepository;
        this.profileVisitorRepository = profileVisitorRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.likeRepository = likeRepository;
        this.followRepository = followRepository;
        this.basicProfileRepository = basicProfileRepository;
        this.suggestedActionService = suggestedActionService;
        this.objectMapper = objectMapper;
    }

    public RelationshipInfo build(Long currentUserId, Long peerUserId, Long conversationId) {
        long messageCount = conversationId == null ? 0 : messageRepository.countByConversationId(conversationId);
        long voiceCount = conversationId == null ? 0
                : messageRepository.countByConversationIdAndMessageKind(conversationId, "voice");
        long photoCount = conversationId == null ? 0
                : messageRepository.countByConversationIdAndMessageKind(conversationId, "image");

        List<PrivateMessage> recentMessages = conversationId == null
                ? List.of()
                : messageRepository.findTop50ByConversationIdOrderByCreatedAtDesc(conversationId);
        LocalDateTime lastInteractionTime = recentMessages.isEmpty() ? null
                : recentMessages.get(0).getCreatedAt();
        int conversationDays = conversationDays(recentMessages);
        int avgReplyScore = avgReplyTimeScore(recentMessages);

        boolean mutualLike = hasActiveLike(currentUserId, peerUserId)
                && hasActiveLike(peerUserId, currentUserId);
        boolean mutualFollow = followRepository.existsByFollowerIdAndFollowingId(currentUserId, peerUserId)
                && followRepository.existsByFollowerIdAndFollowingId(peerUserId, currentUserId);
        boolean activityTogether = hasCommonActivity(currentUserId, peerUserId);
        long profileViewCount = profileVisitorRepository.countByVisitorIdAndHostId(peerUserId, currentUserId);

        List<String> commonInterests = commonInterests(currentUserId, peerUserId);

        double scoreDouble = Math.min(messageCount / RelationshipScorePolicy.MESSAGE_COUNT_MAX, 1.0) * 20.0
                + Math.min(conversationDays / RelationshipScorePolicy.CONVERSATION_DAYS_MAX, 1.0) * 15.0
                + avgReplyScore
                + (mutualLike ? 20.0 : 0.0)
                + (activityTogether ? 15.0 : 0.0)
                + Math.min(profileViewCount / RelationshipScorePolicy.PROFILE_VIEW_MAX, 1.0) * 5.0
                + Math.min(voiceCount / RelationshipScorePolicy.VOICE_COUNT_MAX, 1.0) * 5.0
                + Math.min(photoCount / RelationshipScorePolicy.PHOTO_COUNT_MAX, 1.0) * 10.0;
        int score = Math.max(0, Math.min(100, (int) Math.round(scoreDouble)));

        String status = RelationshipScorePolicy.statusFromScore(score);
        int commonActivities = commonActivityCount(currentUserId, peerUserId);
        SuggestedActionView action = suggestedActionService.build(
                peerUserId, lastInteractionTime, commonInterests, commonActivities, (int) profileViewCount);

        int relationDays = Math.max(1, conversationDays);
        return new RelationshipInfo(status, score, lastInteractionTime, relationDays,
                commonInterests, commonActivities, action);
    }

    private int conversationDays(List<PrivateMessage> messages) {
        if (messages.size() < 2) {
            return 0;
        }
        List<PrivateMessage> sorted = new ArrayList<>(messages);
        sorted.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));
        long days = Duration.between(sorted.get(0).getCreatedAt(), sorted.get(sorted.size() - 1).getCreatedAt()).toDays();
        return (int) Math.max(0, Math.min(days, 365));
    }

    private int avgReplyTimeScore(List<PrivateMessage> messages) {
        if (messages.size() < 2) {
            return 0;
        }
        List<PrivateMessage> sorted = new ArrayList<>(messages);
        sorted.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));
        long totalGapMinutes = 0;
        int gaps = 0;
        for (int i = 1; i < sorted.size(); i++) {
            PrivateMessage prev = sorted.get(i - 1);
            PrivateMessage current = sorted.get(i);
            if (!prev.getSenderId().equals(current.getSenderId())) {
                long minutes = Duration.between(prev.getCreatedAt(), current.getCreatedAt()).toMinutes();
                totalGapMinutes += Math.max(0, minutes);
                gaps++;
            }
        }
        if (gaps == 0) {
            return 0;
        }
        long avgMinutes = totalGapMinutes / gaps;
        if (avgMinutes <= RelationshipScorePolicy.REPLY_FAST_MINUTES) {
            return 10;
        }
        if (avgMinutes <= RelationshipScorePolicy.REPLY_MEDIUM_MINUTES) {
            return 7;
        }
        if (avgMinutes <= RelationshipScorePolicy.REPLY_SLOW_MINUTES) {
            return 4;
        }
        return 0;
    }

    private boolean hasActiveLike(Long userId, Long targetUserId) {
        return likeRepository.findByUserIdAndTargetUserId(userId, targetUserId)
                .map(like -> like.getStatus() == Like.LikeStatus.active)
                .orElse(false);
    }

    private boolean hasCommonActivity(Long userIdA, Long userIdB) {
        return commonActivityCount(userIdA, userIdB) > 0;
    }

    private int commonActivityCount(Long userIdA, Long userIdB) {
        return enrollmentRepository.findCommonActivityIdsByUserIds(userIdA, userIdB).size();
    }

    private List<String> commonInterests(Long userIdA, Long userIdB) {
        List<String> tagsA = interestTags(userIdA);
        List<String> tagsB = interestTags(userIdB);
        if (tagsA.isEmpty() || tagsB.isEmpty()) {
            return List.of();
        }
        List<String> result = new ArrayList<>(tagsA);
        result.retainAll(tagsB);
        return result;
    }

    private List<String> interestTags(Long userId) {
        return basicProfileRepository.findByUserId(userId)
                .map(UserBasicProfile::getInterestTags)
                .map(this::parseStringList)
                .orElse(Collections.emptyList());
    }

    private List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, String.class));
        } catch (Exception ex) {
            return List.of();
        }
    }
}

