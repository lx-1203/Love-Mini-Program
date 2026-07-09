package com.campuslove.api.admin;

import java.util.Map;

/**
 * 匹配算法配置视图（管理后台）。
 * 用于 {@code GET /api/admin/match-config} 与 {@code PUT /api/admin/match-config} 接口。
 *
 * <p>字段与 {@link com.campuslove.api.config.MatchConfig} 一致，使用 Map 存储 key/value，
 * 便于前端按需展示和提交，避免后端在新增字段时同步修改 DTO。
 *
 * @param values 配置项 Map，key 为配置键（如 heartSignalExpireHours），value 为字符串值
 */
public record MatchConfigView(
        Map<String, String> values
) {
}
