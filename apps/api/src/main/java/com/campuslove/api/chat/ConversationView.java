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
    String sessionType
) {}
