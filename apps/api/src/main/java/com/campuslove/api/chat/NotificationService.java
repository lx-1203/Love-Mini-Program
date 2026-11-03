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

    /**
     * 创建系统语义通知（自定义文案通道，2026-11-04 第三辑审查）。
     *
     * <p>与 {@link #createNotification} 的区别：summary 不经 buildSummary 模板拼接，
     * 而是直接下发调用方给定的文案——用于「举报处理结果」「收到悄悄话」这类语义
     * 自成一体的系统通知。这两类此前误走通用通道：type=system 落到 buildSummary 的
     * default 分支，举报人收到的文案是「{处理人昵称}与你互动」——语义完全不对，
     * 且向举报人暴露处理人身份（第二辑 N-1 修复的质量缺陷，第三辑 F-11）。</p>
     *
     * @param userId        通知接收者用户 ID
     * @param sourceUserId  来源用户 ID（source_user_id 列 NOT NULL，必填；举报结果场景
     *                      传举报人本人——自来源系统通知，不把处理人头像/昵称暴露给举报人；
     *                      悄悄话到达场景传发送者，头像即消息语义）
     * @param content       通知文案（原样下发为 summary，客户端展示为 title/content）
     * @param referenceId   关联实体 ID（可空）
     * @param referenceType 关联实体类型（可空；传 "whisper" 时客户端通知中心落点=
     *                      悄悄话收件箱，见 client utils/notification-target.ts）
     */
    void createSystemNotification(Long userId, Long sourceUserId, String content, Long referenceId, String referenceType);
}