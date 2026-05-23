package com.campuslove.api.growth;

/**
 * 签到结果视图。
 * 签到操作成功后返回，包含连续天数和额外推荐配额。
 */
public record CheckInResultView(
    boolean success,
    int consecutiveDays,
    int extraQuota
) {}
