package com.campuslove.api.growth;

import java.util.Map;

/**
 * 社交升温进度视图。
 * 包含用户当前社交层级、各维度计数、中文标签及下一步行动建议。
 */
public class SocialProgressView {

    /** 当前社交层级编码（如 L1_EXPOSURE） */
    private final String currentTier;

    /** 当前层级的中文标签 */
    private final String tierLabel;

    /** 曝光次数 */
    private final int exposureCount;

    /** 喜欢/点赞次数 */
    private final int likeCount;

    /** 匹配次数 */
    private final int matchCount;

    /** 聊天次数 */
    private final int chatCount;

    /** 社区互动次数 */
    private final int circleCount;

    /** 活动参与次数 */
    private final int activityCount;

    /** 下一步行动建议文案 */
    private final String nextAction;

    /** 层级中文标签映射 */
    private static final Map<String, String> TIER_LABEL_MAP = Map.of(
        "L1_EXPOSURE", "发现心动",
        "L2_ATTENTION", "表达喜欢",
        "L3_MATCH", "双向匹配",
        "L4_COMMUNICATION", "开启对话",
        "L5_CIRCLE", "参与社区",
        "L6_SCENE", "线下见面"
    );

    /** 层级数值映射，用于计算进度百分比 */
    private static final Map<String, Integer> TIER_INDEX_MAP = Map.of(
        "L1_EXPOSURE", 1,
        "L2_ATTENTION", 2,
        "L3_MATCH", 3,
        "L4_COMMUNICATION", 4,
        "L5_CIRCLE", 5,
        "L6_SCENE", 6
    );

    /** 总层级数 */
    private static final int TOTAL_TIERS = 6;

    /**
     * 构造函数。
     *
     * @param currentTier   当前社交层级编码
     * @param exposureCount 曝光次数
     * @param likeCount     喜欢次数
     * @param matchCount    匹配次数
     * @param chatCount     聊天次数
     * @param circleCount   社区互动次数
     * @param activityCount 活动参与次数
     * @param nextAction    下一步行动建议
     */
    public SocialProgressView(String currentTier, int exposureCount, int likeCount,
                              int matchCount, int chatCount, int circleCount,
                              int activityCount, String nextAction) {
        this.currentTier = currentTier;
        this.tierLabel = TIER_LABEL_MAP.getOrDefault(currentTier, "未知层级");
        this.exposureCount = exposureCount;
        this.likeCount = likeCount;
        this.matchCount = matchCount;
        this.chatCount = chatCount;
        this.circleCount = circleCount;
        this.activityCount = activityCount;
        this.nextAction = nextAction;
    }

    /**
     * 获取社交升温进度百分比（0-100）。
     * <p>
     * 计算规则：当前层级在整个漏斗中的位置占总层级的比例。
     * L1=17%, L2=33%, L3=50%, L4=67%, L5=83%, L6=100%。
     *
     * @return 进度百分比（0-100 的整数）
     */
    public int getProgressPercentage() {
        Integer tierIndex = TIER_INDEX_MAP.getOrDefault(currentTier, 1);
        return tierIndex * 100 / TOTAL_TIERS;
    }

    // ---- getters ----

    public String getCurrentTier() {
        return currentTier;
    }

    public String getTierLabel() {
        return tierLabel;
    }

    public int getExposureCount() {
        return exposureCount;
    }

    public int getLikeCount() {
        return likeCount;
    }

    public int getMatchCount() {
        return matchCount;
    }

    public int getChatCount() {
        return chatCount;
    }

    public int getCircleCount() {
        return circleCount;
    }

    public int getActivityCount() {
        return activityCount;
    }

    public String getNextAction() {
        return nextAction;
    }
}