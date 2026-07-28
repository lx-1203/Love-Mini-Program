package com.campuslove.api.match;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.DailyLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * MatchPolicy 单元测试（Task 4.2.1）。
 *
 * <p>覆盖 rewind 限额校验、Redis 降级、requireNotSelf 校验等。</p>
 */
class MatchPolicyTest {

    private MatchPolicy matchPolicy;
    private RedisTemplate<String, Object> redisTemplate;
    private ValueOperations<String, Object> valueOperations;

    @BeforeEach
    void setUp() {
        matchPolicy = new MatchPolicy();
        redisTemplate = mock(RedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    /**
     * 场景：今日 rewind 次数为 0 时应通过限额校验。
     */
    @Test
    void checkRewindLimit_zeroCount_doesNotThrow() {
        matchPolicy.setRedisTemplate(redisTemplate);
        when(valueOperations.get(org.mockito.ArgumentMatchers.anyString())).thenReturn(0);

        // Should not throw
        matchPolicy.checkRewindLimit(1L);
    }

    /**
     * 场景：今日 rewind 次数已达上限应抛 DailyLimitExceededException。
     */
    @Test
    void checkRewindLimit_atLimit_throwsException() {
        matchPolicy.setRedisTemplate(redisTemplate);
        when(valueOperations.get(org.mockito.ArgumentMatchers.anyString())).thenReturn(1);

        DailyLimitExceededException ex = assertThrows(DailyLimitExceededException.class,
                () -> matchPolicy.checkRewindLimit(1L));

        assertEquals("反悔", ex.getOperationName());
        assertEquals(1, ex.getDailyLimit());
        assertTrue(ex.getMessage().contains("今日反悔次数已用完"));
    }

    /**
     * 场景：RedisTemplate 为 null 时应降级到本地内存。
     */
    @Test
    void getTodayRewindCount_redisNull_fallsBackToLocal() {
        matchPolicy.setRedisTemplate(null);

        // 本地内存默认为 0
        assertEquals(0, matchPolicy.getTodayRewindCount(1L));

        // 递增后应为 1
        matchPolicy.incrementRewindCount(1L);
        assertEquals(1, matchPolicy.getTodayRewindCount(1L));
    }

    /**
     * 场景：Redis 抛异常时应降级到本地内存，不影响主流程。
     */
    @Test
    void getTodayRewindCount_redisThrowsException_fallsBackToLocal() {
        matchPolicy.setRedisTemplate(redisTemplate);
        when(valueOperations.get(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("Redis unavailable"));

        // 降级返回本地内存（0）
        assertEquals(0, matchPolicy.getTodayRewindCount(1L));
    }

    /**
     * 场景：requireNotSelf 相同 ID 应抛 IllegalArgumentException。
     */
    @Test
    void requireNotSelf_sameId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> matchPolicy.requireNotSelf(1L, 1L));
        assertEquals("Cannot operate on yourself", ex.getMessage());
    }

    /**
     * 场景：requireNotSelf 不同 ID 不应抛异常。
     */
    @Test
    void requireNotSelf_differentId_doesNotThrow() {
        matchPolicy.requireNotSelf(1L, 2L);
        // No exception expected
    }

    /**
     * 场景：incrementRewindCount Redis 写入异常不影响本地计数。
     */
    @Test
    void incrementRewindCount_redisException_stillIncrementsLocal() {
        matchPolicy.setRedisTemplate(redisTemplate);
        when(valueOperations.increment(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("Redis write failed"));
        // getTodayRewindCount 也应走降级路径，读取本地计数
        when(valueOperations.get(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new RuntimeException("Redis read failed"));

        matchPolicy.incrementRewindCount(1L);
        // 本地计数应已递增
        assertEquals(1, matchPolicy.getTodayRewindCount(1L));
    }

    /**
     * 场景：getTodayRewindCount Redis 返回非数字值应按 0 处理。
     */
    @Test
    void getTodayRewindCount_redisNonNumberValue_treatedAsZero() {
        matchPolicy.setRedisTemplate(redisTemplate);
        when(valueOperations.get(org.mockito.ArgumentMatchers.anyString())).thenReturn("not-a-number");

        assertEquals(0, matchPolicy.getTodayRewindCount(1L));
    }
}
