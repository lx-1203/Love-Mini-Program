package com.campuslove.api.config;

/**
 * 缓存名称常量类。
 *
 * <p>集中管理 Spring Cache（{@code @Cacheable} / {@code @CacheEvict}）使用的缓存名称，
 * 避免在业务代码中散落字符串字面量，便于统一维护与 TTL 配置。</p>
 *
 * <p>每个常量对应 {@link RedisConfig#cacheManager} 中配置的独立 TTL，
 * 具体失效时间参见 RedisConfig 中 {@code cacheNameTtl} 映射表。</p>
 */
public final class CacheNames {

    /** 私有构造方法，禁止实例化 */
    private CacheNames() {
    }

    /**
     * 用户资料缓存。
     * 缓存用户基础资料、头像、昵称等不常变更的信息，TTL 10 分钟。
     */
    public static final String USER_PROFILE = "user_profile";

    /**
     * 推荐人物列表缓存。
     * 缓存 {@code RealRecommendationService#getRecommendations} 的结果，TTL 5 分钟。
     * 推荐列表实时性要求较高，TTL 较短；用户更新偏好或互动后通过 @CacheEvict 主动失效。
     */
    public static final String MATCH_RECOMMEND = "match_recommend";

    /**
     * 游客（未登录）推荐列表缓存（2026-08-12 卡顿修复）。
     *
     * <p>游客推荐无个性化上下文（固定 key {@code guest:v1}），每次全量重算 ~8 次 SQL
     * （候选池 200 人）是未登录切页卡顿的主因；缓存后降为 1 次 Redis GET。TTL 60 秒：
     * 新注册/资料更新的可见性窗口 1 分钟，运营可接受。</p>
     *
     * <p>P2 修复（2026-11）：读侧改为 {@code @Cacheable(sync = true)} 且<b>去掉
     * {@code unless} 空结果豁免</b>——空结果同样缓存 60 秒。原「固定 key + 60 秒 TTL +
     * 不缓存空结果」的组合是自伤式惊群：每分钟到期瞬间全体并发游客一起重算，
     * 而候选池为空时永远不缓存 ⇒ 永久穿透。sync 让同一实例只回源一次
     * （{@code RedisCache} 内部进程级锁，多实例部署需换 Redisson 锁），
     * 相应地本缓存名被列入 {@code RedisConfig#SYNC_LOADED_CACHES}（允许缓存 null，
     * sync 与 null 策略必须成对，详见该常量注释）。</p>
     */
    public static final String GUEST_RECOMMEND = "guest_recommend";

    /**
     * 村口热门帖子缓存。
     * 缓存按热度分排序的热门帖子列表，TTL 15 分钟。
     *
     * <p><b>键清单</b>：线上只有 {@code 'hot'}（{@code VillageQueryService#listHotPosts}）
     * 在被写；{@code HotScoreScheduler#findHotBoard} 的 {@code 'board:' + page} 与
     * {@code findHotPosts}（同键 {@code 'hot'}，值是实体 {@code List<Post>}，
     * 与 {@code 'hot'} 的视图类型不同型——两处只有一个有调用点，暂无实害，
     * 但接线时必须先分键）目前没有生产调用点。</p>
     *
     * <p><b>失效口径（P2 修复 2026-11）</b>：互动写路径（点赞/评论/收藏/转发）
     * 由 {@code allEntries = true} 改为精确失效 {@code 'hot'} 单键
     * （{@code VillageInteractionService}）；帖子生命周期（发帖/改帖/删帖，
     * 真的改变榜单成员）仍由 {@code VillagePostService} 全量失效；
     * 热度分重算与管理端操纵由 {@code HotScoreScheduler#evictHotCache()} 全量 clear。
     * 排序新鲜度不受本次改动影响（{@code hot_score} 只在重算时变，且随 {@code clear()} 生效）。</p>
     *
     * <p>读侧 {@code 'hot'} 使用 {@code sync = true} 防击穿，故本缓存名同样列入
     * {@code RedisConfig#SYNC_LOADED_CACHES}。</p>
     */
    public static final String VILLAGE_HOT_POSTS = "village_hot_posts";

    /**
     * 校园（学校）列表缓存。
     * 缓存所有 distinct campusName 列表，TTL 1 小时。
     * 学校列表变更频率极低，TTL 较长以最大化命中率。
     */
    public static final String CAMPUS_SCHOOLS = "campus_schools";

    /**
     * 每日一问缓存。
     * 缓存当日每日一问题目及选项，TTL 1 小时。
     * 每日一问每日只更新一次，TTL 设置较长以降低数据库压力。
     */
    public static final String DAILY_QUESTION = "daily_question";

