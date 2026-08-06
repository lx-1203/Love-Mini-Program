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
    boolean isAlumni,
    /** Phase Feedback3 P2.5：作者是否被当前用户关注（关注 Tab 打通；无当前用户上下文时 false） */
    boolean isFollowed
) {
}