package com.campuslove.api.chat;

/**
 * 寻觅助手建议视图。
 */
public record AssistantSuggestionView(
        String icon,
        String title,
        String subtitle,
        String targetUrl) {
}
