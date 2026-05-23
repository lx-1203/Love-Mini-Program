package com.campuslove.api.chat;

/**
 * 互动事件视图。
 *
 * @param id             事件 ID
 * @param triggerUser    触发用户信息
 * @param eventType      事件类型
 * @param referenceId    关联实体 ID
 * @param referenceType  关联实体类型
 * @param summary        事件摘要
 * @param isRead         是否已读
 * @param createdAt      创建时间（ISO 格式字符串）
 */
public record InteractionEventView(
    Long id,
    InteractionTriggerUserView triggerUser,
    String eventType,
    Long referenceId,
    String referenceType,
    String summary,
    boolean isRead,
    String createdAt
) {}

/**
 * 互动事件触发用户视图。
 *
 * @param userId    用户 ID
 * @param nickname  昵称
 * @param avatarUrl 头像 URL
 */
record InteractionTriggerUserView(
    Long userId,
    String nickname,
    String avatarUrl
) {}
