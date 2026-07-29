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
    boolean isAlumni
) {
}
