package com.campuslove.api.campus;

import java.util.List;

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
    String createdAt,
    /** 话题标签数组（3-L，最多 5 个，每个 ≤20 字符；无标签为空列表） */
    List<String> tags
) {}