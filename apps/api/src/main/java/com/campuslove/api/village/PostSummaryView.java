package com.campuslove.api.village;

import java.util.List;

/**
 * 帖子摘要视图。
 */
public record PostSummaryView(
    Long id,
    String title,
    String summary,
    PostAuthorView author,
    String category,
    List<String> tags,
    int likeCount,
    int commentCount,
    int shareCount,
    String createdAt,
    boolean isHot,
    boolean isAlumni,
    /** Phase Feedback3 P2.5：作者是否被当前用户关注（关注 Tab 打通；无当前用户上下文时 false） */
    boolean isFollowed,
    /** 2026-08-08 论坛互动真实化：收藏数（实时统计） */
    int favoriteCount,
    /** 2026-08-08 论坛互动真实化：当前用户是否已收藏（无当前用户上下文时 false） */
    boolean isFavorite,
    /** 2026-08-08 论坛互动真实化：浏览量 */
    int viewCount,
    /** 2026-08-09 帖子关联活动：关联活动 ID（无则 null） */
    Long activityId,
    /** 2026-08-09 帖子关联活动：关联活动摘要（无则 null） */
    ActivitySummaryView activity,
    /** 2026-08-09 帖子置顶：是否置顶（置顶帖列表优先展示） */
    boolean isPinned,
    /** 2026-08-09 列表评论预览：最新 2 条根评论（无则空列表） */
    List<CommentPreviewView> recentComments
) {
}