package com.campuslove.api.home;

/**
 * 首页服务接口。
 * 提供首页仪表盘数据的获取功能。
 */
public interface HomeService {

    /**
     * 获取首页仪表盘视图。
     *
     * @return 首页仪表盘数据
     */
    HomeDashboardView getDashboard();
}
