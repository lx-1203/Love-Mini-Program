package com.campuslove.api.block;

/**
 * 被拉黑用户视图（3-F 拉黑列表项）。
 *
 * @param userId     被拉黑用户 ID
 * @param nickname   被拉黑用户昵称（用户不存在时回退「未知用户」）
 * @param avatarUrl  被拉黑用户头像 URL（可为空）
 * @param blockedAt  拉黑时间（ISO 字符串）
 */
public record BlockedUserView(
    Long userId,
    String nickname,
    String avatarUrl,
    String blockedAt
) {}
