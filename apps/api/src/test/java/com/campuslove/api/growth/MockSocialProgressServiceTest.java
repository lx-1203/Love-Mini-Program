package com.campuslove.api.growth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * MockSocialProgressService 单元测试。
 *
 * <p>覆盖社交升温漏斗 mock 实现的真实业务逻辑：</p>
 * <ul>
 *   <li>初始层级 L1_EXPOSURE 及进度百分比（L1=16%, L6=100%）</li>
 *   <li>各 record 方法触发对应层级升级（L2-L6）</li>
 *   <li>多维度计数累计后按最高层级展示</li>
 *   <li>各维度计数递增</li>
 *   <li>userId 为空时抛 IllegalArgumentException</li>
 * </ul>
 */
class MockSocialProgressServiceTest {

    private final MockSocialProgressService service = new MockSocialProgressService();

    @Test
    void initialProgress_shouldBeL1Exposure() {
        SocialProgressView view = service.getProgress(1L);

        assertEquals("L1_EXPOSURE", view.getCurrentTier());
        assertEquals("发现心动", view.getTierLabel());
        assertEquals(16, view.getProgressPercentage());
        assertEquals(0, view.getExposureCount());
        assertEquals(0, view.getLikeCount());
        assertEquals(0, view.getMatchCount());
        assertEquals(0, view.getChatCount());
        assertEquals(0, view.getCircleCount());
        assertEquals(0, view.getActivityCount());
        assertNotNull(view.getNextAction());
        assertTrue(view.getNextAction().contains("发现页"));
    }

    @Test
    void recordLike_shouldAdvanceToL2Attention() {
        service.recordLike(1L);

        SocialProgressView view = service.getProgress(1L);
        assertEquals("L2_ATTENTION", view.getCurrentTier());
        assertEquals("表达喜欢", view.getTierLabel());
        assertEquals(33, view.getProgressPercentage());
        assertEquals(1, view.getLikeCount());
    }

    @Test
    void recordMatch_shouldAdvanceToL3Match() {
        service.recordMatch(1L);

        SocialProgressView view = service.getProgress(1L);
        assertEquals("L3_MATCH", view.getCurrentTier());
        assertEquals("双向匹配", view.getTierLabel());
        assertEquals(50, view.getProgressPercentage());
        assertEquals(1, view.getMatchCount());
    }

    @Test
    void recordChat_shouldAdvanceToL4Communication() {
        service.recordChat(1L);

        SocialProgressView view = service.getProgress(1L);
        assertEquals("L4_COMMUNICATION", view.getCurrentTier());
        assertEquals("开启对话", view.getTierLabel());
        assertEquals(66, view.getProgressPercentage());
        assertEquals(1, view.getChatCount());
    }

    @Test
    void recordCircleActivity_shouldAdvanceToL5Circle() {
        service.recordCircleActivity(1L);

        SocialProgressView view = service.getProgress(1L);
        assertEquals("L5_CIRCLE", view.getCurrentTier());
        assertEquals("参与社区", view.getTierLabel());
        assertEquals(83, view.getProgressPercentage());
        assertEquals(1, view.getCircleCount());
    }

    @Test
    void recordActivityParticipation_shouldAdvanceToL6Scene() {
        service.recordActivityParticipation(1L);

        SocialProgressView view = service.getProgress(1L);
        assertEquals("L6_SCENE", view.getCurrentTier());
        assertEquals("线下见面", view.getTierLabel());
        assertEquals(100, view.getProgressPercentage());
        assertEquals(1, view.getActivityCount());
    }

    @Test
    void highestTier_shouldWinWhenMultipleDimensionsRecorded() {
        // 先记录 like（L2），再记录 chat（L4），最终应展示最高层级 L4
        service.recordLike(1L);
        service.recordChat(1L);

        SocialProgressView view = service.getProgress(1L);
        assertEquals("L4_COMMUNICATION", view.getCurrentTier());
        assertEquals(1, view.getLikeCount());
        assertEquals(1, view.getChatCount());
    }

    @Test
    void recordExposure_shouldIncrementCounterWithoutTierChange() {
        service.recordExposure(1L);
        service.recordExposure(1L);
        service.recordExposure(1L);

        SocialProgressView view = service.getProgress(1L);
        assertEquals("L1_EXPOSURE", view.getCurrentTier());
        assertEquals(3, view.getExposureCount());
    }

    @Test
    void nullUserId_shouldThrowIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> service.getProgress(null));
        assertThrows(IllegalArgumentException.class, () -> service.recordExposure(null));
        assertThrows(IllegalArgumentException.class, () -> service.recordLike(null));
        assertThrows(IllegalArgumentException.class, () -> service.recordMatch(null));
        assertThrows(IllegalArgumentException.class, () -> service.recordChat(null));
        assertThrows(IllegalArgumentException.class, () -> service.recordCircleActivity(null));
        assertThrows(IllegalArgumentException.class, () -> service.recordActivityParticipation(null));
    }
}
