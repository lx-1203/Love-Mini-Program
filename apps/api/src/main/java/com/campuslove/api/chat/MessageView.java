package com.campuslove.api.chat;

/**
 * 私信消息视图。
 * 用于展示会话中的消息。
 * quoteContext 为可选字段，当 messageKind 为 "quote" 时携带引用来源信息。
 */
public record MessageView(
    Long id,
    Long conversationId,
    Long senderId,
    String content,
    String messageKind,
    boolean isRead,
    String createdAt,
    String quoteContext
) {
    /** 兼容旧调用方式（无 quoteContext）的工厂方法 */
    public MessageView(Long id, Long conversationId, Long senderId, String content,
                       String messageKind, boolean isRead, String createdAt) {
        this(id, conversationId, senderId, content, messageKind, isRead, createdAt, null);
    }
}
