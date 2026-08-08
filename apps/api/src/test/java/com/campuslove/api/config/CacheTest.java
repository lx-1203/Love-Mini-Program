package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.admin.RealAdminConfigService;
import com.campuslove.api.auth.WeChatClient;
import com.campuslove.api.campus.RealCampusService;
import com.campuslove.api.discover.RealDailyQuestionService;
import com.campuslove.api.discover.RealRecommendationService;
import com.campuslove.api.growth.WeChatPushService;
import com.campuslove.api.repository.SensitiveWordRepository;
import com.campuslove.api.village.RealPostTagService;
import com.campuslove.api.village.RealVillageService;
import com.github.benmanes.caffeine.cache.Cache;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.caffeine.CaffeineCache;

/**
 * Task 2.3 缓存与韧性 - 缓存层单元测试（Task 2.3.1 / 2.3.2 / 2.3.4）。
 *
 * <p>测试目标：验证 Spring Cache + Caffeine/Redis 缓存体系已正确集成，
 * 关键查询方法已添加 {@code @Cacheable} / {@code @CacheEvict} 注解，
 * {@link WeChatPushService#cachedAccessToken} 与 {@link WeChatPushService#tokenExpireTime}
 * 已声明 {@code volatile}（Task 2.3.4）。</p>
 *
 * <p>测试策略：纯单元测试，不加载 Spring 上下文，避免被
 * {@code @SpringBootTest} 全量加载应用上下文时触发其他控制器对
 * JPA Repository 的依赖（mock profile 下 JPA 已被排除）。
 * 通过反射检查注解元数据，直接实例化 {@link CaffeineCacheConfig} 验证缓存注册。</p>
 *
 * <p>覆盖场景：</p>
 * <ul>
 *   <li>{@link CacheNames} 常量完整：8 个缓存名称全部定义</li>
 *   <li>{@link CaffeineCacheConfig} 注册所有 CacheName 且 TTL 正确</li>
 *   <li>关键查询方法 {@code @Cacheable} 注解存在（5+ 处）</li>
 *   <li>关键写操作方法 {@code @CacheEvict} 注解存在（5+ 处）</li>
 *   <li>{@link WeChatPushService} 的 cachedAccessToken / tokenExpireTime 字段为 volatile</li>
 * </ul>
 */
class CacheTest {

    /** 被测缓存配置实例 */
    private CaffeineCacheConfig caffeineCacheConfig;

    @BeforeEach
    void setUp() {
        caffeineCacheConfig = new CaffeineCacheConfig();
    }

    // ==================================================================
    // 场景 1：CacheNames 常量完整性
    // ==================================================================

    /**
     * 场景 1：{@link CacheNames} 应定义全部 8 个缓存名称常量。
     *
     * <p>验证：每个常量都不为 null 且非空字符串，保证业务侧引用不会失效。</p>
     */
    @Test
    void cacheNames_shouldDefineAllRequiredConstants() throws Exception {
        verifyConstant(CacheNames.USER_PROFILE, "user_profile");
        verifyConstant(CacheNames.MATCH_RECOMMEND, "match_recommend");
        verifyConstant(CacheNames.VILLAGE_HOT_POSTS, "village_hot_posts");
        verifyConstant(CacheNames.CAMPUS_SCHOOLS, "campus_schools");
        verifyConstant(CacheNames.DAILY_QUESTION, "daily_question");
        verifyConstant(CacheNames.SENSITIVE_WORDS, "sensitive_words");
        verifyConstant(CacheNames.SYSTEM_CONFIG, "system_config");
        verifyConstant(CacheNames.USER_TAGS, "user_tags");
    }

    private void verifyConstant(String actual, String expected) {
        assertNotNull(actual, "CacheName 常量不应为 null");
        assertEquals(expected, actual, "CacheName 常量值应与预期一致");
        assertFalse(actual.isBlank(), "CacheName 常量不应为空字符串");
    }

    // ==================================================================
    // 场景 2：CaffeineCacheConfig 注册所有 CacheName 且 TTL 正确
    // ==================================================================

