package com.campuslove.api.chat;

/**
 * 私信消息视图。
 * 用于展示会话中的消息。
 */
public record MessageView(
    Long id,
    Long conversationId,
    Long senderId,
    String content,
    String messageKind,
    boolean isRead,
    String createdAt
) {}
