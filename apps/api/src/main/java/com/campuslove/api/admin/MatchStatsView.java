package com.campuslove.api.admin;

import java.util.List;

/**
 * 匹配统计视图（管理后台）。
 * 用于 {@code GET /api/admin/stats/matches} 接口返回数据。
 *
 * @param totalMatches      匹配信号总数（heart_signals 表全部记录）
 * @param mutualMatches     双向匹配数（match_type='mutual_like'）
 * @param successRate       匹配成功率（mutualMatches / totalMatches，0~1）
 * @param pendingMatches    待处理匹配数（status=pending）
 * @param acceptedMatches   已接受匹配数（status=accepted）
 * @param dailyTrend        近 30 天每日匹配趋势
 */
public record MatchStatsView(
        long totalMatches,
        long mutualMatches,
        double successRate,
        long pendingMatches,
        long acceptedMatches,
        List<DailyCount> dailyTrend
) {

    /**
     * 每日计数项。
     *
     * @param date  日期字符串（yyyy-MM-dd）
     * @param count 当日匹配数
     */
    public record DailyCount(String date, long count) {
    }
}
