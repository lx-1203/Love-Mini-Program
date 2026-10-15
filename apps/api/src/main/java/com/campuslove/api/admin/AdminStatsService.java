package com.campuslove.api.admin;

/**
 * 管理后台 - 数据统计服务接口（任务 9）。
 * 提供用户统计、活跃度统计、匹配统计、社区运营总览能力。
 *
 * <p>对应任务 9 的 3 个接口 + 首页待办清单接口：
 * <ul>
 *     <li>GET /api/admin/stats/users   - 用户统计</li>
 *     <li>GET /api/admin/stats/active  - 活跃度统计</li>
 *     <li>GET /api/admin/stats/matches - 匹配统计</li>
 *     <li>GET /api/v1/admin/stats/community-overview - 社区运营总览（待办清单）</li>
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

    /**
     * 获取社区运营总览（后台首页「待办清单」数据源，只读聚合）。
     *
     * <p>单次返回帖子待审核数、置顶数、总数、分类分布、近 7 天发帖趋势、
     * 角色分布、未归属圈子的帖子数、停用官方号数、待审核媒体数与待处理举报数，
     * 全部走 GROUP BY / CASE 聚合，避免逐表多次 count 的 N+1。</p>
     *
     * <p>校区隔离：沿用 R4-00393 口径，校区管理员仅统计本校区；
     * 官方账号为平台级全局资源，恒返回全平台计数（见
     * {@link CommunityOverviewView#disabledOfficialAccountCount()}）。</p>
     *
     * @return 社区运营总览视图（查询失败时对应字段降级为 0，不抛异常）
     */
    CommunityOverviewView getCommunityOverview();
}
