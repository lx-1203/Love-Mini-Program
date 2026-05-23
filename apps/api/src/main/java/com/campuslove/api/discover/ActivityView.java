package com.campuslove.api.discover;

import java.time.LocalDate;
import java.util.List;

/**
 * 活动列表项视图。
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
    LocalDate activityDate
) {}
