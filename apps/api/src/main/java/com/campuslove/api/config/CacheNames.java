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
     * <p>游客推荐无个性化上下文（固定 key），每次全量重算 ~8 次 SQL（候选池 200 人）
     * 是未登录切页卡顿的主因；缓存后降为 1 次 Redis GET。TTL 60 秒：
     * 新注册/资料更新的可见性窗口 1 分钟，运营可接受。</p>
     */
    public static final String GUEST_RECOMMEND = "guest_recommend";

    /**
     * 村口热门帖子缓存。
     * 缓存按点赞数排序的热门帖子列表，TTL 15 分钟。
     * 帖子创建/更新/删除时通过 @CacheEvict(allEntries = true) 主动失效。
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
     * <p>缓存 {@code RealAdminConfigService.listConfigs()} 返回的 AdminAppConfig 全量列表，
     * 供业务方读取匹配/推荐/特性开关等运行时参数。TTL 30 分钟；
     * Admin 更新配置时通过 @CacheEvict(allEntries=true) 主动失效。</p>
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
     * <p>缓存 {@code ConfigController} 暴露的 5 类前端启动期配置：
     * 学校列表 / 匹配偏好选项 / 筛选选项 / Hero Banner / 解锁引导步骤。
     * 这些配置变更频率低、被所有登录用户共享，TTL 5 分钟以平衡实时性与缓存命中率。</p>
     *
     * <p>后台维护配置后可通过 {@code @CacheEvict(allEntries=true)} 主动失效，
     * 或等待 TTL 自然过期。</p>
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
