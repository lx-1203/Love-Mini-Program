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
    boolean isAlumni
) {
}