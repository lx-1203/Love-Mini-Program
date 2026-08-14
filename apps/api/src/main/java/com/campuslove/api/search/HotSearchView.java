package com.campuslove.api.search;

/**
 * 热搜词视图（2026-08-11）。
 *
 * @param keyword     搜索词
 * @param searchCount 搜索次数（近 7 天聚合，按天衰减）
 */
public record HotSearchView(
    String keyword,
    long searchCount
) {}
