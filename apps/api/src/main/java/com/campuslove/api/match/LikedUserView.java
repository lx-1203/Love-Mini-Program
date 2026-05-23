package com.campuslove.api.match;

/**
 * 喜欢我的用户视图。
 * 用于展示谁喜欢了当前用户。
 */
public record LikedUserView(
    Long userId,
    String nickname,
    String avatarUrl,
    String campusName,
    String likedAt
) {}
