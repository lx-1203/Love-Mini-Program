package com.campuslove.api.admin;

/**
 * 活跃度统计视图（管理后台）。
 * 用于 {@code GET /api/admin/stats/active} 接口返回数据。
 *
 * @param dau              日活跃用户数（基于 user_online_status.last_heartbeat 当天心跳）
 * @param mau              月活跃用户数（基于近 30 天心跳）
 * @param interactionsToday 今日互动事件数
 * @param interactions7d    近 7 天互动事件数
 */
public record ActiveStatsView(
        long dau,
        long mau,
        long interactionsToday,
        long interactions7d
) {
}
