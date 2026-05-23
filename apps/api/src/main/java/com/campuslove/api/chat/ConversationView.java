package com.campuslove.api.chat;

/**
 * 私信会话视图。
 * 用于展示用户的会话列表。
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
    int unreadCount
) {}
