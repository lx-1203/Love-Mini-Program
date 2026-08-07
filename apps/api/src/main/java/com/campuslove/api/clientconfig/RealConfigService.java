package com.campuslove.api.clientconfig;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.School;
import com.campuslove.api.repository.SchoolRepository;
import java.util.List;
import java.util.Map;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 客户端动态配置服务真实实现（Task 3.6）。
 *
 * <p>在 real profile 下激活，提供 5 类配置的加载实现。</p>
 *
 * <p><b>当前阶段实现策略</b>：使用内置默认值返回，与原客户端硬编码常量保持一致，
 * 保证迁移期前端功能不回归。后续可通过以下方式逐步替换为数据库 / CMS 驱动：</p>
 * <ul>
 *   <li>新建 {@code client_config_campus} / {@code client_config_match_preference} /
 *       {@code client_config_filter_option} / {@code client_config_hero_banner} /
 *       {@code client_config_unlock_guide_step} 表 + Repository</li>
 *   <li>由 {@link com.campuslove.api.admin.AdminConfigController} 维护配置 CRUD，
 *       并通过 {@code @CacheEvict(cacheNames=CacheNames.CLIENT_CONFIG, allEntries=true)} 主动失效</li>
 *   <li>本服务改为查询 Repository，异常时降级到内置默认值（参考 RealAppConfigService 模式）</li>
 * </ul>
 *
 * <p><b>缓存策略</b>：所有方法均 {@code @Cacheable(cacheNames=CLIENT_CONFIG)}，
 * TTL 5 分钟（详见 {@link com.campuslove.api.config.RedisConfig#cacheManager}），
 * 所有登录用户共享缓存以最大化命中率。CacheKey 按方法签名 + locale 维度，
 * 但当前实现返回固定内置默认值（不区分 locale），因此固定 key 即可；
 * 后续若按 locale 返回不同文案，需将 locale 加入 CacheKey。</p>
 *
 * <p><b>降级保证</b>：所有方法均不抛异常，即使缓存或 DB 异常也返回内置默认值，
 * 避免影响客户端首屏渲染。</p>
 */
@Profile("real")
@Service
public class RealConfigService implements ConfigService {

    private final SchoolRepository schoolRepository;

    public RealConfigService(SchoolRepository schoolRepository) {
        this.schoolRepository = schoolRepository;
    }

    /**
     * 内置默认学校列表，与原客户端 schools.ts 的 SCHOOLS 保持一致，
     * 用于数据库无数据或查询异常时降级返回，保证迁移期前端功能不回归。
     */
    private static final List<CampusView> DEFAULT_CAMPUSES = List.of(
            new CampusView("pku", "北京大学", "北京"),
            new CampusView("thu", "清华大学", "北京"),
            new CampusView("fudan", "复旦大学", "上海"),
            new CampusView("zju", "浙江大学", "杭州")
    );

    /**
     * 学校名称 → 所在城市 映射（A-36）。
     *
     * <p>schools 表无 city 列，城市信息按学校名称推导（与种子
     * V2026.08.07.0022 的 city 映射一致）；未知学校返回 null
     * （客户端 CampusView.city 为可空字段，前端按缺省兜底）。</p>
     */
    private static final Map<String, String> SCHOOL_CITY_MAP = Map.ofEntries(
            Map.entry("北京大学", "北京"),
            Map.entry("清华大学", "北京"),
            Map.entry("复旦大学", "上海"),
            Map.entry("浙江大学", "杭州"),
            Map.entry("南京大学", "南京"),
            Map.entry("武汉大学", "武汉"),
            Map.entry("东南大学", "南京"),
            Map.entry("广州大学", "广州"),
            Map.entry("上海交通大学", "上海"),
            Map.entry("中山大学", "广州"),
            Map.entry("华中科技大学", "武汉"),
            Map.entry("四川大学", "成都"),
            Map.entry("西安交通大学", "西安"),
            Map.entry("哈尔滨工业大学", "哈尔滨"),
            Map.entry("南开大学", "天津"),
            Map.entry("同济大学", "上海"),
            Map.entry("中国人民大学", "北京")
    );

    /**
     * 内置默认匹配偏好选项，与原客户端 match-form.ts 的 matchFormFields 保持一致。
     */
    private static final List<MatchPreferenceOptionView> DEFAULT_MATCH_PREFERENCES = List.of(
            new MatchPreferenceOptionView(
                    "preference", "匹配偏好", true, "basic",
                    List.of(
                            new MatchPreferenceOptionView.OptionItem("same_school", "同校"),
                            new MatchPreferenceOptionView.OptionItem("nearby_school", "附近学校"),
                            new MatchPreferenceOptionView.OptionItem("cross_school", "跨校")
                    )
            ),
            new MatchPreferenceOptionView(
                    "timeRange", "可聊时间", false, "lifestyle",
                    List.of(
                            new MatchPreferenceOptionView.OptionItem("morning", "上午"),
                            new MatchPreferenceOptionView.OptionItem("afternoon", "下午"),
                            new MatchPreferenceOptionView.OptionItem("evening", "晚上")
                    )
            )
    );

    /**
     * 内置默认筛选选项，包含活动类型、论坛版块、校园话题分类三个维度。
     */
    private static final List<FilterOptionView> DEFAULT_FILTER_OPTIONS = List.of(
            new FilterOptionView(
                    "activity_type",
                    List.of(
                            new FilterOptionView.OptionItem("online", "线上", null),
                            new FilterOptionView.OptionItem("offline", "线下", null),
                            new FilterOptionView.OptionItem("mixed", "线上线下结合", null)
                    )
            ),
            new FilterOptionView(
                    "forum_section",
                    List.of(
                            new FilterOptionView.OptionItem("interest", "兴趣", null),
                            new FilterOptionView.OptionItem("sincere", "真诚", null),
                            new FilterOptionView.OptionItem("hometown", "家乡", null),
                            new FilterOptionView.OptionItem("anonymous", "匿名", null),
                            new FilterOptionView.OptionItem("campus", "校园", null)
                    )
            ),
            new FilterOptionView(
                    "campus_topic_category",
                    List.of(
                            new FilterOptionView.OptionItem("course_exchange", "课程交流", null),
                            new FilterOptionView.OptionItem("club_recruitment", "社团招新", null),
                            new FilterOptionView.OptionItem("campus_activity", "校园活动", null),
                            new FilterOptionView.OptionItem("study_help", "学习互助", null),
                            new FilterOptionView.OptionItem("life_service", "生活服务", null),
                            new FilterOptionView.OptionItem("alumni_news", "校友动态", null)
                    )
            )
    );

    /**
     * 内置默认 Hero Banner 列表，与原客户端 home-banners.ts 的 homeBanners 保持一致。
     * 注意：imageUrl 字段在原客户端引用 IMAGE_PATHS 静态资源路径，这里保留为空字符串，
     * 前端按需回退到本地静态资源（services/config.ts 中有兜底逻辑）。
     */
    private static final List<HeroBannerView> DEFAULT_HERO_BANNERS = List.of(
            new HeroBannerView(
                    "banner-daily-fate", "", "今日缘分值98%",
                    "3位与你高度契合的同学", "/pages/discover/index", 1, true),
            new HeroBannerView(
                    "banner-new-user", "", "新人礼遇",
                    "完成任务领专属徽章", "/subpackages/discover/activities/index", 2, true),
            new HeroBannerView(
                    "banner-weekend-party", "", "周末派对",
                    "校园桌游局报名中", "/subpackages/discover/activities/index", 3, true),
            new HeroBannerView(
                    "banner-graduation", "", "毕业季告白",
                    "勇敢说出心里话", "/pages/circles/index", 4, true)
    );

    /**
     * 内置默认解锁引导步骤，覆盖资料完善 / 校园认证 / 发布首帖三个核心动作。
     */
    private static final List<UnlockGuideStepView> DEFAULT_UNLOCK_GUIDE_STEPS = List.of(
            new UnlockGuideStepView(
                    1, "完善基础资料", "完善昵称、头像、生日等基础信息，让 Ta 更容易认识你",
                    "去完善资料", "/subpackages/setup/profile/index", "暂不完善"),
            new UnlockGuideStepView(
                    2, "完成校园认证", "上传学生证完成校园认证，解锁匹配与私信功能",
                    "去认证", "/subpackages/setup/campus/index", "暂不认证"),
            new UnlockGuideStepView(
                    3, "发布第一条动态", "在村口发布你的第一条动态，让更多人发现你",
                    "去发布", "/pages/village/index", "稍后再说")
    );

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.CLIENT_CONFIG, key = "'campuses'")
    public List<CampusView> loadCampuses() {
        // A-36 修复：原实现硬编码 4 所学校（pku/thu/fudan/zju），
        // 与 schools 表实际数据脱节（新增高校不会自动出现在校区下拉）。
        // 现改为从 schools 表查询启用中的高校，id 用 school.code（唯一编码，
        // 与客户端 CampusView.id 的 slug 语义一致），name/city 保持响应结构。
        try {
            List<School> schools = schoolRepository.findByStatusOrderBySortOrderAsc("active");
            if (schools == null || schools.isEmpty()) {
                return DEFAULT_CAMPUSES;
            }
            return schools.stream()
                    .map(school -> new CampusView(
                            school.getCode(),
                            school.getName(),
                            SCHOOL_CITY_MAP.getOrDefault(school.getName(), null)))
                    .toList();
        } catch (RuntimeException e) {
            // 降级保证：数据库异常时返回内置默认列表，不影响客户端首屏渲染
            return DEFAULT_CAMPUSES;
        }
    }

    @Override
    @Cacheable(cacheNames = CacheNames.CLIENT_CONFIG, key = "'match_preferences'")
    public List<MatchPreferenceOptionView> loadMatchPreferences() {
        return DEFAULT_MATCH_PREFERENCES;
    }

    @Override
    @Cacheable(cacheNames = CacheNames.CLIENT_CONFIG, key = "'filter_options'")
    public List<FilterOptionView> loadFilterOptions() {
        return DEFAULT_FILTER_OPTIONS;
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.CLIENT_CONFIG, key = "'hero_banners'")
    public List<HeroBannerView> loadHeroBanners() {
        return DEFAULT_HERO_BANNERS;
    }

    @Override
    @Cacheable(cacheNames = CacheNames.CLIENT_CONFIG, key = "'unlock_guide_steps'")
    public List<UnlockGuideStepView> loadUnlockGuideSteps() {
        return DEFAULT_UNLOCK_GUIDE_STEPS;
    }
}