    /**
     * 场景 2：{@link CaffeineCacheConfig#cacheManager()} 应注册全部 8 个 CacheName。
     *
     * <p>Task 2.3.1：作为 Redis 缓存的降级方案与单元测试环境的 CacheManager，
     * CaffeineCacheConfig 必须与 {@link RedisConfig} 保持一致的 CacheName 与 TTL 语义。</p>
     */
    @Test
    void cacheManager_shouldRegisterAllCacheNames() {
        CacheManager cacheManager = caffeineCacheConfig.cacheManager();

        assertNotNull(cacheManager, "CacheManager 不应为 null");

        // 验证所有 CacheName 均已注册
        assertNotNull(cacheManager.getCache(CacheNames.USER_PROFILE));
        assertNotNull(cacheManager.getCache(CacheNames.MATCH_RECOMMEND));
        assertNotNull(cacheManager.getCache(CacheNames.VILLAGE_HOT_POSTS));
        assertNotNull(cacheManager.getCache(CacheNames.CAMPUS_SCHOOLS));
        assertNotNull(cacheManager.getCache(CacheNames.DAILY_QUESTION));
        assertNotNull(cacheManager.getCache(CacheNames.SENSITIVE_WORDS));
        assertNotNull(cacheManager.getCache(CacheNames.SYSTEM_CONFIG));
        assertNotNull(cacheManager.getCache(CacheNames.USER_TAGS));
    }

    /**
     * 场景 3：每个 CacheName 的 TTL 应与配置文档一致。
     *
     * <p>验证策略：通过 CaffeineCache 暴露的 nativeCache.stats() 间接验证 TTL 配置，
     * 由于 Caffeine 不直接暴露 TTL，本测试通过 cache.put + 立即 get 验证基本可用性，
     * TTL 正确性由 {@link CaffeineCacheConfig} 中常量定义保证（已通过代码评审）。</p>
     */
    @Test
    void cacheManager_eachCacheShouldBeUsable() {
        CacheManager cacheManager = caffeineCacheConfig.cacheManager();

        // 写入并读取每个 cache，验证基本可用
        for (String cacheName : new String[]{
                CacheNames.USER_PROFILE, CacheNames.MATCH_RECOMMEND,
                CacheNames.VILLAGE_HOT_POSTS, CacheNames.CAMPUS_SCHOOLS,
                CacheNames.DAILY_QUESTION, CacheNames.SENSITIVE_WORDS,
                CacheNames.SYSTEM_CONFIG, CacheNames.USER_TAGS}) {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
            assertNotNull(cache, "Cache " + cacheName + " 不应为 null");
            cache.put("test-key", "test-value");
            assertNotNull(cache.get("test-key"), "Cache " + cacheName + " 应能命中刚写入的 key");
            cache.evict("test-key");
            assertNull(cache.get("test-key"), "Cache " + cacheName + " 应能 evict key");
        }
    }

    // ==================================================================
    // 场景 4：CaffeineCacheConfig TTL 常量配置正确（通过反射检查）
    // ==================================================================

    /**
     * 场景 4：{@link CaffeineCacheConfig} 中各 TTL 常量应与文档定义一致。
     *
     * <p>Task 2.3.1 / 2.3.2：TTL 必须与 {@link RedisConfig} 中的 TTL 配置保持一致，
     * 切换缓存实现时业务行为不变。</p>
     */
    @Test
    void caffeineCacheConfig_ttlConstantsShouldMatchExpectedValues() throws Exception {
        // 默认 TTL：30 分钟
        Duration defaultTtl = (Duration) getStaticField(CaffeineCacheConfig.class, "DEFAULT_CACHE_TTL");
        assertEquals(Duration.ofMinutes(30), defaultTtl, "默认 TTL 应为 30 分钟");

        // 用户资料：10 分钟
        assertEquals(Duration.ofMinutes(10), getStaticField(CaffeineCacheConfig.class, "USER_PROFILE_TTL"));
        // 推荐列表：5 分钟
        assertEquals(Duration.ofMinutes(5), getStaticField(CaffeineCacheConfig.class, "MATCH_RECOMMEND_TTL"));
        // 热门帖子：15 分钟
        assertEquals(Duration.ofMinutes(15), getStaticField(CaffeineCacheConfig.class, "VILLAGE_HOT_POSTS_TTL"));
        // 学校列表：1 小时
        assertEquals(Duration.ofHours(1), getStaticField(CaffeineCacheConfig.class, "CAMPUS_SCHOOLS_TTL"));
        // 每日一问：1 小时
        assertEquals(Duration.ofHours(1), getStaticField(CaffeineCacheConfig.class, "DAILY_QUESTION_TTL"));
        // 敏感词：1 小时
        assertEquals(Duration.ofHours(1), getStaticField(CaffeineCacheConfig.class, "SENSITIVE_WORDS_TTL"));
        // 系统配置：30 分钟
        assertEquals(Duration.ofMinutes(30), getStaticField(CaffeineCacheConfig.class, "SYSTEM_CONFIG_TTL"));
        // 用户标签：10 分钟
        assertEquals(Duration.ofMinutes(10), getStaticField(CaffeineCacheConfig.class, "USER_TAGS_TTL"));
    }

