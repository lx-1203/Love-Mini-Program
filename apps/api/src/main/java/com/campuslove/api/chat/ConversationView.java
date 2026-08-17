package com.campuslove.api.chat;

/**
 * 私信会话视图。
 * 用于展示用户的会话列表，包含对方用户信息和会话状态。
 */
public record ConversationView(
    Long id,
    String conversationUid,
    Long userAId,
    Long userBId,
    String otherUserName,
    String otherUserAvatar,
    String lastMessagePreview,
    String lastMessageAt,
    int unreadCount,
    /** 对方用户简介/标题 */
    String headline,
    /** 是否置顶 */
    Boolean pinned,
    /** 会话阶段：matching/active/closing/closed */
    String phase,
    /** 会话类型：private/temp_anonymous */
    String sessionType,
    /** 当前用户是否静音本会话（会话级免打扰，2026-08-10 B1③） */
    Boolean muted,
    /** 关系信息（消息 V3；无关系时为 null） */
    RelationshipInfo relationship
) {
    /** 兼容旧调用（无关系信息）的构造器 */
    public ConversationView(
            Long id,
            String conversationUid,
            Long userAId,
            Long userBId,
            String otherUserName,
            String otherUserAvatar,
            String lastMessagePreview,
            String lastMessageAt,
            int unreadCount,
            String headline,
            Boolean pinned,
            String phase,
            String sessionType,
            Boolean muted) {
        this(id, conversationUid, userAId, userBId, otherUserName, otherUserAvatar,
                lastMessagePreview, lastMessageAt, unreadCount, headline, pinned, phase,
                sessionType, muted, null);
    }
}

