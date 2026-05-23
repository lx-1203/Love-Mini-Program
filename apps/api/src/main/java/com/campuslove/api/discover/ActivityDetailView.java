package com.campuslove.api.discover;

import java.time.LocalDate;
import java.util.List;

/**
 * 活动详情视图，包含是否已报名状态。
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
    boolean isEnrolled
) {}
