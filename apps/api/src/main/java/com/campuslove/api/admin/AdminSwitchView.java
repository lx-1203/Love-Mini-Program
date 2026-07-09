package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 功能开关视图（管理后台）。
 * 用于 {@code GET /api/admin/switches} 与 {@code PUT /api/admin/switches/{key}} 接口返回数据。
 */
public record AdminSwitchView(
        Long id,
        String key,
        Boolean enabled,
        String description,
        Long updatedBy,
        LocalDateTime updatedAt
) {
}
