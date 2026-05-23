package com.campuslove.api.chat;

import java.util.List;

/**
 * 互动事件服务接口。
 * 提供记录互动事件、查询事件列表、获取未读数、标记已读等功能。
 */
public interface InteractionEventService {

    /**
     * 记录互动事件。
     *
     * @param userId        事件接收者用户 ID（被互动的用户）
     * @param triggerUserId 触发事件的用户 ID（发起互动的用户）
     * @param eventType     事件类型 (NEW_LIKE / NEW_VISITOR / NEW_FOLLOW / POST_LIKED / POST_COMMENTED / TOPIC_REPLIED)
     * @param referenceId   关联实体 ID
     * @param referenceType 关联实体类型 (POST / COMMENT / TOPIC / USER)
     * @param summary       事件摘要
     */
    void recordEvent(Long userId, Long triggerUserId, String eventType,
                     Long referenceId, String referenceType, String summary);

    /**
     * 查询互动事件列表（分页）。
     *
     * @param userId 用户 ID
     * @param page   页码（从 0 开始）
     * @param size   每页大小
     * @return 互动事件视图列表
     */
    List<InteractionEventView> getInteractionEvents(Long userId, int page, int size);

    /**
     * 获取未读互动事件数。
     *
     * @param userId 用户 ID
     * @return 未读互动事件数
     */
    long getUnreadCount(Long userId);

    /**
     * 标记指定事件为已读。
     *
     * @param eventId 事件 ID
     * @param userId  用户 ID（用于验证）
     */
    void markAsRead(Long eventId, Long userId);

    /**
     * 标记所有互动事件为已读。
     *
     * @param userId 用户 ID
     */
    void markAllAsRead(Long userId);
}
