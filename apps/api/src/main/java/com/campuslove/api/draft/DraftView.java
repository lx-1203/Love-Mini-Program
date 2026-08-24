package com.campuslove.api.draft;

import java.util.List;

/**
 * 发布草稿视图。
 */
public record DraftView(
    Long id,
    String targetType,
    Long targetId,
    String title,
    String content,
    List<String> images,
    List<String> tags,
    List<String> topics,
    String location,
    String visibility,
    String updatedAt
) {
}
