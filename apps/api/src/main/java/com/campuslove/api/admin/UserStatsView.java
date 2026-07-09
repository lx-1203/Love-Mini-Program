package com.campuslove.api.admin;

import java.util.List;
import java.util.Map;

/**
 * 用户统计视图（管理后台）。
 * 用于 {@code GET /api/admin/stats/users} 接口返回数据。
 *
 * @param totalUsers    总用户数
 * @param newUsersToday 今日新增用户数
 * @param newUsers7d    近 7 天新增用户数
 * @param activeUsersToday 今日活跃用户数（基于 user_online_status 心跳）
 * @param genderDistribution 性别比（按 pronouns 字段分组，key 为 pronouns 值或 "unknown"）
 * @param campusDistribution 学校分布（按 campus_name 分组）
 */
public record UserStatsView(
        long totalUsers,
        long newUsersToday,
        long newUsers7d,
        long activeUsersToday,
        Map<String, Long> genderDistribution,
        List<FieldCount> campusDistribution
) {

    /**
     * 字段计数项（用于分布统计的列表展示）。
     */
    public record FieldCount(String field, long count) {
    }
}
