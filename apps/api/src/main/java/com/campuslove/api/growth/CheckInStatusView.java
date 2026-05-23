package com.campuslove.api.growth;

/**
 * 签到状态视图。
 * 查询今日签到状态时返回，包含是否已签到、连续天数和额外推荐配额。
 */
public record CheckInStatusView(
    boolean checkedInToday,
    int consecutiveDays,
    int extraQuota
) {}
