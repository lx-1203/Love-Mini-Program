package com.campuslove.api.profile;

/**
 * 主页运营配置（2.0 Profile Config 层）。
 */
public record ProfileConfigView(
        boolean showMBTI,
        boolean showVoice,
        boolean showCircle,
        int maxStories,
        int minHighQualityScore
) {
}
