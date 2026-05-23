package com.campuslove.api.user;

/**
 * 关注/粉丝用户视图。
 *
 * @param userId         用户 ID
 * @param nickname       昵称
 * @param avatarUrl      头像 URL
 * @param bio            个人简介
 * @param followingCount 关注数
 * @param followersCount 粉丝数
 */
public record FollowUserView(
    Long userId,
    String nickname,
    String avatarUrl,
    String bio,
    int followingCount,
    int followersCount
) {
}
