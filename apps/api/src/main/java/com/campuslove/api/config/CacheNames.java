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
}
