package com.campuslove.api.village;

/**
 * 帖子作者视图。
 */
public record PostAuthorView(
    Long userId,
    String nickname,
    String avatarUrl,
    String campusName
) {
}