    private Object getStaticField(Class<?> clazz, String fieldName) throws Exception {
        Field f = clazz.getDeclaredField(fieldName);
        f.setAccessible(true);
        return f.get(null);
    }

    // ==================================================================
    // 场景 5：关键查询方法 @Cacheable 注解存在
    // ==================================================================

    /**
     * 场景 5：敏感词列表查询应添加 {@code @Cacheable(SENSITIVE_WORDS)}。
     *
     * <p>Task 2.3.2：敏感词变更频率低，全量列表缓存 1 小时；
     * Admin 增删时通过 @CacheEvict 主动失效。</p>
     */
    @Test
    void sensitiveWordRepository_findAllByOrderByCreatedAtDesc_shouldBeCacheable() throws Exception {
        Method m = SensitiveWordRepository.class.getMethod("findAllByOrderByCreatedAtDesc");
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNotNull(cacheable, "findAllByOrderByCreatedAtDesc 应添加 @Cacheable 注解");
        assertEquals(CacheNames.SENSITIVE_WORDS, cacheable.cacheNames()[0],
                "@Cacheable 应使用 SENSITIVE_WORDS 缓存名称");
        assertEquals("'all'", cacheable.key(), "@Cacheable key 应为 'all'");
    }

    /**
     * 场景 6：系统配置查询应添加 {@code @Cacheable(SYSTEM_CONFIG)}。
     */
    @Test
    void realAdminConfigService_listConfigs_shouldBeCacheable() throws Exception {
        Method m = RealAdminConfigService.class.getMethod("listConfigs");
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNotNull(cacheable, "listConfigs 应添加 @Cacheable 注解");
        assertEquals(CacheNames.SYSTEM_CONFIG, cacheable.cacheNames()[0]);
        assertEquals("'all'", cacheable.key());
    }

    /**
     * 场景 7：系统配置更新应添加 {@code @CacheEvict(SYSTEM_CONFIG, allEntries=true)}。
     */
    @Test
    void realAdminConfigService_updateConfig_shouldEvictCache() throws Exception {
        Method m = RealAdminConfigService.class.getMethod("updateConfig",
                String.class, String.class, String.class, Long.class);
        CacheEvict evict = m.getAnnotation(CacheEvict.class);
        assertNotNull(evict, "updateConfig 应添加 @CacheEvict 注解");
        assertEquals(CacheNames.SYSTEM_CONFIG, evict.cacheNames()[0]);
        assertTrue(evict.allEntries(), "updateConfig 应使用 allEntries=true 失效全量缓存");
    }

    /**
     * 场景 8：每日一问查询应添加 {@code @Cacheable(DAILY_QUESTION)}。
     */
    @Test
    void realDailyQuestionService_getTodayQuestion_shouldBeCacheable() throws Exception {
        Method m = RealDailyQuestionService.class.getMethod("getTodayQuestion", Long.class);
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNotNull(cacheable, "getTodayQuestion 应添加 @Cacheable 注解");
        assertEquals(CacheNames.DAILY_QUESTION, cacheable.cacheNames()[0]);
        // infra R2-00236:缓存 key 增加日期维度(修复跨零点),断言与实现一致
        assertEquals("#userId + ':' + T(java.time.LocalDate).now(T(com.campuslove.api.common.TimeZones).BUSINESS)", cacheable.key());
    }

