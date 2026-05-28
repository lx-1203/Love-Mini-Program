package com.campuslove.api.chat;

import java.util.List;
import org.springframework.data.domain.Pageable;

/**
 * 互动通知服务接口。
 * 提供获取通知列表、标记已读、获取未读数等功能。
 * Phase 2 新增：分页查询、全部标记已读、创建通知等方法。
 * Phase 3 新增：signalType 社交/内容信号分类筛选。
 */
public interface NotificationService {

    /**
     * 获取指定用户的通知列表。
     *
     * @param userId 用户 ID
     * @return 通知视图列表
     */
    List<NotificationView> getNotifications(Long userId);

    /**
     * 标记指定通知为已读。
     *
     * @param notificationId 通知 ID
     */
    void markAsRead(Long notificationId);

    /**
     * 获取指定用户的未读通知数。
     *
     * @param userId 用户 ID
     * @return 未读数视图
     */
    UnreadCountView getUnreadCount(Long userId);

    // ---- Phase 2 新增方法 ----

    /**
     * 获取指定用户的通知列表（分页，支持仅未读过滤）。
     *
     * @param userId      用户 ID
     * @param unreadOnly  是否仅显示未读
     * @param pageable    分页参数
     * @return 通知视图列表
     */
    List<NotificationView> getNotifications(Long userId, Boolean unreadOnly, Pageable pageable);

    /**
     * 获取指定用户的通知列表（分页，支持未读过滤和信号类型筛选）。
     * Phase 3 新增：按社交/内容信号分类筛选。
     *
     * @param userId      用户 ID
     * @param unreadOnly  是否仅显示未读
     * @param signalType  信号类型筛选："SOCIAL"（社交信号）/ "CONTENT"（内容信号），为 null 时不筛选
     * @param pageable    分页参数
     * @return 通知视图列表
     */
    List<NotificationView> getNotifications(Long userId, Boolean unreadOnly, String signalType, Pageable pageable);

    /**
     * 标记指定通知为已读（带用户验证）。
     *
     * @param notificationId 通知 ID
     * @param userId         用户 ID
     */
    void markAsRead(Long notificationId, Long userId);

    /**
     * 标记指定用户的所有通知为已读。
     *
     * @param userId 用户 ID
     */
    void markAllAsRead(Long userId);

    /**
     * 创建通知（内部方法，供其他服务调用）。
     *
     * @param userId        通知接收者用户 ID
     * @param type          通知类型 (follow/like/comment/visitor/match)
     * @param sourceUserId  触发通知的源用户 ID
     * @param referenceId   关联实体 ID
     * @param referenceType 关联实体类型 (post/comment/user)
     */
    void createNotification(Long userId, String type, Long sourceUserId, Long referenceId, String referenceType);
}

/**
 * 通知列表项视图。
 * Phase 3 新增 signalType 字段，用于区分社交信号(SOCIAL)和内容信号(CONTENT)。
 */
record NotificationView(
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

/**
 * 通知源用户视图。
 */
record NotificationSourceUserView(
    String displayName,
    String avatar
) {}

/**
 * 未读通知数字段视图。
 */
record UnreadCountView(
    long count
) {}