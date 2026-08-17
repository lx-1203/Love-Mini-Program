package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * 悄悄话多文案契约测试（2026-08-14 升级：单条 → 3 条）。
 *
 * <p>覆盖 {@link RecommendationRanker#resolveWhispers(Long)}：
 * 按 userId 稳定取 3 条、同一用户结果恒定、null 返回空列表。</p>
 */
class RecommendationRankerWhisperTest {

    /** 使用旧测试构造器（其余依赖传 null，resolveWhispers 不依赖仓库）。 */
    private RecommendationRanker newRanker() {
        return new RecommendationRanker(
                null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    void resolveWhispers_returnsThreeNonBlankLines() {
        RecommendationRanker ranker = newRanker();
        List<String> whispers = ranker.resolveWhispers(1001L);

        assertEquals(3, whispers.size(), "解锁后应返回 3 条悄悄话");
        assertTrue(whispers.stream().noneMatch(String::isBlank), "悄悄话文案不应为空");
        assertEquals(3, whispers.stream().distinct().count(), "3 条悄悄话应互不相同");
    }

    @Test
    void resolveWhispers_isStablePerUser() {
        RecommendationRanker ranker = newRanker();
        assertEquals(ranker.resolveWhispers(1001L), ranker.resolveWhispers(1001L),
                "同一用户反复查询结果应恒定");
    }

    @Test
    void resolveWhispers_nullUser_returnsEmpty() {
        RecommendationRanker ranker = newRanker();
        assertTrue(ranker.resolveWhispers(null).isEmpty(), "null userId 应返回空列表");
    }

    @Test
    void resolveWhispers_negativeHashSafe() {
        // R4-00351：Integer.MIN_VALUE 取 abs 仍为负，floorMod 应避免越界
        RecommendationRanker ranker = newRanker();
        List<String> whispers = ranker.resolveWhispers(Integer.MIN_VALUE + 1L);
        assertEquals(3, whispers.size());
        assertFalse(whispers.contains(null));
    }
}
