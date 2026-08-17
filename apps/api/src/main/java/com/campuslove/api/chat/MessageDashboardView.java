package com.campuslove.api.chat;

import java.util.List;

/**
 * 消息首页聚合视图。
 */
public record MessageDashboardView(
        TodayHeartView todayHeart,
        List<AssistantSuggestionView> assistant,
        List<RelationshipPersonView> warmPeople,
        List<PersonSummaryView> recommendedPeople,
        List<ConversationView> recentChats) {
}
