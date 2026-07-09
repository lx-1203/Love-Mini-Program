package com.campuslove.api.admin;

/**
 * 管理后台 - 数据统计服务接口（任务 9）。
 * 提供用户统计、活跃度统计、匹配统计能力。
 *
 * <p>对应任务 9 的 3 个接口：
 * <ul>
 *     <li>GET /api/admin/stats/users   - 用户统计</li>
 *     <li>GET /api/admin/stats/active  - 活跃度统计</li>
 *     <li>GET /api/admin/stats/matches - 匹配统计</li>
 * </ul>
 */
public interface AdminStatsService {

    /**
     * 获取用户统计：总数/新增/活跃/性别比/学校分布。
     *
     * @return 用户统计视图
     */
    UserStatsView getUserStats();

    /**
     * 获取活跃度统计：DAU/MAU/互动数。
     *
     * @return 活跃度统计视图
     */
    ActiveStatsView getActiveStats();

    /**
     * 获取匹配统计：匹配总数/成功率/每日趋势。
     *
     * @return 匹配统计视图
     */
    MatchStatsView getMatchStats();
}
