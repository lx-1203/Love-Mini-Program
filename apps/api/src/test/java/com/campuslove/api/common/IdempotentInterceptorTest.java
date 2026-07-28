package com.campuslove.api.common;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Method;
import java.time.Duration;
import java.util.Collections;
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
 * {@link IdempotentInterceptor} 幂等性拦截器单元测试（Task 2.4.6 / Task 2.6）。
 *
 * <p>覆盖核心场景：
 * <ul>
 *   <li>非 HandlerMethod 处理器 → 直接放行</li>
 *   <li>方法未标注 @Idempotent → 直接放行</li>
 *   <li>缺失 Idempotency-Key 头（required=true）→ 抛 InvalidOperationException（422）</li>
 *   <li>缺失 Idempotency-Key 头（required=false）→ 跳过校验放行</li>
 *   <li>首次请求 → Redis SETNX 成功 → 放行</li>
 *   <li>重复请求 → Redis SETNX 返回 false → 抛 IdempotencyException（409）</li>
 *   <li>已认证用户 → Redis Key 包含真实 userId</li>
 *   <li>未认证用户 → Redis Key 使用 "anonymous" 兜底</li>
 *   <li>Redis 异常 → 降级放行，不抛异常</li>
 *   <li>RedisTemplate 为 null → 降级放行</li>
 *   <li>Idempotency-Key 含空白字符 → trim 后用于校验</li>
 *   <li>空字符串 Idempotency-Key → 视为缺失</li>
 *   <li>自定义 TTL 应正确传递给 Redis</li>
 * </ul>
 *
 * <p>测试策略：纯 Mockito，模拟 RedisTemplate / ValueOperations 与 Servlet 三件套。
 * SecurityContextHolder 是线程局部的，每个测试用例前手动 clear，需要认证的场景手动 set。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("IdempotentInterceptor 幂等性拦截器测试")
class IdempotentInterceptorTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    private IdempotentInterceptor interceptor;

    /** 测试用 Idempotency-Key */
    private static final String TEST_KEY = "test-idempotency-key-001";

    /** 测试用 userId */
    private static final Long TEST_USER_ID = 100L;

    /**
     * 测试用 Controller：包含三个方法，分别对应：
     * <ul>
     *   <li>createOrder：默认 @Idempotent（required=true, ttlSeconds=86400）</li>
     *   <li>optionalIdempotent：@Idempotent(required=false)</li>
     *   <li>shortTtlIdempotent：@Idempotent(ttlSeconds=60)</li>
     *   <li>noIdempotent：未标注 @Idempotent</li>
     * </ul>
     */
    static class TestController {
        @Idempotent
        public void createOrder() {}

        @Idempotent(required = false)
        public void optionalIdempotent() {}

        @Idempotent(ttlSeconds = 60)
        public void shortTtlIdempotent() {}

        public void noIdempotent() {}
    }

    @BeforeEach
    void setUp() {
        interceptor = new IdempotentInterceptor(redisTemplate);
        // 清除 SecurityContext，避免上一用例残留（线程局部）
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /**
     * 构造 HandlerMethod，绑定到 TestController 的指定方法。
     *
     * @param methodName TestController 中的方法名
     * @return HandlerMethod 实例
     * @throws NoSuchMethodException 方法不存在
     */
    private HandlerMethod handlerMethod(String methodName) throws NoSuchMethodException {
        Method method = TestController.class.getMethod(methodName);
        return new HandlerMethod(new TestController(), method);
    }

    /**
     * 设置 SecurityContext，模拟已认证用户。
     *
     * @param userId 用户 ID
     */
    private void authenticateAs(Long userId) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userId, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    /**
     * 构造期望的 Redis Key（与 IdempotentInterceptor.buildRedisKey 保持一致）。
     *
     * @param idempotencyKey 客户端传入的幂等键
     * @param userIdStr      用户 ID 字符串
     * @return 期望的 Redis Key
     */
    private String expectedRedisKey(String idempotencyKey, String userIdStr) {
        return IdempotentInterceptor.REDIS_KEY_PREFIX + idempotencyKey + ":" + userIdStr;
    }

    /* ========== 场景 1：非 HandlerMethod 处理器 → 直接放行 ========== */

    @Test
    @DisplayName("非 HandlerMethod 处理器 → 直接放行，不查 Redis")
    void preHandle_whenNotHandlerMethod_shouldReturnTrueWithoutRedis() {
        // Arrange：传入一个普通对象（非 HandlerMethod）
        Object nonHandlerMethod = new Object();

        // Act
        boolean result = interceptor.preHandle(request, response, nonHandlerMethod);

        // Assert
        assertTrue(result, "非 HandlerMethod 处理器应直接放行");
        verifyNoInteractions(redisTemplate);
    }

    /* ========== 场景 2：方法未标注 @Idempotent → 直接放行 ========== */

    @Test
    @DisplayName("方法未标注 @Idempotent → 直接放行，不查 Redis")
    void preHandle_whenNoIdempotentAnnotation_shouldReturnTrue() throws Exception {
        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("noIdempotent"));

        // Assert
        assertTrue(result, "未标注 @Idempotent 的方法应直接放行");
        verifyNoInteractions(redisTemplate);
    }

    /* ========== 场景 3：缺失 Idempotency-Key 头（required=true）→ 抛异常 ========== */

    @Test
    @DisplayName("缺失 Idempotency-Key 头（required=true）→ 抛 InvalidOperationException（422）")
    void preHandle_whenRequiredButKeyMissing_shouldThrowInvalidOperationException() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(null);

        // Act & Assert
        InvalidOperationException ex = assertThrows(InvalidOperationException.class,
                () -> interceptor.preHandle(request, response, handlerMethod("createOrder")));
        assertEquals(InvalidOperationException.ERROR_CODE, ex.getErrorCode(),
                "错误码应为 INVALID_OPERATION");
        // 不应访问 Redis（短路返回）
        verifyNoInteractions(redisTemplate);
    }

    /* ========== 场景 4：缺失 Idempotency-Key 头（required=false）→ 跳过校验放行 ========== */

    @Test
    @DisplayName("缺失 Idempotency-Key 头（required=false）→ 跳过校验放行")
    void preHandle_whenOptionalAndKeyMissing_shouldPassThrough() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(null);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("optionalIdempotent"));

        // Assert
        assertTrue(result, "required=false 且缺失 key 时应跳过校验放行");
        verifyNoInteractions(redisTemplate);
    }

    /* ========== 场景 5：首次请求 → Redis SETNX 成功 → 放行 ========== */

    @Test
    @DisplayName("首次请求 → Redis SETNX 返回 true → 放行")
    void preHandle_whenFirstRequest_shouldAcquireAndPassThrough() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).thenReturn(true);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("createOrder"));

        // Assert
        assertTrue(result, "首次请求应放行");
        // 验证 Redis Key 包含 anonymous（未认证场景）
        verify(valueOperations).setIfAbsent(
                eq(expectedRedisKey(TEST_KEY, "anonymous")), any(), any(Duration.class));
    }

    /* ========== 场景 6：重复请求 → Redis SETNX 返回 false → 抛 IdempotencyException ========== */

    @Test
    @DisplayName("重复请求 → Redis SETNX 返回 false → 抛 IdempotencyException（409）")
    void preHandle_whenDuplicateRequest_shouldThrowIdempotencyException() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).thenReturn(false);

        // Act & Assert
        IdempotencyException ex = assertThrows(IdempotencyException.class,
                () -> interceptor.preHandle(request, response, handlerMethod("createOrder")));
        assertEquals(IdempotencyException.ERROR_CODE, ex.getErrorCode(),
                "错误码应为 IDEMPOTENT_CONFLICT");
    }

    /* ========== 场景 7：已认证用户 → Redis Key 包含真实 userId ========== */

    @Test
    @DisplayName("已认证用户 → Redis Key 应包含真实 userId")
    void preHandle_whenAuthenticated_shouldIncludeUserIdInKey() throws Exception {
        // Arrange
        authenticateAs(TEST_USER_ID);
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).thenReturn(true);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("createOrder"));

        // Assert
        assertTrue(result, "已认证用户首次请求应放行");
        verify(valueOperations).setIfAbsent(
                eq(expectedRedisKey(TEST_KEY, String.valueOf(TEST_USER_ID))),
                any(), any(Duration.class));
    }

    /* ========== 场景 8：Redis 异常 → 降级放行，不抛异常 ========== */

    @Test
    @DisplayName("Redis 抛异常 → 降级放行，不抛异常")
    void preHandle_whenRedisThrowsException_shouldDegradeAndPassThrough() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class)))
                .thenThrow(new RuntimeException("Redis connection refused"));

        // Act & Assert：不抛异常，降级放行
        boolean result = assertDoesNotThrow(
                () -> interceptor.preHandle(request, response, handlerMethod("createOrder")));
        assertTrue(result, "Redis 异常时应降级放行");
    }

    /* ========== 场景 9：RedisTemplate 为 null → 降级放行 ========== */

    @Test
    @DisplayName("RedisTemplate 为 null → 降级放行，不抛异常")
    void preHandle_whenRedisTemplateNull_shouldDegradeAndPassThrough() throws Exception {
        // Arrange：构造无 RedisTemplate 的拦截器（模拟 mock profile）
        IdempotentInterceptor noRedisInterceptor = new IdempotentInterceptor(null);
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);

        // Act
        boolean result = noRedisInterceptor.preHandle(request, response, handlerMethod("createOrder"));

        // Assert
        assertTrue(result, "RedisTemplate 为 null 时应降级放行");
    }

    /* ========== 场景 10：Idempotency-Key 含空白字符 → trim 后用于校验 ========== */

    @Test
    @DisplayName("Idempotency-Key 含前后空白 → trim 后用于构造 Redis Key")
    void preHandle_whenKeyHasWhitespace_shouldTrimAndProceed() throws Exception {
        // Arrange
        String rawKey = "  " + TEST_KEY + "  ";
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(rawKey);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).thenReturn(true);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("createOrder"));

        // Assert
        assertTrue(result, "trim 后的 key 应正常处理");
        // Redis Key 应使用 trim 后的 key
        verify(valueOperations).setIfAbsent(
                eq(expectedRedisKey(TEST_KEY, "anonymous")), any(), any(Duration.class));
    }

    /* ========== 场景 11：空字符串 Idempotency-Key → 视为缺失（required=true → 抛异常） ========== */

    @Test
    @DisplayName("空字符串 Idempotency-Key（required=true）→ 视为缺失，抛 InvalidOperationException")
    void preHandle_whenKeyIsBlank_shouldTreatAsMissingAndThrow() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn("");

        // Act & Assert
        assertThrows(InvalidOperationException.class,
                () -> interceptor.preHandle(request, response, handlerMethod("createOrder")));
        verifyNoInteractions(redisTemplate);
    }

    /* ========== 场景 12：纯空白字符串 Idempotency-Key → 视为缺失 ========== */

    @Test
    @DisplayName("纯空白字符串 Idempotency-Key → trim 后为空，视为缺失")
    void preHandle_whenKeyIsWhitespaceOnly_shouldTreatAsMissing() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn("   ");

        // Act & Assert
        assertThrows(InvalidOperationException.class,
                () -> interceptor.preHandle(request, response, handlerMethod("createOrder")));
        verifyNoInteractions(redisTemplate);
    }

    /* ========== 场景 13：自定义 TTL 应正确传递给 Redis ========== */

    @Test
    @DisplayName("自定义 TTL（60 秒）应正确传递给 Redis setIfAbsent")
    void preHandle_withCustomTtl_shouldPassToRedis() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), eq(Duration.ofSeconds(60L)))).thenReturn(true);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("shortTtlIdempotent"));

        // Assert
        assertTrue(result, "自定义 TTL 的请求应放行");
        // 验证 TTL 为 60 秒
        verify(valueOperations).setIfAbsent(
                anyString(), any(), eq(Duration.ofSeconds(60L)));
    }

    /* ========== 场景 14：默认 TTL（24 小时）应正确传递给 Redis ========== */

    @Test
    @DisplayName("默认 TTL（24 小时 = 86400 秒）应正确传递给 Redis setIfAbsent")
    void preHandle_withDefaultTtl_shouldPassToRedis() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), any(), eq(Duration.ofSeconds(Idempotent.DEFAULT_TTL_SECONDS))))
                .thenReturn(true);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("createOrder"));

        // Assert
        assertTrue(result, "默认 TTL 的请求应放行");
        verify(valueOperations).setIfAbsent(
                anyString(), any(), eq(Duration.ofSeconds(Idempotent.DEFAULT_TTL_SECONDS)));
    }

    /* ========== 场景 15：placeholder value 应为 "1" ========== */

    @Test
    @DisplayName("Redis 占位值应为 '1'（PLACEHOLDER_VALUE 常量）")
    void preHandle_shouldUsePlaceholderValueOne() throws Exception {
        // Arrange
        when(request.getHeader(IdempotentInterceptor.HEADER_IDEMPOTENCY_KEY)).thenReturn(TEST_KEY);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(true);

        // Act
        boolean result = interceptor.preHandle(request, response, handlerMethod("createOrder"));

        // Assert
        assertTrue(result, "使用占位值 '1' 时应正常放行");
        verify(valueOperations).setIfAbsent(anyString(), eq("1"), any(Duration.class));
    }
}
