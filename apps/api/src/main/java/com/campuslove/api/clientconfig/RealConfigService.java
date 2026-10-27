package com.campuslove.api.clientconfig;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.School;
import com.campuslove.api.entity.SchoolMajor;
import com.campuslove.api.repository.FieldCountProjection;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.SchoolMajorRepository;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 *
 * <p><b>专业目录口径（CampusView.majors）</b>：真源是 {@code school_majors} 表
 * （{@link SchoolMajorRepository}）。优先取 {@code school_code = 高校编码} 的按校档，
 * 没有则回退 {@code school_code = "*"} 的通用基线档，基线档也取不到才回退代码常量
 * {@link MajorBaseline#GENERIC}。三级回退<b>每一级都记日志</b>，不静默——
 * 截至本文件落地，按校档一行都没有（权威来源尚未导入），所以线上恒定走第一级回退，
 * 这一点必须能从日志里读出来，不能让人误以为下发的是按校真值。</p>
 */
@Profile("real")
@Service
public class RealConfigService implements ConfigService {

    private static final Logger log = LoggerFactory.getLogger(RealConfigService.class);

    private final SchoolRepository schoolRepository;
    private final UserCampusProfileRepository campusProfileRepository;
    private final PostRepository postRepository;
    private final SchoolMajorRepository schoolMajorRepository;

    public RealConfigService(SchoolRepository schoolRepository,
                             UserCampusProfileRepository campusProfileRepository,
                             PostRepository postRepository,
                             SchoolMajorRepository schoolMajorRepository) {
        this.schoolRepository = schoolRepository;
        this.campusProfileRepository = campusProfileRepository;
        this.postRepository = postRepository;
        this.schoolMajorRepository = schoolMajorRepository;
    }

    /**
     * 内置默认学校列表，与原客户端 schools.ts 的 SCHOOLS 保持一致，
     * 用于数据库无数据或查询异常时降级返回，保证迁移期前端功能不回归。
     *
     * <p>majors 带的是代码级通用基线（{@link MajorBaseline#GENERIC}）：降级档同样不能下发空目录，
     * 否则客户端 picker 直接空掉。它同样<b>不是任何学校的开课事实</b>，只是通用目录。</p>
     */
    private static final List<CampusView> DEFAULT_CAMPUSES = List.of(
            new CampusView("pku", "北京大学", "北京", MajorBaseline.GENERIC),
            new CampusView("thu", "清华大学", "北京", MajorBaseline.GENERIC),
            new CampusView("fudan", "复旦大学", "上海", MajorBaseline.GENERIC),
            new CampusView("zju", "浙江大学", "杭州", MajorBaseline.GENERIC)
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
                log.warn("schools 表无启用高校，校区列表回退内置默认 {} 所（majors 为代码级通用基线，非按校真源）",
                        DEFAULT_CAMPUSES.size());
                return DEFAULT_CAMPUSES;
            }
            Map<String, Integer> memberCounts = campusMemberCounts();
            Map<String, Integer> postCounts = campusPostCounts();
            List<String> baseline = genericBaselineMajors();
            Map<String, List<String>> majorsBySchoolCode = perSchoolMajors(schools);
            List<String> schoolsOnBaseline = new ArrayList<>();
            List<CampusView> views = new ArrayList<>(schools.size());
            for (School school : schools) {
                List<String> own = majorsBySchoolCode.get(school.getCode());
                List<String> majors;
                if (own != null && !own.isEmpty()) {
                    majors = own;
                } else {
                    // 按校档没有行 ⇒ 回退通用基线。这条分支是当前 17 所学校的常态
                    //（没有权威按校专业目录被导入过），必须可观测：不记日志的话，
                    // 运营会以为下发的是按校真值。
                    majors = baseline;
                    schoolsOnBaseline.add(school.getName() + "(" + school.getCode() + ")");
                }
                views.add(new CampusView(
                        school.getCode(),
                        school.getName(),
                        SCHOOL_CITY_MAP.getOrDefault(school.getName(), null),
                        valueOrUnknown(memberCounts, school.getName()),
                        valueOrUnknown(postCounts, school.getName()),
                        majors));
            }
            if (!schoolsOnBaseline.isEmpty()) {
                log.info("school_majors 无按校专业目录，回退通用基线 {} 条：{} 所 → {}",
                        baseline.size(), schoolsOnBaseline.size(), String.join("、", schoolsOnBaseline));
            }
            return views;
        } catch (RuntimeException e) {
            // 降级保证：数据库异常时返回内置默认列表，不影响客户端首屏渲染
            log.warn("loadCampuses 查询异常，回退内置默认 {} 所（majors 为代码级通用基线）：{}",
                    DEFAULT_CAMPUSES.size(), e.toString());
            return DEFAULT_CAMPUSES;
        }
    }

    /**
     * 通用基线专业目录（{@code school_majors} 的 {@code school_code = "*"} 档）。
     *
     * <p>取不到（表空 / 查询异常）时回退代码常量 {@link MajorBaseline#GENERIC} 并记 WARN——
     * 两条路都不下发空目录，但「字典表为空」这件事必须留下日志，否则只能等用户投诉才发现。</p>
     */
    private List<String> genericBaselineMajors() {
        try {
            List<SchoolMajor> rows = schoolMajorRepository
                    .findBySchoolCodeOrderBySortOrderAsc(SchoolMajor.GENERIC_SCHOOL_CODE);
            List<String> names = majorNames(rows);
            if (names.isEmpty()) {
                log.warn("school_majors 基线档(school_code='*')无数据，回退代码级通用目录 {} 条"
                        + "——请确认 V2026.10.27.0001__create_school_majors.sql 已执行", MajorBaseline.GENERIC.size());
                return MajorBaseline.GENERIC;
            }
            return names;
        } catch (RuntimeException e) {
            log.warn("school_majors 基线档查询异常，回退代码级通用目录 {} 条：{}",
                    MajorBaseline.GENERIC.size(), e.toString());
            return MajorBaseline.GENERIC;
        }
    }

    /**
     * 按校专业目录（{@code school_majors} 中 school_code = 具体高校编码的行）。
     *
     * <p>一次 IN 查询装配整份校区列表，避免每校一条 SQL 的 N+1；查询异常时返回空映射，
     * 让上层对<b>所有</b>学校走基线回退（记 WARN，不抛出）——专业目录缺失不该拖垮整个校区接口。</p>
     */
    private Map<String, List<String>> perSchoolMajors(List<School> schools) {
        Set<String> codes = new LinkedHashSet<>();
        for (School school : schools) {
            String code = school.getCode();
            if (code != null && !code.isBlank()) {
                codes.add(code);
            }
        }
        if (codes.isEmpty()) {
            return Map.of();
        }
        Map<String, List<String>> byCode = new LinkedHashMap<>();
        try {
            for (SchoolMajor row : schoolMajorRepository.findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(codes)) {
                if (row == null || row.getSchoolCode() == null || row.getName() == null || row.getName().isBlank()) {
                    continue;
                }
                byCode.computeIfAbsent(row.getSchoolCode(), key -> new ArrayList<>()).add(row.getName());
            }
        } catch (RuntimeException e) {
            log.warn("school_majors 按校专业查询异常，本轮全部 {} 所学校回退通用基线：{}", codes.size(), e.toString());
            return Map.of();
        }
        return byCode;
    }

    /** 按查询顺序收集专业名（顺序即 picker 顺序）；丢弃 null/空白行，避免空选项进下拉。 */
    private static List<String> majorNames(List<SchoolMajor> rows) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        List<String> names = new ArrayList<>(rows.size());
        for (SchoolMajor row : rows) {
            if (row != null && row.getName() != null && !row.getName().isBlank()) {
                names.add(row.getName());
            }
        }
        return List.copyOf(names);
    }

    /**
     * 区分「这所学校读数为 0」与「统计整条不可用」：
     * 前者是事实（例如某校还没有可见动态），照常下发 0；
     * 后者出 {@code null}，由客户端隐藏该行——两者都不得塌缩成 0，否则画面重新说谎。
     */
    private static Integer valueOrUnknown(Map<String, Integer> counts, String schoolName) {
        if (counts == null) {
            return null;
        }
        return counts.getOrDefault(schoolName, 0);
    }

    /**
     * 各校在籍用户数（校园圈学校卡「N 位同学」的唯一真值源）。
     *
     * <p>返回 {@code null} 表示整条统计不可用（区别于空表＝统计成功但无人填报校区）。
     * 这正是 R11-L04-D15 撤掉写死数字表后立下的口径——宁可少一行，不可多一个假数。</p>
     */
    private Map<String, Integer> campusMemberCounts() {
        Map<String, Integer> counts = new HashMap<>();
        try {
            for (FieldCountProjection row : campusProfileRepository.countGroupByCampusName()) {
                String campus = row.getField();
                if (campus == null || campus.isBlank() || row.getCnt() == null) {
                    continue;
                }
                counts.put(campus, row.getCnt().intValue());
            }
        } catch (RuntimeException e) {
            return null;
        }
        return counts;
    }

    /** 各校用户可见动态数（校园圈学校卡「N 条动态」），降级口径同 {@link #campusMemberCounts()}。 */
    private Map<String, Integer> campusPostCounts() {
        Map<String, Integer> counts = new HashMap<>();
        try {
            for (Object[] row : postRepository.countVisibleGroupByAuthorCampus(
                    Post.PostStatus.active, Post.AuditStatus.approved)) {
                if (row.length < 2 || !(row[0] instanceof String campus) || !(row[1] instanceof Long cnt)
                        || campus.isBlank()) {
                    continue;
                }
                counts.put(campus, cnt.intValue());
            }
        } catch (RuntimeException e) {
            return null;
        }
        return counts;
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
