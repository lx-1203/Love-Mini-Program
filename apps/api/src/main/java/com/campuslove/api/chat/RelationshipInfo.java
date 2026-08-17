package com.campuslove.api.chat;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 关系信息视图（统一消费模型）。
 */
public record RelationshipInfo(
        String status,
        int score,
        LocalDateTime lastInteractionTime,
        int relationDays,
        List<String> commonInterests,
        int commonActivities,
        SuggestedActionView suggestedAction) {
}

