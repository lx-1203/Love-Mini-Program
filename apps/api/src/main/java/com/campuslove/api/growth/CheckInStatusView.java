package com.campuslove.api.growth;

/**
 * 签到状态视图。
 * 查询今日签到状态时返回，包含是否已签到、连续天数、额外推荐配额和积分余额。
 */
public record CheckInStatusView(
    boolean checkedInToday,
    int consecutiveDays,
    int extraQuota,
    /** 积分余额（= 交友币钱包余额，cents）。签到弹窗「我的积分」展示。 */
    long points
) {}
