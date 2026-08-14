package com.campuslove.api.search;

import com.campuslove.api.village.PostSummaryView;

/**
 * 帖子搜索结果视图（2026-08-11）。
 *
 * <p>复用 {@link PostSummaryView} 展示帖子卡片，附加热度分与命中位置，
 * 供前端展示「标题命中」标识与相关性排序。</p>
 *
 * @param post     帖子摘要视图（与列表页同款结构）
 * @param hotScore 帖子热度分（搜索排序热度因子）
 * @param matchType 命中位置：title / tag / content（完全>前缀>中缀由服务端评分体现）
 */
public record PostSearchView(
    PostSummaryView post,
    double hotScore,
    String matchType
) {}
