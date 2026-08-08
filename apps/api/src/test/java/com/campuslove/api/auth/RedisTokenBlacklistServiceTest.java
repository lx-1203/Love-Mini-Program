package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * {@link RedisTokenBlacklistService} 单元测试（Task 0.5.3）。
 *
 * <p>覆盖核心场景：
 * <ul>
 *   <li>revoke 正常写入 Redis + 本地内存</li>
 *   <li>revoke 参数校验（jti 为空 / TTL&lt;=0 时跳过）</li>
 *   <li>revoke Redis 写入失败时降级到本地内存</li>
 *   <li>revoke redisTemplate 未注入时仅写本地内存</li>
 *   <li>isRevoked 本地优先（R4-00310）：revoke 双写本地+Redis，本地命中即返回 true，
 *       不再查询 Redis；Redis 可用且本地未命中时才查 Redis（命中=已撤销，未命中=未撤销）</li>
 *   <li>isRevoked jti 为空时返回 false</li>
 *   <li>isRevoked Redis 查询失败时降级查本地内存</li>
 *   <li>幂等性：同一 jti 多次 revoke 不报错</li>
 * </ul>
 *
 * <p>测试策略：纯 Mockito，模拟 {@link RedisTemplate} 与 {@link ValueOperations}，
 * 验证 Redis 调用参数与降级行为。不依赖真实 Redis 实例，保证测试快速与隔离。</p>
 */
