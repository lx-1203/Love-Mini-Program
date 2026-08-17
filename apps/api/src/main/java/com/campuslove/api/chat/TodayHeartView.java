package com.campuslove.api.chat;

/**
 * 今日心动统计视图。
 */
public record TodayHeartView(
        int likedMeCount,
        int waitingReplyCount,
        int warmingCount) {
}
