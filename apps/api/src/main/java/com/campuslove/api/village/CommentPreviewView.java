package com.campuslove.api.village;

/**
 * 帖子列表评论预览视图（2026-08-09 帖子列表带最新评论）。
 *
 * <p>每帖最多取 2 条最新根评论（含楼中楼回复数），用于列表页「评论区预览」。
 * replyCount 为该根评论的楼中楼回复条数。</p>
 */
public record CommentPreviewView(
    Long id,
    CommentAuthorView author,
    String content,
    String createdAt,
    int replyCount
) {
}
