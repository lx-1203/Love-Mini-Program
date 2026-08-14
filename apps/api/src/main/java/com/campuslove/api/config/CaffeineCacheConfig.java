package com.campuslove.api.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Caffeine 本地缓存配置（备用方案）。
 *
 * <p>Task 2.3.1：作为 Redis 缓存的降级方案与单元测试环境的 CacheManager。</p>
 *
 * <p>激活场景：</p>
 * <ul>
 *   <li>Profile 非 "real" 时（如 test / dev / mock），不依赖 Redis，
 *       使用 Caffeine 提供与 {@link RedisConfig} 一致的 CacheName 与 TTL 语义，
 *       保证 @Cacheable 注解在测试环境下也能正常工作。</li>
 *   <li>当 real profile 下 Redis 不可用时，可通过 {@code spring.cache.type=caffeine}
 *       强制切换至本地缓存，避免 Redis 故障导致 @Cacheable 方法直接抛异常。</li>
 * </ul>
 *
 * <p>CacheName 与 TTL 与 {@link RedisConfig#cacheManager} 保持一致，
 * 通过 {@link Caffeine#expireAfterWrite(Duration)} 设置写入后过期时间。</p>
 */
@Configuration
@EnableCaching
@ConditionalOnClass(Caffeine.class)
@Profile("!real")
public class CaffeineCacheConfig {

    /** 默认缓存 TTL：30 分钟，与 RedisConfig 保持一致 */
    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(30);

    /** 用户资料缓存 TTL：10 分钟 */
    private static final Duration USER_PROFILE_TTL = Duration.ofMinutes(10);

    /** 推荐人物列表缓存 TTL：5 分钟 */
    private static final Duration MATCH_RECOMMEND_TTL = Duration.ofMinutes(5);

    /** 游客推荐列表缓存 TTL：60 秒（2026-08-12 卡顿修复，与 RedisConfig 保持一致） */
    private static final Duration GUEST_RECOMMEND_TTL = Duration.ofSeconds(60);

    /** 村口热门帖子缓存 TTL：15 分钟 */
    private static final Duration VILLAGE_HOT_POSTS_TTL = Duration.ofMinutes(15);

    /** 校园（学校）列表缓存 TTL：1 小时 */
    private static final Duration CAMPUS_SCHOOLS_TTL = Duration.ofHours(1);

    /** 每日一问缓存 TTL：1 小时 */
    private static final Duration DAILY_QUESTION_TTL = Duration.ofHours(1);

    /** 敏感词列表缓存 TTL：1 小时（变更频率低） */
    private static final Duration SENSITIVE_WORDS_TTL = Duration.ofHours(1);

    /** 系统配置缓存 TTL：30 分钟 */
    private static final Duration SYSTEM_CONFIG_TTL = Duration.ofMinutes(30);

    /** 用户兴趣标签缓存 TTL：10 分钟 */
    private static final Duration USER_TAGS_TTL = Duration.ofMinutes(10);

    /** 客户端动态配置缓存 TTL：5 分钟（Task 3.6） */
    private static final Duration CLIENT_CONFIG_TTL = Duration.ofMinutes(5);

    /** 管理后台统计缓存 TTL：5 分钟（SubTask 5.3.4） */
    private static final Duration ADMIN_STATS_TTL = Duration.ofMinutes(5);

    /**
     * 配置 Caffeine 缓存管理器。
     *
     * <p>为每个 CacheName 注册独立的 Caffeine spec（独立 TTL），
     * 与 {@link RedisConfig#cacheManager} 的 TTL 配置保持一致，
     * 确保切换缓存实现时业务行为一致。</p>
     *
     * <p>未在 {@code customCaches} 中显式注册的 CacheName 将使用默认 spec
     * （{@link #DEFAULT_CACHE_TTL}）。</p>
     *
     * @return Caffeine 缓存管理器
     */
    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        // 默认 spec：未注册的 CacheName 将使用此 spec 创建缓存
        cacheManager.setCaffeine(Caffeine.newBuilder().expireAfterWrite(DEFAULT_CACHE_TTL));

        // 按 CacheName 维度注册独立 spec（覆盖默认 spec）
        // 使用 Map.ofEntries 以支持超过 10 个 CacheName 的注册（Task 3.6 新增 CLIENT_CONFIG 后共 9 个，仍可使用 Map.of，
        // 但为后续扩展便利统一改为 ofEntries）。
        Map<String, Duration> customCaches = Map.ofEntries(
                Map.entry(CacheNames.USER_PROFILE, USER_PROFILE_TTL),
                Map.entry(CacheNames.MATCH_RECOMMEND, MATCH_RECOMMEND_TTL),
                Map.entry(CacheNames.GUEST_RECOMMEND, GUEST_RECOMMEND_TTL),
                Map.entry(CacheNames.VILLAGE_HOT_POSTS, VILLAGE_HOT_POSTS_TTL),
                Map.entry(CacheNames.CAMPUS_SCHOOLS, CAMPUS_SCHOOLS_TTL),
                Map.entry(CacheNames.DAILY_QUESTION, DAILY_QUESTION_TTL),
                Map.entry(CacheNames.SENSITIVE_WORDS, SENSITIVE_WORDS_TTL),
                Map.entry(CacheNames.SYSTEM_CONFIG, SYSTEM_CONFIG_TTL),
                Map.entry(CacheNames.USER_TAGS, USER_TAGS_TTL),
                Map.entry(CacheNames.CLIENT_CONFIG, CLIENT_CONFIG_TTL),
                Map.entry(CacheNames.ADMIN_STATS, ADMIN_STATS_TTL));

        // 为每个 CacheName 注册独立的 Caffeine 实例（独立 TTL）
        customCaches.forEach((name, ttl) ->
                cacheManager.registerCustomCache(name,
                        Caffeine.newBuilder().expireAfterWrite(ttl).build()));
        return cacheManager;
    }
}
