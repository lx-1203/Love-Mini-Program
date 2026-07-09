package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 业务规则视图（管理后台）。
 * 用于 {@code GET /api/admin/rules} 与 {@code PUT /api/admin/rules/{id}} 接口返回数据。
 */
public record AdminRuleView(
        Long id,
        String name,
        String expression,
        String description,
        Boolean enabled,
        Long updatedBy,
        LocalDateTime updatedAt
) {
}
