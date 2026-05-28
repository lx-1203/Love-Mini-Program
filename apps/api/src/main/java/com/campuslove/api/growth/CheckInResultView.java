package com.campuslove.api.growth;

/**
 * 签到结果视图。
 * 签到操作成功后返回，包含连续天数、额外推荐配额和签到权益信息。
 */
public record CheckInResultView(
    boolean success,
    int consecutiveDays,
    int extraQuota,
    int extraRecommendQuota,
    boolean hotTopicsUnlocked,
    boolean newUsersUnlocked,
    int hotTopicCount,
    int newUserCount
) {}