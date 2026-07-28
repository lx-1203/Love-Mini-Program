package com.campuslove.api.clientconfig;

import java.util.List;

/**
 * 客户端动态配置服务接口（Task 3.6）。
 *
 * <p>统一抽象前端启动期所需的 5 类配置加载逻辑，由 {@link ConfigController}
 * 调用并暴露为 {@code GET /api/v1/config/**} 接口。</p>
 *
 * <p>实现方负责：</p>
 * <ul>
 *   <li>从数据库 / CMS / 内置默认值加载配置</li>
 *   <li>按 {@code Accept-Language} 进行 i18n 文案适配</li>
 *   <li>通过 {@code @Cacheable} 缓存 5 分钟（{@link com.campuslove.api.config.CacheNames#CLIENT_CONFIG}），
 *       降低 DB 压力并提升首屏速度</li>
 * </ul>
 *
 * <p>实现：</p>
 * <ul>
 *   <li>{@link RealConfigService} —— real profile 下从数据库 / 内置默认值加载</li>
 *   <li>{@link MockConfigService} —— mock profile 下返回固定模拟数据</li>
 * </ul>
 */
public interface ConfigService {

    /**
     * 加载学校（校区）列表（Task 3.6.1）。
     *
     * <p>对应 {@code GET /api/v1/config/campuses}，用于驱动校园认证、校区筛选等模块。</p>
     *
     * @return 学校视图列表（至少返回内置默认列表，保证不抛异常以避免影响首屏渲染）
     */
    List<CampusView> loadCampuses();

    /**
     * 加载匹配偏好选项列表（Task 3.6.2）。
     *
     * <p>对应 {@code GET /api/v1/config/match-preferences}，用于驱动匹配偏好表单。</p>
     *
     * @return 匹配偏好选项列表（至少返回内置默认列表）
     */
    List<MatchPreferenceOptionView> loadMatchPreferences();

    /**
     * 加载筛选选项列表（Task 3.6.3）。
     *
     * <p>对应 {@code GET /api/v1/config/filter-options}，包含活动类型、论坛版块、
     * 校园话题分类等多个维度的可选项。</p>
     *
     * @return 筛选选项列表（至少返回内置默认列表）
     */
    List<FilterOptionView> loadFilterOptions();

    /**
     * 加载 Hero Banner 列表（Task 3.6.4）。
     *
     * <p>对应 {@code GET /api/v1/config/hero-banners}，用于驱动首页 / 登录页 Banner 轮播。</p>
     *
     * @return Hero Banner 视图列表（仅包含 enabled=true 的项，按 order 升序）
     */
    List<HeroBannerView> loadHeroBanners();

    /**
     * 加载解锁引导步骤文案列表（Task 3.6.5）。
     *
     * <p>对应 {@code GET /api/v1/config/unlock-guide-steps}，用于驱动解锁引导弹窗与教学蒙层。</p>
     *
     * @return 解锁引导步骤视图列表（按 step 升序）
     */
    List<UnlockGuideStepView> loadUnlockGuideSteps();
}
