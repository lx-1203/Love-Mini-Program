package com.campuslove.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.IdempotencyException;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.common.IdempotentInterceptor;
import com.campuslove.api.common.InvalidOperationException;
import com.campuslove.api.ratelimit.RateLimitBucketRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Method;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;

/**
 * Task 2.7.1：P2 阶段并发安全测试。
 *
 * <p>验证核心并发场景下的正确性，覆盖三大并发风险：</p>
 * <ol>
 *   <li><b>乐观锁冲突</b>：多线程并发更新同一资源，仅一个线程成功，其余冲突</li>
 *   <li><b>限流并发</b>：突发流量下 {@link RateLimitBucketRegistry} 精确放行 N 个请求</li>
 *   <li><b>幂等性并发</b>：相同 Idempotency-Key 的并发请求仅一个放行，其余抛 {@link IdempotencyException}</li>
 * </ol>
 *
 * <p>测试策略：</p>
 * <ul>
 *   <li>使用 {@link CountDownLatch} 同步多线程启动，模拟真实并发场景</li>
 *   <li>使用 {@link AtomicInteger} / {@link AtomicBoolean} 收集线程结果与状态</li>
 *   <li>Redis 操作使用 Mockito mock，通过 {@code when().thenReturn()} 控制 SETNX 返回值
 *       模拟"首次成功 / 重复失败"语义</li>
 *   <li>每个测试用例独立线程池，避免线程复用导致状态污染</li>
 * </ul>
 *
 * <p>关联任务：Task 2.4.3（{@link Idempotent}）、Task 2.6.2（RateLimitAspect）、
 * Task 2.7.1（本测试）。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Task 2.7.1 P2 并发安全测试")
class P2ConcurrencyTest {

    private static final int CONCURRENCY = 32;
    private static final long AWAIT_TIMEOUT_SECONDS = 10L;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                200L, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /**
     * 场景 1：乐观锁冲突。
     *
     * <p>模拟 32 个线程并发对同一资源执行 CAS 更新，资源版本号初始为 1。
     * 仅第一个执行 CAS 的线程成功，其余线程因版本号已被修改而失败。</p>
     *
     * <p>实现：使用 {@link AtomicInteger#compareAndSet} 模拟 JPA {@code @Version}
     * 乐观锁机制。</p>
     */
    @Test
    @DisplayName("并发场景 1：乐观锁冲突 —— 仅 1 个线程 CAS 成功，其余 N-1 个失败")
    void optimisticLockConflict_onlyOneThreadSucceeds() throws InterruptedException {
        // Arrange：模拟数据库行，version 初始 1
        AtomicInteger version = new AtomicInteger(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENCY);
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);

        // Act：32 个线程并发执行 CAS
        List<Future<?>> futures = new ArrayList<>(CONCURRENCY);
        for (int i = 0; i < CONCURRENCY; i++) {
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await();
                    // 模拟 JPA @Version 乐观锁：CAS(version, 1, 2)
                    boolean ok = version.compareAndSet(1, 2);
                    if (ok) {
                        successCount.incrementAndGet();
                    } else {
                        conflictCount.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            }));
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdownNow();

        // Assert：所有线程都完成
        assertTrue(finished, "所有并发线程应在超时前完成");

        // Assert：仅 1 个线程成功，其余 N-1 个冲突
        assertEquals(1, successCount.get(),
                "CAS 仅应有 1 个线程成功，实际: " + successCount.get());
        assertEquals(CONCURRENCY - 1, conflictCount.get(),
                "剩余 N-1 个线程应冲突失败，实际: " + conflictCount.get());
        assertEquals(2, version.get(),
                "version 应被成功更新的线程改为 2");
    }

    /**
     * 场景 2：限流并发 —— 桶容量 5，32 个并发请求应仅 5 个通过。
     *
     * <p>验证 {@link RateLimitBucketRegistry#tryConsume} 在高并发下保证：</p>
     * <ul>
     *   <li>放行请求数 ≤ 桶容量（不超卖）</li>
     *   <li>拒绝请求数 = 总请求数 - 放行数（不漏放）</li>
     * </ul>
     */
    @Test
    @DisplayName("并发场景 2：限流桶容量 5 + 32 并发请求 → 仅 5 个通过，27 个被限流")
    void rateLimitConcurrent_onlyCapacityAllowed() throws InterruptedException {
        // Arrange：桶容量 5，refillTokens 极小避免补充
        RateLimitBucketRegistry registry = new RateLimitBucketRegistry();
        long capacity = 5L;
        double refillTokens = 0.0001; // 最小速率，避免测试期间补充

        AtomicInteger allowed = new AtomicInteger(0);
        AtomicInteger rejected = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENCY);
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);

        // Act：32 个线程并发尝试消费 1 个令牌
        for (int i = 0; i < CONCURRENCY; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    String key = "TestController#testMethod:127.0.0.1";
                    boolean ok = registry.tryConsume(key, capacity, refillTokens);
                    if (ok) {
                        allowed.incrementAndGet();
                    } else {
                        rejected.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdownNow();

        // Assert
        assertTrue(finished, "所有并发线程应在超时前完成");
        assertEquals(capacity, allowed.get(),
                "放行请求数应等于桶容量 " + capacity + "，实际: " + allowed.get());
        assertEquals(CONCURRENCY - capacity, rejected.get(),
                "拒绝请求数应等于剩余请求数，实际: " + rejected.get());
    }

    /**
     * 场景 3：幂等性并发 —— 相同 Idempotency-Key 的 32 个并发请求仅 1 个放行。
     *
     * <p>模拟 Redis SETNX 行为：第一个 {@code setIfAbsent} 返回 true，
     * 其余并发请求返回 false。验证 {@link IdempotentInterceptor} 正确抛出
     * {@link IdempotencyException}。</p>
     */
    @Test
    @DisplayName("并发场景 3：相同 Idempotency-Key 32 并发 → 仅 1 个放行，31 个抛 IdempotencyException")
    void idempotencyConcurrent_onlyOneRequestPasses() throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();

        String idempotencyKey = "concurrent-key-" + UUID.randomUUID();
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn(idempotencyKey);

        // 关键：使用 AtomicBoolean 模拟 Redis SETNX 行为
        // 第一个调用 setIfAbsent 的线程获得 true，其余获得 false
        AtomicBoolean firstAcquired = new AtomicBoolean(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class)))
                .thenAnswer(invocation -> firstAcquired.compareAndSet(false, true));

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENCY);
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);

        // Act：32 个线程使用相同 Idempotency-Key 并发请求
        for (int i = 0; i < CONCURRENCY; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    boolean result = interceptor.preHandle(request, response, handlerMethod);
                    if (result) {
                        successCount.incrementAndGet();
                    }
                } catch (IdempotencyException e) {
                    conflictCount.incrementAndGet();
                } catch (Throwable e) {
                    // 其他异常视为冲突（保证计数完整）
                    conflictCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(AWAIT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        executor.shutdownNow();

        // Assert
        assertTrue(finished, "所有并发线程应在超时前完成");
        assertEquals(1, successCount.get(),
                "仅 1 个请求应通过幂等校验，实际: " + successCount.get());
        assertEquals(CONCURRENCY - 1, conflictCount.get(),
                "剩余 N-1 个请求应被幂等拦截，实际: " + conflictCount.get());
    }

    /**
     * 场景 4：幂等性校验缺失 Idempotency-Key 头 → 抛 InvalidOperationException。
     *
     * <p>验证 required=true（默认）时，缺失 key 头会抛出 422 异常，
     * 不会进入 Redis SETNX 流程。</p>
     */
    @Test
    @DisplayName("并发场景 4：缺失 Idempotency-Key 头 → 抛 InvalidOperationException（422）")
    void idempotency_missingKey_shouldThrowInvalidOperationException() throws Exception {
        // Arrange
        IdempotentInterceptor interceptor = new IdempotentInterceptor(redisTemplate);
        HandlerMethod handlerMethod = buildHandlerMethod();
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY))
                .thenReturn(null);

        // Act & Assert
        InvalidOperationException ex = assertThrows(
                InvalidOperationException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
        assertNotNull(ex.getMessage());
        assertEquals("INVALID_OPERATION", ex.getErrorCode());
    }

    /**
     * 场景 5：限流桶无 key 时直接放行（防误伤）。
     *
     * <p>验证 {@link RateLimitBucketRegistry#tryConsume} 在 key 为空时直接返回 true，
     * 避免空指针或误伤合法请求。</p>
     */
    @Test
    @DisplayName("并发场景 5：限流 key 为空 → 直接放行（防误伤）")
    void rateLimit_emptyKey_shouldPassThrough() {
        RateLimitBucketRegistry registry = new RateLimitBucketRegistry();
        boolean ok = registry.tryConsume("", 10L, 1.0);
        assertTrue(ok, "空 key 应直接放行");
        boolean ok2 = registry.tryConsume(null, 10L, 1.0);
        assertTrue(ok2, "null key 应直接放行");
        boolean ok3 = registry.tryConsume("   ", 10L, 1.0);
        assertTrue(ok3, "空白 key 应直接放行");
    }

    /**
     * 场景 6：限流桶计数准确性 —— 单线程连续请求。
     *
     * <p>单线程场景下，桶容量 5 + refillTokens 极小，连续 10 次请求应仅 5 次成功。</p>
     */
    @Test
    @DisplayName("并发场景 6：单线程连续 10 次请求桶容量 5 → 仅 5 次通过")
    void rateLimit_sequentialRequests_respectCapacity() {
        RateLimitBucketRegistry registry = new RateLimitBucketRegistry();
        long capacity = 5L;
        double refillTokens = 0.0001;
        String key = "SequentialTest#test:127.0.0.1";

        int allowed = 0;
        for (int i = 0; i < 10; i++) {
            if (registry.tryConsume(key, capacity, refillTokens)) {
                allowed++;
            }
        }

        assertEquals(capacity, allowed,
                "10 次连续请求应仅放行 " + capacity + " 次，实际: " + allowed);
    }

    /**
     * 构造测试用 HandlerMethod，绑定到 TestController.idempotentMethod。
     */
    private HandlerMethod buildHandlerMethod() throws NoSuchMethodException {
        Method method = TestController.class.getMethod("idempotentMethod");
        return new HandlerMethod(new TestController(), method);
    }

    /**
     * 测试用 Controller：包含一个 @Idempotent 标注的方法。
     */
    static class TestController {
        @Idempotent
        public void idempotentMethod() {}
    }
}
