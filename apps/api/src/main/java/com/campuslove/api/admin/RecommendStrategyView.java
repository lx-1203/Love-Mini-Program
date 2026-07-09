package com.campuslove.api.admin;

import java.util.Map;

/**
 * 推荐策略配置视图（管理后台）。
 * 用于 {@code GET /api/admin/recommend-strategy} 与 {@code PUT /api/admin/recommend-strategy} 接口。
 *
 * <p>字段与 {@link com.campuslove.api.config.RecommendationConfig} 一致，使用 Map 存储 key/value。
 *
 * @param values 策略项 Map，key 为策略键（如 dailyLimit），value 为字符串值
 */
public record RecommendStrategyView(
        Map<String, String> values
) {
}
