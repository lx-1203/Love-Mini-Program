package com.campuslove.api.chat;

/**
 * 正在升温关系摘要视图（关系信息 + 用户摘要）。
 */
public record RelationshipPersonView(
        Long userId,
        String name,
        String avatarUrl,
        String headline,
        RelationshipInfo relationship) {
}
