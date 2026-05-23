package com.campuslove.api.home;

/**
 * 首页服务接口。
 * 提供首页仪表盘数据的获取功能。
 */
public interface HomeService {

    /**
     * 获取首页仪表盘视图（兼容无 userId 的调用）。
     *
     * @return 首页仪表盘数据
     */
    default HomeDashboardView getDashboard() {
        return getDashboard(null);
    }

    /**
     * 获取首页仪表盘视图。
     * 根据用户 ID 聚合推荐人物、签到状态、每日一问、活动推荐、村口热门帖子等数据。
     *
     * @param userId 当前用户 ID，可为 null（匿名访问时返回通用数据）
     * @return 首页仪表盘数据
     */
    HomeDashboardView getDashboard(Long userId);
}
