package com.campuslove.api.discover;

import java.time.LocalDate;
import java.util.List;

/**
 * 活动列表项视图。
 *
 * <p>R4（2026-08-09）：新增 category（分类 code，前端 i18n 映射展示标签）、
 * coverImage（封面图 URL）、isEnrolled（当前用户是否已报名——列表接口
 * 携带 userId 时计算，未登录/匿名请求为 false）。</p>
 */
public record ActivityView(
    Long id,
    String title,
    String location,
    String scheduleText,
    String description,
    int enrollmentCount,
    List<String> participantAvatars,
    String status,
    LocalDate activityDate,
    String category,
    String coverImage,
    boolean isEnrolled
) {}
