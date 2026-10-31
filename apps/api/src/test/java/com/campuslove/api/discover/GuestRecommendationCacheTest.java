package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.monitor.MatchMetrics;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.AnnotationCacheOperationSource;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.interceptor.CacheInterceptor;

/**
 * P2 缓存正确性修复——游客推荐缓存不再「自造惊群 + 永久穿透」。
 *
 * <p>原注解 {@code @Cacheable(key = "'guest:v1'", unless = "#result == null || #result.isEmpty()}")
 * 与 60 秒 TTL 组合出的两个问题：</p>
 * <ol>
 *   <li><b>空结果永不入缓存</b> ⇒ 候选池为空时（冷启动 / 全被过滤）每一次游客请求
 *       都全量重算 ~8 条 SQL、200 候选，是永久穿透，而不是「避免穿透」；</li>
 *   <li><b>TTL 到期的那一瞬间无人排队</b> ⇒ 同实例所有并发请求一起回源（惊群）。</li>
 * </ol>
 *
 * <p>修法：{@code sync = true} + 去掉 {@code unless}（sync 路径由缓存实现自己回填、
 * 本来就不评估 unless，留着只会误导读者）。本类用真实的
 * {@link CacheInterceptor} + {@link CaffeineCacheManager}（非 real profile 的缓存实现，
 * 其 {@code get(key, Callable)} 与 {@code RedisCache} 一样是 per-key 原子加载）
 * 验证这两点，不依赖 Redis。</p>
 */
class GuestRecommendationCacheTest {

    @Mock private RecommendationStrategy recommendationStrategy;
    @Mock private RecommendationRanker recommendationRanker;
    @Mock private MatchMetrics matchMetrics;

    private CacheManager cacheManager;
    private RecommendationCacheManager service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        cacheManager = new CaffeineCacheManager();
        CacheInterceptor interceptor = new CacheInterceptor();
        interceptor.setCacheManager(cacheManager);
        interceptor.setCacheOperationSources(new AnnotationCacheOperationSource());
        // 手工代理必须自己触发初始化：CacheAspectSupport#execute 在 initialized=false
        // 时会跳过全部缓存逻辑（容器里由 afterSingletonsInstantiated 完成）
        interceptor.afterSingletonsInstantiated();

        ProxyFactory proxyFactory =
                new ProxyFactory(new RecommendationCacheManager(recommendationStrategy, recommendationRanker, matchMetrics));
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAdvice(interceptor);
        service = (RecommendationCacheManager) proxyFactory.getProxy();
    }

    private void stubGuestCompute(List<RecommendedPersonView> result) {
        RecommendationStrategy.RecommendResult empty = new RecommendationStrategy.RecommendResult(
                List.of(), "北大", "计算机", Set.of(), Map.of(), Map.of(), Map.of());
        when(recommendationStrategy.doRecommendForGuest()).thenReturn(empty);
        when(recommendationRanker.rankAndConvert(eq(empty), isNull())).thenReturn(result);
    }

    @Test
    @DisplayName("空推荐结果同样被缓存：第二次读不再重算（原 unless 豁免会造成永久穿透）")
    void emptyGuestResult_isCached() {
        stubGuestCompute(List.of());

        List<RecommendedPersonView> first = service.getCachedGuestRecommendations();
        List<RecommendedPersonView> second = service.getCachedGuestRecommendations();

        assertTrue(first.isEmpty());
        assertTrue(second.isEmpty());
        verify(recommendationStrategy, times(1)).doRecommendForGuest();

        Cache cache = cacheManager.getCache(CacheNames.GUEST_RECOMMEND);
        assertNotNull(cache);
        assertNotNull(cache.get("guest:v1"), "空结果必须落缓存，否则空池 = 每次请求全量重算");
    }

    @Test
    @DisplayName("并发 miss 只回源一次（sync=true 串行化 refill）")
    void concurrentGuestRequests_computeOnlyOnce() throws Exception {
        AtomicInteger computeCount = new AtomicInteger();
        RecommendationStrategy.RecommendResult empty = new RecommendationStrategy.RecommendResult(
                List.of(), "北大", "计算机", Set.of(), Map.of(), Map.of(), Map.of());
        when(recommendationStrategy.doRecommendForGuest()).thenAnswer(inv -> {
            computeCount.incrementAndGet();
            // 模拟 ~8 条 SQL 的回源耗时，保证未开 sync 时并发线程一定全部落空
            Thread.sleep(120);
            return empty;
        });
        when(recommendationRanker.rankAndConvert(eq(empty), isNull())).thenReturn(List.of());

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            CountDownLatch ready = new CountDownLatch(threads);
            CountDownLatch start = new CountDownLatch(1);
            List<java.util.concurrent.Future<?>> futures = new java.util.ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    start.await();
                    service.getCachedGuestRecommendations();
                    return null;
                }));
            }
            assertTrue(ready.await(5, TimeUnit.SECONDS), "线程应全部就绪");
            start.countDown();
            for (var future : futures) {
                future.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, computeCount.get(),
                "sync=true 下同实例并发 miss 只允许一个线程回源（去掉 sync 本断言即失败）");
    }

    @Test
    @DisplayName("游客读注解：sync=true、无 unless；登录链路保持 unless 且不开 sync")
    void annotations_matchChosenStrategy() throws Exception {
        Method guest = RecommendationCacheManager.class.getMethod("getCachedGuestRecommendations");
        Cacheable guestCacheable = guest.getAnnotation(Cacheable.class);
        assertNotNull(guestCacheable);
        assertEquals(CacheNames.GUEST_RECOMMEND, guestCacheable.cacheNames()[0]);
        assertEquals("'guest:v1'", guestCacheable.key());
        assertTrue(guestCacheable.sync(), "游客固定 key 必须 sync=true 防惊群");
        assertEquals("", guestCacheable.unless(),
                "sync 路径不评估 unless；空结果必须进缓存，unless 应删除而不是留着骗人");

        Method login = RecommendationCacheManager.class.getMethod("getCachedRecommendations", Long.class);
        Cacheable loginCacheable = login.getAnnotation(Cacheable.class);
        assertNotNull(loginCacheable);
        assertEquals(CacheNames.MATCH_RECOMMEND, loginCacheable.cacheNames()[0]);
        // 登录链路刻意不开 sync：方法体第一行扣配额，且「空列表」有两种成因，
        // 一旦 sync 会把「配额耗尽」的空结果缓存 5 分钟（详见方法注释）
        assertTrue(!loginCacheable.sync(), "登录链路不得开 sync（配额副作用）");
        assertTrue(loginCacheable.unless().contains("#result.isEmpty()"),
                "登录链路必须保留 unless，避免配额耗尽的空结果进缓存");
    }
}
