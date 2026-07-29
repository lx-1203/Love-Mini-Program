package com.campuslove.api.village;

/**
 * 评论项视图。
 */
public record CommentItemView(
    Long id,
    Long postId,
    Long parentId,
    CommentAuthorView author,
    String content,
    int likeCount,
    String createdAt,
    boolean isAuthor,
    String replyTo
) {
}
