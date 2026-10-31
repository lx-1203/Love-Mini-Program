package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.admin.RealAdminConfigService;
import com.campuslove.api.campus.RealCampusService;
import com.campuslove.api.clientconfig.RealConfigService;
import com.campuslove.api.discover.RealDailyQuestionService;
import com.campuslove.api.discover.RecommendationCacheManager;
import com.campuslove.api.repository.SensitiveWordRepository;
import com.campuslove.api.village.HotScoreScheduler;
import com.campuslove.api.village.RealPostTagService;
import com.campuslove.api.village.VillageQueryService;
import java.lang.reflect.Method;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * P2 防击穿修复的配置侧不变量：{@code sync=true} 与「允许缓存 null」必须成对出现。
 *
 * <p>背景（逐条核对过 spring-data-redis 3.3.1 字节码）：</p>
 * <ul>
 *   <li>{@code RedisCache#get(Object, Callable)} 的 sync 分支在回源后
 *       <b>无条件 {@code put}</b>（不评估 {@code unless}）；</li>
 *   <li>{@code put(null)} 在该缓存 {@code disableCachingNullValues()} 时
 *       走 {@code processAndCheckValue} 直接抛
 *       {@code IllegalArgumentException("Cache 'x' does not allow 'null' values")}；</li>
 *   <li>该版本的 {@code RedisCacheConfiguration} <b>没有</b> {@code allowCacheNullValues()}，
 *       所以只能为白名单缓存另取 {@code defaultCacheConfig()} 的 null 容忍基线。</li>
 * </ul>
 *
 * <p>因此这里用三条断言把「注解」和「缓存配置」钉在一起，任何一半单独改动都会红。</p>
 */
class RedisSyncCachePolicyTest {

    /** 全仓携带 {@code @Cacheable} 的类（新增缓存方法时同步补进这里）。 */
    private static final List<Class<?>> CACHEABLE_CLASSES = List.of(
            RealAdminConfigService.class,
            RealCampusService.class,
            RealConfigService.class,
            RealDailyQuestionService.class,
            RecommendationCacheManager.class,
            SensitiveWordRepository.class,
            HotScoreScheduler.class,
            RealPostTagService.class,
            VillageQueryService.class);

    /** 用与 {@code RedisConfig#cacheManager} 相同的「禁止 null」基线构建配置表。 */
    private static RedisCacheConfiguration strictBase() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()));
    }

    @Test
    @DisplayName("白名单：游客推荐与村口热度榜允许缓存 null，其余保持禁止")
    void perCacheConfig_nullPolicyIsLimitedToSyncCaches() {
        Map<String, RedisCacheConfiguration> configs =
                RedisConfig.buildCacheConfigurations(strictBase());

        // sync 的两个缓存：null 容忍（否则 null 回源直接抛异常）
        assertTrue(configs.get(CacheNames.GUEST_RECOMMEND).getAllowCacheNullValues(),
                "guest_recommend 开了 sync，必须允许缓存 null");
        assertTrue(configs.get(CacheNames.VILLAGE_HOT_POSTS).getAllowCacheNullValues(),
                "village_hot_posts 开了 sync，必须允许缓存 null");

        // 其余缓存：维持原 disableCachingNullValues() 行为
        for (Map.Entry<String, RedisCacheConfiguration> entry : configs.entrySet()) {
            if (RedisConfig.isSyncLoadedCache(entry.getKey())) {
                continue;
            }
            assertFalse(entry.getValue().getAllowCacheNullValues(),
                    entry.getKey() + " 未开 sync，不应改变原有的禁止 null 行为");
        }
    }

    @Test
    @DisplayName("切 null 策略不得顺手改掉 TTL")
    void perCacheConfig_ttlsArePreserved() {
        Map<String, RedisCacheConfiguration> configs =
                RedisConfig.buildCacheConfigurations(strictBase());

        assertEquals(Duration.ofSeconds(60), configs.get(CacheNames.GUEST_RECOMMEND).getTtl(),
                "游客推荐仍应 60 秒（空结果缓存的新鲜度上限就是它）");
        assertEquals(Duration.ofMinutes(15), configs.get(CacheNames.VILLAGE_HOT_POSTS).getTtl());
        assertEquals(Duration.ofMinutes(30), configs.get(CacheNames.SYSTEM_CONFIG).getTtl());
        assertEquals(Duration.ofMinutes(5), configs.get(CacheNames.CLIENT_CONFIG).getTtl());
        assertEquals(Duration.ofHours(1), configs.get(CacheNames.CAMPUS_SCHOOLS).getTtl());
        // key/value 序列化器必须原样搬过去，否则缓存命中反序列化回归
        assertNotNull(configs.get(CacheNames.GUEST_RECOMMEND).getKeySerializationPair());
        assertNotNull(configs.get(CacheNames.GUEST_RECOMMEND).getValueSerializationPair());
    }

    @Test
    @DisplayName("每个 @Cacheable(sync=true) 方法所在的缓存都必须在 null 容忍白名单里")
    void syncAnnotations_arePairedWithNullTolerantCacheConfig() {
        List<String> syncCaches = new ArrayList<>();
        List<String> violations = new ArrayList<>();

        for (Class<?> clazz : CACHEABLE_CLASSES) {
            for (Method method : clazz.getDeclaredMethods()) {
                Cacheable cacheable = method.getAnnotation(Cacheable.class);
                if (cacheable == null || !cacheable.sync()) {
                    continue;
                }
                for (String cacheName : cacheable.cacheNames()) {
                    syncCaches.add(clazz.getSimpleName() + "#" + method.getName() + " -> " + cacheName);
                    if (!RedisConfig.isSyncLoadedCache(cacheName)) {
                        violations.add(clazz.getSimpleName() + "#" + method.getName()
                                + " 开了 sync，但 " + cacheName
                                + " 不在 RedisConfig.SYNC_LOADED_CACHES（null 回源会抛异常）");
                    }
                    if (!cacheable.unless().isEmpty()) {
                        violations.add(clazz.getSimpleName() + "#" + method.getName()
                                + " 开了 sync 却还留着 unless（sync 路径不评估 unless，只会误导读者）");
                    }
                }
            }
        }

        assertFalse(syncCaches.isEmpty(), "应至少扫到游客推荐与热度榜两处 sync");
        assertEquals(List.of(), violations, "sync 与 null 策略必须成对配置：\n" + String.join("\n", violations));
    }

    @Test
    @DisplayName("白名单只有游客推荐与热度榜两处（扩大范围需重新评估 null 语义）")
    void syncWhitelist_isExactlyTheTwoSharedExpensiveReads() {
        assertEquals(2, RedisConfig.SYNC_LOADED_CACHES.size());
        assertTrue(RedisConfig.isSyncLoadedCache(CacheNames.GUEST_RECOMMEND));
        assertTrue(RedisConfig.isSyncLoadedCache(CacheNames.VILLAGE_HOT_POSTS));
        // 登录推荐刻意排除：方法体扣配额，sync 会把「配额耗尽」的空结果缓存 5 分钟
        assertFalse(RedisConfig.isSyncLoadedCache(CacheNames.MATCH_RECOMMEND));
        assertFalse(RedisConfig.isSyncLoadedCache(CacheNames.SYSTEM_CONFIG));
    }
}
