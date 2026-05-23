package com.campuslove.api.match;

/**
 * 心动信号视图。
 * 用于展示互相喜欢后的心动信号。
 */
public record HeartSignalView(
    Long id,
    Long userAId,
    Long userBId,
    String status,
    String expiresAt,
    String createdAt
) {}
