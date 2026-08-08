package com.campuslove.api.growth;

/**
 * 签到结果视图。
 * 签到操作成功后返回，包含连续天数、额外推荐配额和签到权益信息。
 */
public record CheckInResultView(
    boolean success,
    int consecutiveDays,
    int extraQuota,
    int extraRecommendQuota,
    boolean hotTopicsUnlocked,
    boolean newUsersUnlocked,
    int hotTopicCount,
    int newUserCount,
    /**
     * 本次签到获得的积分（cents，= 单次签到奖励金额）。
     *
     * <p>⚠️ 语义约定：必须是「本次获得」而非余额——前端 checkin store 按
     * {@code pointsBalance += pointsEarned} 累加，若误传余额会造成双计。
     * 已签到重复提交分支返回 0（本次无新增奖励）。</p>
     */
    int points
) {}