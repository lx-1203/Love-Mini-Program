package com.campuslove.api.campus;

/**
 * 校园话题详情视图。
 */
public record CampusTopicView(
    Long id,
    Long schoolId,
    String category,
    String title,
    String content,
    String images,
    Long authorId,
    String authorName,
    String authorAvatar,
    int replyCount,
    int viewCount,
    boolean isAnonymous,
    String createdAt
) {}