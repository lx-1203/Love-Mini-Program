package com.campuslove.api.discover;

import java.time.LocalDate;
import java.util.List;

/**
 * 活动详情视图，包含是否已报名状态。
 *
 * <p>R4（2026-08-09）：新增 category（分类 code）、coverImage（封面图 URL），
 * 供详情页展示「具体场景」信息（分类标签 + 封面）。</p>
 */
public record ActivityDetailView(
    Long id,
    String title,
    String location,
    String scheduleText,
    String description,
    int enrollmentCount,
    List<String> participantAvatars,
    String status,
    LocalDate activityDate,
    boolean isEnrolled,
    String category,
    String coverImage
) {}
