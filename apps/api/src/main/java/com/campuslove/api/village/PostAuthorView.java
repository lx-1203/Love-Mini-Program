package com.campuslove.api.village;

import java.util.List;

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