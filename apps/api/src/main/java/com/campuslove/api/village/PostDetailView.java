package com.campuslove.api.village;

import java.util.List;

/**
 * 帖子详情视图。
 */
public record PostDetailView(
    Long id,
    String title,
    String content,
    PostAuthorView author,
    String category,
    List<String> tags,
    List<String> images,
    int likeCount,
    int commentCount,
    int shareCount,
    String createdAt,
    String updatedAt,
    boolean isLiked,
    boolean isAuthor,
    boolean isAlumni,
    /** 2026-08-08 论坛互动真实化：收藏数（实时统计） */
    int favoriteCount,
    /** 2026-08-08 论坛互动真实化：当前用户是否已收藏（匿名时 false） */
    boolean isFavorite,
    /** 2026-08-08 论坛互动真实化：浏览量（本次读取已 +1） */
    int viewCount,
    /** 2026-08-09 帖子关联活动：关联活动 ID（无则 null） */
    Long activityId,
    /** 2026-08-09 帖子关联活动：关联活动摘要（无则 null） */
    ActivitySummaryView activity
) {
}
