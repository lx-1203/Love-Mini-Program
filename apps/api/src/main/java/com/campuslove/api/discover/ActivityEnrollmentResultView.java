package com.campuslove.api.discover;

/**
 * 活动报名/取消报名操作结果视图。
 */
public record ActivityEnrollmentResultView(
    Long activityId,
    boolean enrolled,
    int enrollmentCount
) {}
