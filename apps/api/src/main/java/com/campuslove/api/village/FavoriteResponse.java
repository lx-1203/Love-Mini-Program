package com.campuslove.api.village;

/**
 * 收藏 toggle 响应（2026-08-08 论坛互动真实化）。
 *
 * @param success        操作是否成功
 * @param favorited      当前收藏状态（true 表示已收藏）
 * @param favoriteCount  最新收藏总数（实时统计）
 */
public record FavoriteResponse(
    boolean success,
    boolean favorited,
    int favoriteCount
) {
}
