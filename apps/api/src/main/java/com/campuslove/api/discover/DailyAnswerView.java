package com.campuslove.api.discover;

import java.time.LocalDateTime;

/**
 * 每日一问回答视图。
 */
public record DailyAnswerView(
    Long id,
    Long userId,
    String authorName,
    String content,
    boolean isAnonymous,
    LocalDateTime createdAt,
    /** 回答者头像 URL（匿名时为空） */
    String avatarUrl
) {}
