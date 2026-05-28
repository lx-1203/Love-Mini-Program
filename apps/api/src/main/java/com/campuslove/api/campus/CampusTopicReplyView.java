package com.campuslove.api.campus;

/**
 * 校园话题回复视图。
 */
public record CampusTopicReplyView(
    Long id,
    Long topicId,
    Long authorId,
    String authorName,
    String authorAvatar,
    String content,
    boolean isAnonymous,
    String createdAt
) {}