    /**
     * 敏感词列表缓存（Task 2.3.2）。
     *
     * <p>缓存 {@code SensitiveWordRepository.findAllByOrderByCreatedAtDesc()} 的全量结果，
     * 供 {@link SensitiveWordFilter} 在内存中重建 HashSet/Pattern。
     * 敏感词变更频率低，TTL 1 小时；Admin 后台增删时通过 @CacheEvict(allEntries=true) 主动失效。</p>
     */
    public static final String SENSITIVE_WORDS = "sensitive_words";

    /**
     * 系统配置缓存（Task 2.3.2）。
     *
     * <p>缓存 {@code RealAdminConfigService} 的三个列表：
     * {@code 'all'}（app_config 全量）/ {@code 'rules'}（app_rule 全量）/
     * {@code 'switches'}（app_switch 全量），TTL 30 分钟。</p>
     *
     * <p>失效口径（P2 修复 2026-11）：三个写方法各自精确失效自己喂的那个键
     * （{@code updateConfig→'all'}、{@code updateRule→'rules'}、
     * {@code updateSwitch→'switches'}）。原先只有 {@code updateConfig} 带失效
     * （且是 {@code allEntries=true} 连坐），{@code updateRule}/{@code updateSwitch}
     * 完全不失效 ⇒ 运营改完规则/开关后后台最长 30 分钟显示旧状态。
     * 注意这只影响「后台看到的状态」：线上读开关的
     * {@code FeatureSwitchService}/{@code RealAppConfigService} 直查数据库，不走本缓存。</p>
     */
    public static final String SYSTEM_CONFIG = "system_config";

    /**
     * 用户标签 / 帖子标签缓存（Task 2.3.2）。
     *
     * <p>缓存 {@code RealPostTagService.getTags()} 返回的预置标签列表，
     * 避免每次接口调用重复构造 List。TTL 10 分钟；
     * 标签列表为静态预置常量，目前不触发 @CacheEvict，TTL 到期自然失效。</p>
     */
    public static final String USER_TAGS = "user_tags";

    /**
     * 客户端动态配置缓存（Task 3.6）。
     *
     * <p>缓存 {@code RealConfigService}（{@code ConfigController} 背后）暴露的
     * 5 类前端启动期配置，键为 {@code 'campuses'} / {@code 'match_preferences'} /
     * {@code 'filter_options'} / {@code 'hero_banners'} / {@code 'unlock_guide_steps'}，
     * TTL 5 分钟。</p>
     *
     * <p><b>失效口径纠正（P2 修复 2026-11 核对）</b>：此前注释写「后台维护配置后可通过
     * {@code @CacheEvict(allEntries=true)} 主动失效」——<b>全仓没有任何一行
     * {@code @CacheEvict} 指向本缓存名</b>，那条能力并不存在，注释按现状改为
     * 「唯一失效手段是 5 分钟 TTL」，理由如下：</p>
     * <ul>
     *   <li>5 个键里只有 {@code 'campuses'} 是数据库驱动（{@code schools} 表
     *       + {@code school_majors} + 该校成员数/帖数），其余 4 个键直接返回代码内置常量，
     *       没有任何写路径可挂失效（{@code RealConfigService} 无写方法、
     *       {@code AdminConfigController} 也不维护这些表）。</li>
     *   <li>真正会改动 {@code 'campuses'} 数据源的是 {@code AdminSchoolController} 的
     *       {@code createSchool} / {@code updateSchool} / {@code toggleSchoolStatus} /
     *       {@code deleteSchool}，以及新增成员与发帖（成员数/帖数统计）。
     *       只给学校 CRUD 补一个 evict 依然盖不住后两者，反而制造「已经即时生效」的错觉。</li>
     * </ul>
     *
     * <p>所以本缓存的实时性上限就是 5 分钟。若产品要求「后台新增高校立即可见」，
     * 正确做法是在 {@code AdminSchoolController}（本类不归属本次改动，故未代改）
     * 的 4 个写方法上加
     * {@code @CacheEvict(cacheNames = CLIENT_CONFIG, key = "'campuses'")}——
     * 用精确键而不是 {@code allEntries}：另外 4 个键的内容与学校表无关，
     * 全量清空只是让首屏配置白回源一次。</p>
     */
    public static final String CLIENT_CONFIG = "client_config";

    /**
     * 管理后台统计缓存（SubTask 5.3.4）。
     *
     * <p>缓存 {@code RealAdminStatsService} 的三类统计结果（用户/活跃度/匹配），
     * 作为 Redis 计数器方案使用，避免每次后台首页刷新都触发全表 COUNT 与
     * GROUP BY 查询（用户表 / 心跳表 / 互动事件表 / 心信号表 大数据量下耗时较高）。</p>
     *
     * <p>TTL 5 分钟，平衡实时性与 DB 压力；Admin 后台可手动触发
     * {@code @CacheEvict(allEntries=true)} 强制刷新。</p>
     */
    public static final String ADMIN_STATS = "admin_stats";
}
