package com.campuslove.api.profile;

/**
 * 互动数据（恋爱化统计，替代工具感强的 ProfileStatsView）。
 */
public record ProfileSocialProofView(
        long likedMeCount,
        long likesCount,
        long visitorCount,
        long matchCount
) {
}
