package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 系统参数配置视图（管理后台）。
 * 用于 {@code GET /api/admin/configs} 与 {@code PUT /api/admin/configs/{key}} 接口返回数据。
 */
public record AdminConfigView(
        Long id,
        String key,
        String value,
        String description,
        Long updatedBy,
        LocalDateTime updatedAt
) {
}
