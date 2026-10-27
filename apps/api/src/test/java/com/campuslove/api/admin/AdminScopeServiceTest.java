package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 圈层数据域的路径段语义守卫。
 *
 * <p>2026-10-26 实测缺陷：校区管理员绑定 {@code C1/R3/S1}（北京大学）后，
 * 能读到并审核 {@code C1/R3/S14}（另一校区）的帖子——裸 {@code startsWith}
 * 让 S1 命中 S14。本测试把该回归钉在纯函数上；集成侧由
 * {@code verify-admin-auditor} 的跨校区审核断言复验。</p>
 */
class AdminScopeServiceTest {

    @Test
    @DisplayName("同节点命中")
    void sameNodeIsInScope() {
        assertTrue(AdminScopeService.isWithinScopePrefix("C1/R3/S1", "C1/R3/S1"));
    }

    @Test
    @DisplayName("子树命中（大区覆盖其下校区）")
    void descendantIsInScope() {
        assertTrue(AdminScopeService.isWithinScopePrefix("C1/R3/S14", "C1/R3"));
        assertTrue(AdminScopeService.isWithinScopePrefix("C1/R3/S1", "C1"));
        assertTrue(AdminScopeService.isWithinScopePrefix("C1/R3/S1/child", "C1/R3/S1"));
    }

    @Test
    @DisplayName("回归：S1 不得命中 S14 / S10 等同级节点")
    void numericSiblingIsNotInScope() {
        assertFalse(AdminScopeService.isWithinScopePrefix("C1/R3/S14", "C1/R3/S1"));
        assertFalse(AdminScopeService.isWithinScopePrefix("C1/R3/S10", "C1/R3/S1"));
        assertFalse(AdminScopeService.isWithinScopePrefix("C1/R3/S1", "C1/R3/S14"));
    }

    @Test
    @DisplayName("不同大区不命中")
    void differentRegionIsNotInScope() {
        assertFalse(AdminScopeService.isWithinScopePrefix("C1/R9/S11", "C1/R3"));
    }

    @Test
    @DisplayName("前缀尾部斜杠按同节点处理")
    void trailingSlashPrefixNormalized() {
        assertTrue(AdminScopeService.isWithinScopePrefix("C1/R3/S1", "C1/R3/S1/"));
        assertTrue(AdminScopeService.isWithinScopePrefix("C1/R3/S1/child", "C1/R3/S1/"));
    }

    @Test
    @DisplayName("空值一律不命中（fail-closed）")
    void nullOrBlankIsNotInScope() {
        assertFalse(AdminScopeService.isWithinScopePrefix(null, "C1"));
        assertFalse(AdminScopeService.isWithinScopePrefix("C1", null));
        assertFalse(AdminScopeService.isWithinScopePrefix("", "C1"));
        assertFalse(AdminScopeService.isWithinScopePrefix("C1", "  "));
    }
}
