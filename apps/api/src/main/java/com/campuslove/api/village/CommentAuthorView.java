package com.campuslove.api.village;

/**
 * 评论作者视图。
 */
public record CommentAuthorView(Long userId, String nickname, String avatarUrl) {
}
