package com.campuslove.api.village;

/**
 * 活动摘要视图（2026-08-09 帖子关联活动）。
 *
 * <p>帖子列表/详情中关联活动的轻量卡片信息，字段与 {@link com.campuslove.api.entity.Activity}
 * 实体对齐；coverImage 实体暂无封面字段，统一为 null 兜底。</p>
 */
public record ActivitySummaryView(
    Long id,
    String title,
    String location,
    String scheduleText,
    /** 活动日期（ISO 字符串，无则 null） */
    String activityDate,
    /** 活动状态（upcoming/ongoing/ended） */
    String status,
    int enrollmentCount,
    /** 活动封面图（实体暂无该字段，恒 null 兜底） */
    String coverImage
) {
}
