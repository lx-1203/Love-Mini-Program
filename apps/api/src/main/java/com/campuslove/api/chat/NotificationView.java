package com.campuslove.api.chat;

/**
 * 通知列表项视图。
 * Phase 3 新增 signalType 字段，用于区分社交信号(SOCIAL)和内容信号(CONTENT)。
 */
public record NotificationView(
    Long id,
    String type,
    NotificationSourceUserView sourceUser,
    Long referenceId,
    String referenceType,
    boolean isRead,
    String createdAt,
    String summary,
    String signalType
) {}
