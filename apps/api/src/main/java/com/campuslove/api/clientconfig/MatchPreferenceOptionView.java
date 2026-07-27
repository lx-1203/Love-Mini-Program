package com.campuslove.api.clientconfig;

/**
 * 匹配偏好选项视图 DTO（Task 3.6.2）。
 *
 * <p>对应客户端 {@code GET /api/v1/config/match-preferences} 返回的列表项，
 * 用于驱动「匹配偏好选择 / 偏好筛选」等模块的可选项列表。</p>
 *
 * <p>由后端 {@code ConfigService.loadMatchPreferences()} 返回，5 分钟缓存，
 * 替代客户端 {@code apps/client/src/config/match-form.ts} 中的硬编码 matchFormFields
 * 与其它散落的偏好可选项常量。</p>
 *
 * @param key        偏好项标识（提交时回传，如 "preference" / "timeRange"）
 * @param label      偏好项展示文本（按 Accept-Language 国际化）
 * @param required   是否必填（用于表单校验）
 * @param group      选项所属分组（可选，用于在 UI 上聚类展示，如 "basic" / "lifestyle"）
 * @param options    偏好可选项列表（如「在校 / 已毕业」「文科 / 理科」），可为空表示自由输入
 */
public record MatchPreferenceOptionView(
        String key,
        String label,
        boolean required,
        String group,
        java.util.List<OptionItem> options
) {
    /**
     * 偏好可选项。
     *
     * @param value 选项值（提交时回传）
     * @param label 选项展示文本（按 Accept-Language 国际化）
     */
    public record OptionItem(
            String value,
            String label
    ) {
    }
}