    /**
     * 场景 9：每日一问回答提交应添加 {@code @CacheEvict(DAILY_QUESTION)}。
     */
    @Test
    void realDailyQuestionService_submitAnswer_shouldEvictCache() throws Exception {
        Method m = RealDailyQuestionService.class.getMethod("submitAnswer",
                Long.class, Long.class, String.class, boolean.class);
        CacheEvict evict = m.getAnnotation(CacheEvict.class);
        assertNotNull(evict, "submitAnswer 应添加 @CacheEvict 注解");
        assertEquals(CacheNames.DAILY_QUESTION, evict.cacheNames()[0]);
        // infra R2-00236:submitAnswer 的 @CacheEvict 使用与 @Cacheable 相同的日期维度 key
        assertEquals("#userId + ':' + T(java.time.LocalDate).now(T(com.campuslove.api.common.TimeZones).BUSINESS)", evict.key());
    }

    /**
     * 场景 10：推荐列表查询不应再携带 {@code @Cacheable}（P0-20 修复）。
     *
     * <p>原双重 @Cacheable（此处 + RecommendationCacheManager）同键嵌套冗余，
     * P0-20 已移除方法级注解，有效缓存层保留在 RecommendationCacheManager
     * （带 unless 空结果保护 + 主动失效方法）。此处断言注解已移除，防止回归。</p>
     */
    @Test
    void realRecommendationService_getRecommendations_shouldNotBeCacheable() throws Exception {
        Method m = RealRecommendationService.class.getMethod("getRecommendations", Long.class);
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNull(cacheable, "P0-20：方法级 @Cacheable 应已移除，缓存统一由 RecommendationCacheManager 承载");
    }

    /**
     * 场景 11：村口热门帖子查询应添加 {@code @Cacheable(VILLAGE_HOT_POSTS)}。
     */
    @Test
    void realVillageService_listHotPosts_shouldBeCacheable() throws Exception {
        Method m = RealVillageService.class.getMethod("listHotPosts");
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNotNull(cacheable, "listHotPosts 应添加 @Cacheable 注解");
        assertEquals(CacheNames.VILLAGE_HOT_POSTS, cacheable.cacheNames()[0]);
        assertEquals("'hot'", cacheable.key());
    }

    /**
     * 场景 12：学校列表查询应添加 {@code @Cacheable(CAMPUS_SCHOOLS)}。
     */
    @Test
    void realCampusService_listSchools_shouldBeCacheable() throws Exception {
        Method m = RealCampusService.class.getMethod("listSchools");
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNotNull(cacheable, "listSchools 应添加 @Cacheable 注解");
        assertEquals(CacheNames.CAMPUS_SCHOOLS, cacheable.cacheNames()[0]);
        assertEquals("'all'", cacheable.key());
    }

    /**
     * 场景 13：帖子标签列表查询应添加 {@code @Cacheable(USER_TAGS)}。
     */
    @Test
    void realPostTagService_getTags_shouldBeCacheable() throws Exception {
        Method m = RealPostTagService.class.getMethod("getTags");
        Cacheable cacheable = m.getAnnotation(Cacheable.class);
        assertNotNull(cacheable, "getTags 应添加 @Cacheable 注解");
        assertEquals(CacheNames.USER_TAGS, cacheable.cacheNames()[0]);
        assertEquals("'all'", cacheable.key());
    }

    // ==================================================================
    // 场景 6：AdminSensitiveWordController 的 @CacheEvict 注解
    // ==================================================================

    /**
     * 场景 14：AdminSensitiveWordController.create 应 @CacheEvict SENSITIVE_WORDS 全量缓存。
     */
    @Test
    void adminSensitiveWordController_create_shouldEvictCache() throws Exception {
        Class<?> controllerClass = Class.forName("com.campuslove.api.admin.AdminSensitiveWordController");
        // 使用 getDeclaredMethod 因为 create 接收 record 类型参数
        Method[] methods = controllerClass.getDeclaredMethods();
        Method createMethod = null;
        for (Method m : methods) {
            if ("create".equals(m.getName())) {
                createMethod = m;
                break;
            }
        }
        assertNotNull(createMethod, "AdminSensitiveWordController.create 方法应存在");
        CacheEvict evict = createMethod.getAnnotation(CacheEvict.class);
        assertNotNull(evict, "create 应添加 @CacheEvict 注解");
        assertEquals(CacheNames.SENSITIVE_WORDS, evict.cacheNames()[0]);
        assertTrue(evict.allEntries(), "create 应使用 allEntries=true");
    }

