package com.campuslove.api.village;

/**
 * 帖子浏览历史项视图（2026-08-08 论坛互动真实化）。
 *
 * @param post     帖子摘要（含互动计数，与列表一致）
 * @param viewedAt 最近浏览时间
 */
public record PostHistoryItemView(
    PostSummaryView post,
    String viewedAt
) {
}
