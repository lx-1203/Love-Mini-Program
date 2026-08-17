package com.campuslove.api.chat;

import java.util.List;

/**
 * 消息首页推荐人摘要视图（新用户冷启动）。
 */
public record PersonSummaryView(
        Long userId,
        String name,
        String avatarUrl,
        String headline,
        List<String> tags,
        String distanceText) {
}
