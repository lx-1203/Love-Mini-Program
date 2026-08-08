package com.campuslove.api.ratelimit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Task 15.3：速率限制集成测试。
 *
 * <p>验证 {@link RateLimitConfig} 注册的 {@link RateLimitAspect} + {@link RateLimitBucketRegistry}
 * 组合在 10 QPS 限流场景下的端到端正确性，覆盖 REAUDIT-REPORT-100+ 编号 69
 * （限流集成测试缺失）。</p>
 *
 * <p>测试策略：</p>
 * <ul>
 *   <li><b>单元层（场景 1-3）</b>：直接测试 {@link RateLimitBucketRegistry} 的令牌桶行为，
 *       不依赖 Spring 上下文，验证 10 个请求放行 / 第 11 个拒绝 / 不同 key 独立计数</li>
 *   <li><b>切面层（场景 4-5）</b>：通过 mock {@link ProceedingJoinPoint} 调用
 *       {@link RateLimitAspect#aroundMethod}，验证切面在桶耗尽时抛出
 *       {@link RateLimitExceededException}（由 GlobalExceptionHandler 转 429）</li>
 *   <li><b>并发层（场景 6）</b>：模拟 100 并发请求容量 10 的桶，验证放行数严格等于容量，
 *       无超发（与 Task 12.5 资金类并发测试模式一致）</li>
 * </ul>
 *
 * <p>对应业务场景：FeedbackController.createIssue 配置
 * {@code @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")}，
 * 即按 IP 限流 10 次突发，每 10 秒恢复 1 次。本测试以相同参数验证桶与切面行为。</p>
 *
 * <p>不使用 @SpringBootTest 启动完整上下文，避免数据库/Redis/JWT 依赖；
 * 全局限流逻辑通过反射 + mock 切点验证，等价于真实 Controller 调用路径。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Task 15.3 速率限制集成测试：10 QPS 触发 429")
class RateLimitIntegrationTest {

    /** 模拟 FeedbackController.createIssue 的限流参数：桶容量 10，每 10 秒补 1 个令牌 */
    private static final long CAPACITY_10_QPS = 10L;
    private static final double REFILL_0_1_PER_SECOND = 0.1;

    private RateLimitBucketRegistry registry;

    @BeforeEach
    void setUp() {
        // 每个测试用例使用独立的 registry，避免桶状态在用例间污染
        registry = new RateLimitBucketRegistry();
    }

    // ==================== 场景 1：10 个请求应全部放行 ====================

    /**
     * 场景 1：桶容量 10 时，连续 10 次请求应全部返回 true（放行）。
     *
     * <p>对应 FeedbackController.createIssue 配置，验证同一 IP 在限流窗口内
     * 可提交 10 次反馈，不应被限流拒绝。</p>
     */
    @Test
    @DisplayName("场景 1: 桶容量 10 → 前 10 次请求全部放行")
    void bucketCapacity10_first10RequestsShouldBeAllowed() {
        String key = "FeedbackController#createIssue:127.0.0.1";

        for (int i = 1; i <= 10; i++) {
            boolean allowed = registry.tryConsume(key, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND);
            assertTrue(allowed, "第 " + i + " 次请求应被放行（桶容量内）");
        }
    }

    // ==================== 场景 2：第 11 次请求应被拒绝（触发 429） ====================

    /**
     * 场景 2：桶容量 10 时，第 11 次请求应返回 false（拒绝），对应 HTTP 429。
     *
     * <p>验证令牌桶耗尽后的拒绝行为：前 10 次消费完所有令牌后，第 11 次
     * 在 refill 周期（10 秒）内不会被恢复，必须拒绝。</p>
     */
    @Test
    @DisplayName("场景 2: 桶容量 10 → 第 11 次请求被拒绝（触发 429）")
    void bucketCapacity10_11thRequestShouldBeRejected() {
        String key = "FeedbackController#createIssue:127.0.0.1";

        // 消费完 10 个令牌
        for (int i = 0; i < 10; i++) {
            assertTrue(registry.tryConsume(key, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND),
                    "前 10 次应放行");
        }

        // 第 11 次应被拒绝
        boolean allowed = registry.tryConsume(key, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND);
        assertFalse(allowed, "第 11 次请求应被拒绝（令牌桶耗尽，触发 HTTP 429）");
    }

    // ==================== 场景 3：不同 key 应使用独立桶 ====================

    /**
     * 场景 3：不同限流键（如不同 IP）应有独立的令牌桶，互不影响。
     *
     * <p>对应 FeedbackController 按 {@code #request.remoteAddr} 限流的场景：
     * IP A 耗尽令牌后，IP B 仍可正常请求，不应被连坐。</p>
     */
    @Test
    @DisplayName("场景 3: 不同 key 使用独立桶，互不影响")
    void differentKeysShouldUseIndependentBuckets() {
        String ipA = "FeedbackController#createIssue:192.168.1.1";
        String ipB = "FeedbackController#createIssue:192.168.1.2";

        // IP A 耗尽 10 个令牌
        for (int i = 0; i < 10; i++) {
            assertTrue(registry.tryConsume(ipA, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND));
        }
        assertFalse(registry.tryConsume(ipA, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND),
                "IP A 第 11 次应被拒绝");

        // IP B 仍应能放行 10 次
        for (int i = 1; i <= 10; i++) {
            assertTrue(registry.tryConsume(ipB, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND),
                    "IP B 第 " + i + " 次应放行（独立桶）");
        }
        assertFalse(registry.tryConsume(ipB, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND),
                "IP B 第 11 次应被拒绝");
    }

    // ==================== 场景 4：切面在桶耗尽时抛 RateLimitExceededException ====================

    /**
     * 场景 4：{@link RateLimitAspect#aroundMethod} 在桶耗尽时抛出
     * {@link RateLimitExceededException}，由 GlobalExceptionHandler 转 HTTP 429。
     *
     * <p>验证切面与异常处理链的衔接：切面不应吞掉异常，应直接传播给上层。</p>
     */
    @Test
    @DisplayName("场景 4: 切面在桶耗尽时抛 RateLimitExceededException（→ HTTP 429）")
    void aspectShouldThrowRateLimitExceededExceptionWhenBucketExhausted() throws Throwable {
        RateLimitAspect aspect = new RateLimitAspect(registry, "");

        // 构造 mock 切点：方法签名 + @RateLimit 注解 + 目标方法
        ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        Method method = SampleController.class.getDeclaredMethod("rateLimitedEndpoint");
        when(signature.getMethod()).thenReturn(method);
        when(pjp.getSignature()).thenReturn(signature);
        when(pjp.getArgs()).thenReturn(new Object[0]);

        // 前 10 次调用：切面应放行并调用 pjp.proceed()
        when(pjp.proceed()).thenReturn("ok");
        for (int i = 0; i < 10; i++) {
            Object result = aspect.aroundMethod(pjp, method.getAnnotation(RateLimit.class));
            assertEquals("ok", result, "前 10 次切面应放行原方法返回值");
        }
        verify(pjp, times(10)).proceed();

        // 第 11 次调用：切面应抛 RateLimitExceededException，且不调用 pjp.proceed()
        // 注：使用 times(10) 而非 never()，因 never() 校验整个测试周期，
        // 前述循环已调用 10 次；此处断言调用总数仍为 10（第 11 次未新增调用）
        RateLimit rateLimit = method.getAnnotation(RateLimit.class);
        assertThrows(RateLimitExceededException.class,
                () -> aspect.aroundMethod(pjp, rateLimit),
                "第 11 次切面应抛 RateLimitExceededException，由 GlobalExceptionHandler 转 429");
        verify(pjp, times(10)).proceed();  // 仍是 10 次，第 11 次未进入原方法
    }

    // ==================== 场景 5：切面在桶有令牌时放行原方法 ====================

    /**
     * 场景 5：{@link RateLimitAspect#aroundMethod} 在桶有令牌时正常调用原方法并返回其结果。
     *
     * <p>验证切面在正常路径下的行为：消费 1 个令牌 → 调用 pjp.proceed() → 返回原结果。</p>
     */
    @Test
    @DisplayName("场景 5: 切面在桶有令牌时放行原方法")
    void aspectShouldProceedWhenBucketHasTokens() throws Throwable {
        RateLimitAspect aspect = new RateLimitAspect(registry, "");
        ProceedingJoinPoint pjp = mock(ProceedingJoinPoint.class);
        MethodSignature signature = mock(MethodSignature.class);
        Method method = SampleController.class.getDeclaredMethod("rateLimitedEndpoint");
        when(signature.getMethod()).thenReturn(method);
        when(pjp.getSignature()).thenReturn(signature);
        when(pjp.getArgs()).thenReturn(new Object[0]);
        when(pjp.proceed()).thenReturn("response-body");

        Object result = aspect.aroundMethod(pjp, method.getAnnotation(RateLimit.class));

        assertEquals("response-body", result);
        verify(pjp, times(1)).proceed();
    }

    // ==================== 场景 6：100 并发请求容量 10 的桶，仅 10 个放行 ====================

    /**
     * 场景 6：100 并发请求同一限流键，桶容量 10，应严格只放行 10 个，无超发。
     *
     * <p>对应实际生产中突发流量场景：用户在 1 秒内连续点击 100 次提交按钮，
     * 系统应仅放行前 10 次，第 11-100 次全部拒绝。这是 10 QPS 限流的核心保护目标。</p>
     *
     * <p>测试模式参考 Task12ConcurrencyTest：使用 CountDownLatch 同步多线程启动，
     * AtomicInteger 统计放行/拒绝次数，确保总数严格等于 100（无丢失）。</p>
     */
    @Test
    @DisplayName("场景 6: 100 并发请求容量 10 桶 → 严格 10 个放行，90 个拒绝（无超发）")
    void concurrent100Requests_capacity10Bucket_only10Allowed() throws InterruptedException {
        final int concurrency = 100;
        final String key = "FeedbackController#createIssue:10.0.0.1";
        final CountDownLatch ready = new CountDownLatch(concurrency);
        final CountDownLatch start = new CountDownLatch(1);
        final CountDownLatch done = new CountDownLatch(concurrency);
        final AtomicInteger allowedCount = new AtomicInteger(0);
        final AtomicInteger rejectedCount = new AtomicInteger(0);
        final AtomicInteger errorCount = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(concurrency);
        try {
            for (int i = 0; i < concurrency; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        start.await();
                        boolean allowed = registry.tryConsume(
                                key, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND);
                        if (allowed) {
                            allowedCount.incrementAndGet();
                        } else {
                            rejectedCount.incrementAndGet();
                        }
                    } catch (RuntimeException e) {
                        errorCount.incrementAndGet();
                    } finally {
                        done.countDown();
                    }
                    return null;
                });
            }

            // 等待所有线程就绪后统一放行，模拟真实突发并发
            assertTrue(ready.await(5L, TimeUnit.SECONDS), "线程就绪超时");
            start.countDown();
            assertTrue(done.await(10L, TimeUnit.SECONDS), "线程完成超时");

            // 断言：放行数严格等于桶容量 10，拒绝数 = 100 - 10 = 90，无错误
            assertEquals(10, allowedCount.get(),
                    "放行数应严格等于桶容量 10，无超发");
            assertEquals(90, rejectedCount.get(),
                    "拒绝数应等于 (并发数 - 桶容量) = 90");
            assertEquals(0, errorCount.get(),
                    "不应有意外异常，所有请求都应正常返回 true/false");
        } finally {
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(2L, TimeUnit.SECONDS),
                    "线程池未及时关闭");
        }
    }

    // ==================== 场景 7：空 key 应放行（防误伤） ====================

    /**
     * 场景 7：限流键为空或空白时，{@link RateLimitBucketRegistry#tryConsume} 应直接放行。
     *
     * <p>对应 SpEL 解析失败降级场景：RateLimitAspect.resolveKey 解析失败时
     * 返回 {@code 类名#方法名:fallback}，但若 SpEL 表达式为空字符串，
     * 切面会传入空 key，此时桶应放行而非误伤合法请求。</p>
     */
    @Test
    @DisplayName("场景 7: 空 key 应放行（防误伤合法请求）")
    void emptyKeyShouldBeAllowed() {
        assertTrue(registry.tryConsume(null, CAPACITY_10_QPS, REFILL_0_1_PER_SECOND),
                "null key 应放行");
        assertTrue(registry.tryConsume("", CAPACITY_10_QPS, REFILL_0_1_PER_SECOND),
                "空字符串 key 应放行");
        assertTrue(registry.tryConsume("   ", CAPACITY_10_QPS, REFILL_0_1_PER_SECOND),
                "空白 key 应放行");
    }

    // ==================== 场景 8：桶数量监控接口可用 ====================

    /**
     * 场景 8：{@link RateLimitBucketRegistry#bucketCount} 应返回已注册的桶数量。
     *
     * <p>验证监控接口的正确性：运维通过该接口感知线上限流桶规模，
     * 异常增长可能意味着 SpEL 解析失败导致每个请求生成新 key（需要告警）。</p>
     */
    @Test
    @DisplayName("场景 8: bucketCount 应正确反映已注册桶数量")
    void bucketCountShouldReflectRegisteredBuckets() {
        assertEquals(0, registry.bucketCount(), "初始状态桶数量应为 0");

        registry.tryConsume("key1", CAPACITY_10_QPS, REFILL_0_1_PER_SECOND);
        assertEquals(1, registry.bucketCount(), "1 个 key 后桶数量应为 1");

        registry.tryConsume("key2", CAPACITY_10_QPS, REFILL_0_1_PER_SECOND);
        assertEquals(2, registry.bucketCount(), "2 个不同 key 后桶数量应为 2");

        // 同一 key 重复调用不应增加桶数量
        for (int i = 0; i < 10; i++) {
            registry.tryConsume("key1", CAPACITY_10_QPS, REFILL_0_1_PER_SECOND);
        }
        assertEquals(2, registry.bucketCount(), "同一 key 重复调用不应增加桶数量");
    }

    // ========================================================================
    // 测试夹具：用于切面测试的样例 Controller 方法
    // ========================================================================

    /**
     * 测试夹具类：提供标注 {@link RateLimit} 的方法供切面测试反射调用。
     *
     * <p>使用真实注解而非 mock，确保 {@link RateLimitAspect} 通过
     * {@code @annotation(rateLimit)} 切点绑定的逻辑可被验证。</p>
     */
    static class SampleController {
        /**
         * 模拟 FeedbackController.createIssue 的限流配置。
         * 桶容量 10，每 10 秒补 1 个令牌，按 IP 限流。
         */
        @RateLimit(capacity = 10, refillTokens = 0.1, key = "#request.remoteAddr")
        String rateLimitedEndpoint() {
            return "ok";
        }
    }
}
