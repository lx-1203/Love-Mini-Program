package com.campuslove.api.chat;

/**
 * 关系分数与阈值策略（集中常量，后续调参只改这里）。
 */
public final class RelationshipScorePolicy {

    private RelationshipScorePolicy() {
    }

    public static final double MESSAGE_COUNT_MAX = 50.0;
    public static final double CONVERSATION_DAYS_MAX = 7.0;
    public static final int REPLY_FAST_MINUTES = 30;
    public static final int REPLY_MEDIUM_MINUTES = 120;
    public static final int REPLY_SLOW_MINUTES = 720;
    public static final double PROFILE_VIEW_MAX = 5.0;
    public static final double VOICE_COUNT_MAX = 3.0;
    public static final double PHOTO_COUNT_MAX = 3.0;

    public static String statusFromScore(int score) {
        if (score <= 20) {
            return "just_met";
        }
        if (score <= 50) {
            return "chatting";
        }
        if (score <= 80) {
            return "ambiguous";
        }
        return "mutual_follow";
    }
}
