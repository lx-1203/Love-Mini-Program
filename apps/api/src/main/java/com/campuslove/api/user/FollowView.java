package com.campuslove.api.user;

/**
 * 关注操作结果视图。
 *
 * @param isFollowing   操作后是否处于关注状态（true=已关注，false=已取关）
 * @param userId        关注者用户 ID
 * @param targetUserId  被关注者用户 ID
 * @param followingCount 关注者的关注数
 * @param followersCount 被关注者的粉丝数
 */
public record FollowView(
    boolean isFollowing,
    Long userId,
    Long targetUserId,
    int followingCount,
    int followersCount
) {
}
