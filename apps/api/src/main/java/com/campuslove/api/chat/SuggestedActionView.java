package com.campuslove.api.chat;

/**
 * 关系建议动作视图。
 */
public record SuggestedActionView(
        String type,
        String text,
        String targetUrl,
        String reason) {
}
