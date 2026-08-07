package com.campuslove.api.village;

/**
 * 热门话题视图（2026-08-07 圈子页「热门话题」模块）。
 *
 * <p>话题由帖子标签聚合而来，不建独立话题实体：
 * <ul>
 *   <li>{@code postCount}：该标签下的帖子数（前端近似展示浏览量）</li>
 *   <li>{@code coverUrl}：该标签下最新一条带图帖子的首图（无图则返回空串，
 *       前端用主题色渐变占位）</li>
 * </ul>
 */
public record PopularTagView(
        String tagName,
        long postCount,
        String coverUrl) {
}