@ExtendWith(MockitoExtension.class)
class RedisTokenBlacklistServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private RedisTokenBlacklistService blacklistService;

    /** 测试用 jti（UUID 格式） */
    private static final String TEST_JTI = "550e8400-e29b-41d4-a716-446655440000";

    /** 测试用 TTL（秒） */
    private static final long TEST_TTL_SECONDS = 3600L;

    @BeforeEach
    void setUp() {
        // 手动构造 service，并通过反射注入 redisTemplate（模拟 @Autowired(required=false)）
        blacklistService = new RedisTokenBlacklistService();
        // 使用反射注入 mock 的 redisTemplate
        try {
            java.lang.reflect.Field field = RedisTokenBlacklistService.class
                    .getDeclaredField("redisTemplate");
            field.setAccessible(true);
            field.set(blacklistService, redisTemplate);
        } catch (Exception e) {
            throw new RuntimeException("注入 redisTemplate 失败", e);
        }
        // 清空本地内存（避免上一用例残留）
        blacklistService.clearLocalBlacklistForTest();
    }

    /* ========== revoke 正常路径 ========== */

    /**
     * 场景 1：revoke 正常调用 → 写入 Redis + 本地内存。
     *
     * <p>验证点：
     * <ul>
     *   <li>调用 redisTemplate.opsForValue().set(key, TRUE, ttl, SECONDS)</li>
     *   <li>key 格式为 "jwt:blacklist:{jti}"</li>
     *   <li>本地内存也写入（通过后续 isRevoked 验证）</li>
     * </ul>
     */
    @Test
    void revoke_withValidJtiAndTtl_shouldWriteToRedisAndLocal() {
        // Arrange
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        // Act
        blacklistService.revoke(TEST_JTI, TEST_TTL_SECONDS);

        // Assert：Redis 写入调用参数正确
        String expectedKey = "jwt:blacklist:" + TEST_JTI;
        verify(valueOperations).set(eq(expectedKey), eq(Boolean.TRUE),
                eq(TEST_TTL_SECONDS), eq(TimeUnit.SECONDS));
    }

    /**
     * 场景 2：revoke 后 isRevoked 应返回 true。
     *
     * <p>R4-00310 本地优先：revoke 时本地内存与 Redis 双写，isRevoked 先查本地
     * 内存命中即返回 true，无需再查询 Redis（hasKey 不再被调用）。</p>
     */
    @Test
    void isRevoked_afterRevoke_shouldReturnTrue() {
        // Arrange
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        // Act
        blacklistService.revoke(TEST_JTI, TEST_TTL_SECONDS);
        boolean revoked = blacklistService.isRevoked(TEST_JTI);

        // Assert
        assertTrue(revoked, "revoke 后 isRevoked 应返回 true");
        // 本地优先命中，Redis hasKey 不应被查询
        verify(redisTemplate, never()).hasKey(anyString());
    }

    /* ========== revoke 参数校验 ========== */

    /**
     * 场景 3：revoke jti 为 null → 跳过，不写 Redis 不写本地内存。
     */
    @Test
    void revoke_withNullJti_shouldSkip() {
        // Act
        blacklistService.revoke(null, TEST_TTL_SECONDS);

        // Assert：不应调用任何 Redis 操作
        verify(redisTemplate, never()).opsForValue();
        verify(redisTemplate, never()).hasKey(anyString());
    }

    /**
     * 场景 4：revoke jti 为空白字符串 → 跳过。
     */
    @Test
    void revoke_withBlankJti_shouldSkip() {
        // Act
        blacklistService.revoke("   ", TEST_TTL_SECONDS);

        // Assert
        verify(redisTemplate, never()).opsForValue();
    }

    /**
     * 场景 5：revoke TTL &lt;= 0 → 跳过（避免无效写入）。
     */
    @Test
    void revoke_withNonPositiveTtl_shouldSkip() {
        // Act
        blacklistService.revoke(TEST_JTI, 0L);
        blacklistService.revoke(TEST_JTI, -1L);

        // Assert
        verify(redisTemplate, never()).opsForValue();
    }

    /* ========== revoke 降级路径 ========== */

    /**
     * 场景 6：revoke 时 Redis 抛异常 → 降级到本地内存，不抛异常。
     *
     * <p>关键验证点：Redis 故障不应阻塞登出主流程。</p>
     */
    @Test
    void revoke_whenRedisThrowsException_shouldFallbackToLocalAndNotThrow() {
        // Arrange：Redis 抛异常
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        doThrow(new RuntimeException("Redis connection refused"))
                .when(valueOperations)
                .set(anyString(), any(), anyLong(), any(TimeUnit.class));

        // Act & Assert：不抛异常
        assertDoesNotThrow(() -> blacklistService.revoke(TEST_JTI, TEST_TTL_SECONDS));

        // Assert：本地内存应写入（降级方案），通过 isRevoked 验证。
        // R4-00310 本地优先：本地命中直接返回 true，不触发 Redis 查询
        // （即使 Redis 故障，revoke 期间写入的本地记录也能拦截）。
        assertTrue(blacklistService.isRevoked(TEST_JTI),
                "Redis 故障时本地内存应能查询到已撤销 jti");
        verify(redisTemplate, never()).hasKey(anyString());
    }

    /**
     * 场景 7：redisTemplate 未注入（mock 模式）→ 仅写本地内存，不抛异常。
     */
    @Test
    void revoke_whenRedisTemplateNull_shouldWriteLocalOnly() {
        // Arrange：构造无 redisTemplate 的 service（模拟 mock profile）
        RedisTokenBlacklistService serviceWithoutRedis = new RedisTokenBlacklistService();
        // 不注入 redisTemplate，保持 null

        // Act & Assert
        assertDoesNotThrow(() -> serviceWithoutRedis.revoke(TEST_JTI, TEST_TTL_SECONDS));

        // Assert：本地内存应写入
        assertTrue(serviceWithoutRedis.isRevoked(TEST_JTI),
                "redisTemplate 未注入时，本地内存应能查询到已撤销 jti");
    }

    /* ========== isRevoked 查询路径 ========== */

    /**
     * 场景 8：isRevoked Redis 返回 true（jti 在黑名单中）。
     */
    @Test
    void isRevoked_whenRedisKeyExists_shouldReturnTrue() {
        // Arrange
        when(redisTemplate.hasKey("jwt:blacklist:" + TEST_JTI)).thenReturn(true);

        // Act
        boolean revoked = blacklistService.isRevoked(TEST_JTI);

        // Assert
        assertTrue(revoked, "Redis 中存在 key 时应返回 true");
    }

    /**
     * 场景 9：isRevoked Redis 返回 false（jti 不在黑名单中）。
     */
    @Test
    void isRevoked_whenRedisKeyMissing_shouldReturnFalse() {
        // Arrange
        when(redisTemplate.hasKey("jwt:blacklist:" + TEST_JTI)).thenReturn(false);

        // Act
        boolean revoked = blacklistService.isRevoked(TEST_JTI);

        // Assert
        assertFalse(revoked, "Redis 中无 key 时应返回 false");
    }

    /**
     * 场景 10：isRevoked jti 为 null → 直接返回 false（不查 Redis）。
     */
    @Test
    void isRevoked_withNullJti_shouldReturnFalseWithoutRedisCall() {
        // Act
        boolean revoked = blacklistService.isRevoked(null);

        // Assert
        assertFalse(revoked, "jti 为 null 时应返回 false");
        verify(redisTemplate, never()).hasKey(anyString());
    }

    /**
     * 场景 11：isRevoked jti 为空白 → 直接返回 false。
     */
    @Test
    void isRevoked_withBlankJti_shouldReturnFalse() {
        // Act
        boolean revoked = blacklistService.isRevoked("");

        // Assert
        assertFalse(revoked, "jti 为空时应返回 false");
        verify(redisTemplate, never()).hasKey(anyString());
    }

    /**
     * 场景 12：isRevoked Redis 查询抛异常 → 降级查本地内存。
     */
    @Test
    void isRevoked_whenRedisThrowsException_shouldFallbackToLocal() {
        // Arrange：Redis 抛异常，本地内存有该 jti。
        // 通过 revoke 触发（revoke 的 Redis 写入失败但本地内存会写入）
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        doThrow(new RuntimeException("Redis down"))
                .when(valueOperations)
                .set(anyString(), any(), anyLong(), any(TimeUnit.class));
        blacklistService.revoke(TEST_JTI, TEST_TTL_SECONDS);

        // Act：R4-00310 本地优先——本地命中直接返回 true，不触发 Redis hasKey 查询
        boolean revoked = blacklistService.isRevoked(TEST_JTI);

        // Assert：本地内存命中
        assertTrue(revoked, "Redis 故障时应降级查本地内存，本地命中应返回 true");
        verify(redisTemplate, never()).hasKey(anyString());
    }

    /**
     * 场景 13：isRevoked Redis 查询抛异常 + 本地内存也无 → 返回 false。
     */
    @Test
    void isRevoked_whenRedisDownAndLocalEmpty_shouldReturnFalse() {
        // Arrange：Redis 抛异常，本地内存无该 jti
        when(redisTemplate.hasKey(anyString())).thenThrow(new RuntimeException("Redis down"));

        // Act
        boolean revoked = blacklistService.isRevoked(TEST_JTI);

        // Assert
        assertFalse(revoked, "Redis 故障且本地内存也无时应返回 false");
    }

    /* ========== 幂等性 ========== */

    /**
     * 场景 14：同一 jti 多次 revoke → 不报错，TTL 以最后一次为准。
     */
    @Test
    void revoke_multipleTimes_shouldBeIdempotent() {
        // Arrange
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        // Act：连续 revoke 3 次，TTL 不同
        assertDoesNotThrow(() -> {
            blacklistService.revoke(TEST_JTI, 100L);
            blacklistService.revoke(TEST_JTI, 200L);
            blacklistService.revoke(TEST_JTI, 300L);
        });

        // Assert：最后一次 TTL 为 300L
        String expectedKey = "jwt:blacklist:" + TEST_JTI;
        verify(valueOperations).set(eq(expectedKey), eq(Boolean.TRUE),
                eq(300L), eq(TimeUnit.SECONDS));
    }

    /* ========== Key 格式验证 ========== */

    /**
     * 场景 15：revoke 写入的 Redis key 格式为 "jwt:blacklist:{jti}"。
     *
     * <p>验证 key 前缀正确，避免与其他 Redis key 冲突。</p>
     */
    @Test
    void revoke_shouldUseCorrectKeyFormat() {
        // Arrange
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        String customJti = "custom-jti-12345";

        // Act
        blacklistService.revoke(customJti, TEST_TTL_SECONDS);

        // Assert
        String expectedKey = "jwt:blacklist:" + customJti;
        verify(valueOperations).set(eq(expectedKey), any(), anyLong(), any(TimeUnit.class));
    }
}
