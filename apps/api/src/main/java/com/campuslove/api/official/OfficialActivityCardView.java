package com.campuslove.api.official;

/**
 * 官方号活动卡快照（关联 activities 表）。
 * 复用 Activity 现有字段，不新增活动字段。
 */
public record OfficialActivityCardView(
        Long activityId,
        String title,
        String imageUrl,
        String timeText,
        String locationText,
        int enrollmentCount,
        String recommendReason) {
}
