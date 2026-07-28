package com.campuslove.api.clientconfig;

/**
 * 筛选选项视图 DTO（Task 3.6.3）。
 *
 * <p>对应客户端 {@code GET /api/v1/config/filter-options} 返回的列表项，
 * 用于驱动「活动类型 / 论坛版块 / 帖子分类」等筛选下拉或 Tab 选项。</p>
 *
 * <p>由后端 {@code ConfigService.loadFilterOptions()} 返回，5 分钟缓存，
 * 替代客户端散落在 stores/campus.ts、stores/village.ts、stores/activity.ts 中的硬编码
 * 分类常量（如 CAMPUS_CATEGORY_MAP、POST_CATEGORY_LABELS 等）。</p>
 *
 * @param category 筛选维度标识（如 "activity_type" / "forum_section" / "campus_topic_category"）
 * @param options  该维度下的可选项列表（按展示顺序排列）
 */
public record FilterOptionView(
        String category,
        java.util.List<OptionItem> options
) {
    /**
     * 筛选可选项。
     *
     * @param value 选项值（提交时回传，与后端实体字段值一致）
     * @param label 选项展示文本（按 Accept-Language 国际化）
     * @param icon  选项图标 URL 或 icon class（可选，用于 UI 图标渲染）
     */
    public record OptionItem(
            String value,
            String label,
            String icon
    ) {
    }
}