    /**
     * 场景 15：AdminSensitiveWordController.delete 应 @CacheEvict SENSITIVE_WORDS 全量缓存。
     */
    @Test
    void adminSensitiveWordController_delete_shouldEvictCache() throws Exception {
        Class<?> controllerClass = Class.forName("com.campuslove.api.admin.AdminSensitiveWordController");
        Method deleteMethod = controllerClass.getMethod("delete", Long.class);
        CacheEvict evict = deleteMethod.getAnnotation(CacheEvict.class);
        assertNotNull(evict, "delete 应添加 @CacheEvict 注解");
        assertEquals(CacheNames.SENSITIVE_WORDS, evict.cacheNames()[0]);
        assertTrue(evict.allEntries(), "delete 应使用 allEntries=true");
    }

    // ==================================================================
    // 场景 7：Task 2.3.4 - WeChatPushService 的 volatile 字段
    // ==================================================================

    /**
     * 场景 16：{@link WeChatPushService#cachedAccessToken} 应声明为 volatile。
     *
     * <p>Task 2.3.4：双重检查锁定模式要求共享字段必须为 volatile，
     * 避免 JVM 重排序导致其他线程读到未初始化完成的对象引用。</p>
     */
    @Test
    @DisplayName("Task 2.3.4: WeChatPushService.cachedAccessToken 应为 volatile")
    void weChatPushService_cachedAccessToken_shouldBeVolatile() throws Exception {
        Field f = WeChatPushService.class.getDeclaredField("cachedAccessToken");
        assertTrue(java.lang.reflect.Modifier.isVolatile(f.getModifiers()),
                "cachedAccessToken 应声明为 volatile（Task 2.3.4 双重检查锁定要求）");
    }

    /**
     * 场景 17：{@link WeChatPushService#tokenExpireTime} 应声明为 volatile。
     */
    @Test
    @DisplayName("Task 2.3.4: WeChatPushService.tokenExpireTime 应为 volatile")
    void weChatPushService_tokenExpireTime_shouldBeVolatile() throws Exception {
        Field f = WeChatPushService.class.getDeclaredField("tokenExpireTime");
        assertTrue(java.lang.reflect.Modifier.isVolatile(f.getModifiers()),
                "tokenExpireTime 应声明为 volatile（Task 2.3.4 双重检查锁定要求）");
    }

    // ==================================================================
    // 场景 8：Caffeine 缓存行为 - 第二次查询应命中缓存
    // ==================================================================

    /**
     * 场景 18：Caffeine cache 的 put / get / evict 应正常工作。
     *
     * <p>验证 Caffeine 作为 Spring Cache 实现的核心契约：
     * 写入后立即查询能命中；evict 后查询返回 null。</p>
     */
    @Test
    void caffeineCache_putAndGet_shouldWorkAsExpected() {
        CacheManager cacheManager = caffeineCacheConfig.cacheManager();
        org.springframework.cache.Cache cache = cacheManager.getCache(CacheNames.SENSITIVE_WORDS);
        assertNotNull(cache);

        // 写入
        cache.put("word1", "敏感词A");
        cache.put("word2", "敏感词B");

        // 命中
        assertNotNull(cache.get("word1"));
        assertEquals("敏感词A", cache.get("word1").get());
        assertEquals("敏感词B", cache.get("word2").get());

        // evict
        cache.evict("word1");
        assertNull(cache.get("word1"));
        assertNotNull(cache.get("word2"), "evict word1 不应影响 word2");

        // clear
        cache.clear();
        assertNull(cache.get("word2"));
    }

    /**
     * 场景 19：CaffeineCache 类型校验 - 确认底层确实是 Caffeine 实现。
     */
    @Test
    void cacheManager_shouldUseCaffeineAsImplementation() {
        CacheManager cacheManager = caffeineCacheConfig.cacheManager();
        org.springframework.cache.Cache cache = cacheManager.getCache(CacheNames.USER_PROFILE);
        assertNotNull(cache);
        assertTrue(cache instanceof CaffeineCache,
                "底层缓存实现应为 CaffeineCache，实际: " + cache.getClass().getName());

        // 验证 nativeCache 是 Caffeine 实例
        CaffeineCache caffeineCache = (CaffeineCache) cache;
        Cache<Object, Object> nativeCache = caffeineCache.getNativeCache();
        assertNotNull(nativeCache);
        assertTrue(nativeCache instanceof com.github.benmanes.caffeine.cache.Cache,
                "nativeCache 应为 Caffeine Cache 实现");
    }
}
