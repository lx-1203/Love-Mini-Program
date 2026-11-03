package com.campuslove.api.official;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.entity.OfficialMessage;
import com.campuslove.api.entity.OfficialMessage.AudienceType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * P1-2（2026-11-03）：官方号消息受众可见性判定测试（纯函数 {@code visibleTo}）。
 *
 * <p>覆盖三类受众 × 命中/不命中 + 脏数据（audienceValue 缺失）的 fail-closed 口径。</p>
 */
class OfficialMessageAudienceVisibilityTest {

    private static OfficialMessage message(AudienceType type, String value) {
        OfficialMessage m = new OfficialMessage();
        m.setAudienceType(type);
        m.setAudienceValue(value);
        return m;
    }

    @Test
    @DisplayName("ALL：任何用户（含未登录/未归属）都可见——存量行为不变")
    void allAudience_visibleToEveryone() {
        assertTrue(RealOfficialAccountService.visibleTo(message(AudienceType.ALL, null), null, null));
        assertTrue(RealOfficialAccountService.visibleTo(message(AudienceType.ALL, null), "北大", "C1/R1/S1"));
        // 脏数据：audienceType 为 null 按最宽的 ALL 处理（迁移前存量行无此字段）
        assertTrue(RealOfficialAccountService.visibleTo(message(null, null), null, null));
    }

    @Test
    @DisplayName("CAMPUS：仅校区名精确匹配的用户可见；未登录/未填校区/他校不可见")
    void campusAudience_exactMatchOnly() {
        OfficialMessage m = message(AudienceType.CAMPUS, "南开大学");
        assertTrue(RealOfficialAccountService.visibleTo(m, "南开大学", null));
        assertFalse(RealOfficialAccountService.visibleTo(m, "南开大学（津南校区）", null), "必须精确匹配，不做包含匹配");
        assertFalse(RealOfficialAccountService.visibleTo(m, null, null), "未填校区不可见（fail-closed）");
        assertFalse(RealOfficialAccountService.visibleTo(m, "北京大学", "C1/R1/S1"));
    }

    @Test
    @DisplayName("CIRCLE：按路径段子树匹配——同节点/子树可见，裸前缀不命中")
    void circleAudience_pathSegmentSubtree() {
        OfficialMessage m = message(AudienceType.CIRCLE, "C1/R1");
        assertTrue(RealOfficialAccountService.visibleTo(m, null, "C1/R1"), "节点本身可见");
        assertTrue(RealOfficialAccountService.visibleTo(m, null, "C1/R1/S3"), "子树可见");
        assertFalse(RealOfficialAccountService.visibleTo(m, null, "C1/R14"), "裸前缀不得命中（C1/R1 vs C1/R14）");
        assertFalse(RealOfficialAccountService.visibleTo(m, null, "C2/R1"), "兄弟子树不可见");
        assertFalse(RealOfficialAccountService.visibleTo(m, null, null), "未归属圈层的用户不可见（fail-closed）");
    }

    @Test
    @DisplayName("脏数据：CAMPUS/CIRCLE 但 audienceValue 缺失 → 一律不可见")
    void missingAudienceValue_failsClosed() {
        assertFalse(RealOfficialAccountService.visibleTo(message(AudienceType.CAMPUS, null), "南开大学", null));
        assertFalse(RealOfficialAccountService.visibleTo(message(AudienceType.CAMPUS, "  "), "南开大学", null));
        assertFalse(RealOfficialAccountService.visibleTo(message(AudienceType.CIRCLE, null), null, "C1/R1/S1"));
    }
}
