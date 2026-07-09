package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 管理后台 - 评论列表项视图。
 * <p>用于 GET /api/admin/comments 分页列表展示。</p>
 *
 * @param id             评论 ID
 * @param postId         关联帖子 ID
 * @param authorId       评论作者 ID
 * @param authorNickname 评论作者昵称（联表查询填充）
 * @param content        评论内容
 * @param createdAt      评论时间
 */
public record AdminCommentSummaryView(
        Long id,
        Long postId,
        Long authorId,
        String authorNickname,
        String content,
        LocalDateTime createdAt
) {
}
