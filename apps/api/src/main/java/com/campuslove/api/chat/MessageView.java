package com.campuslove.api.chat;

/**
 * 私信消息视图。
 * 用于展示会话中的消息。
 * quoteContext 为可选字段，当 messageKind 为 "quote" 时携带引用来源信息。
 * durationSeconds 为语音消息时长（秒），非语音消息为 null（录音修复：私信语音时长持久化）。
 */
public record MessageView(
    Long id,
    Long conversationId,
    Long senderId,
    String content,
    String messageKind,
    boolean isRead,
    String createdAt,
    String quoteContext,
    Integer durationSeconds
) {
    /** 兼容旧调用方式（无 quoteContext / durationSeconds）的工厂方法 */
    public MessageView(Long id, Long conversationId, Long senderId, String content,
                       String messageKind, boolean isRead, String createdAt) {
        this(id, conversationId, senderId, content, messageKind, isRead, createdAt, null, null);
    }

    /** 兼容旧调用方式（有 quoteContext、无 durationSeconds）的工厂方法 */
    public MessageView(Long id, Long conversationId, Long senderId, String content,
                       String messageKind, boolean isRead, String createdAt, String quoteContext) {
        this(id, conversationId, senderId, content, messageKind, isRead, createdAt, quoteContext, null);
    }
}
