package com.campuslove.api.chat;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实互动通知服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供通知列表、标记已读、未读计数、创建通知等功能。
 */
@Profile("real")
@Service
public class RealNotificationService implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public RealNotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // ---- Phase 1 兼容方法 ----

    @Override
    @Transactional(readOnly = true)
    public List<NotificationView> getNotifications(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, Pageable.unpaged())
                .getContent().stream()
                .map(this::toNotificationView)
                .toList();
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId) {
        if (notificationId == null) {
            throw new IllegalArgumentException("notificationId is required");
        }
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public UnreadCountView getUnreadCount(Long userId) {
        if (userId == null) {
            return new UnreadCountView(0);
        }
        long count = notificationRepository.countByUserIdAndIsRead(userId, false);
        return new UnreadCountView(count);
    }

    // ---- Phase 2 核心实现 ----

    /**
     * 获取指定用户的通知列表（分页，支持仅未读过滤）。
     */
    @Override
    @Transactional(readOnly = true)
    public List<NotificationView> getNotifications(Long userId, Boolean unreadOnly, Pageable pageable) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        Page<Notification> notificationPage;
        if (Boolean.TRUE.equals(unreadOnly)) {
            notificationPage = notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDesc(
                    userId, false, pageable);
        } else {
            notificationPage = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }

        return notificationPage.getContent().stream()
                .map(this::toNotificationView)
                .toList();
    }

    /**
     * 获取指定用户的未读通知数。
     */
    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    /**
     * 标记指定通知为已读（带用户验证）。
     */
    @Override
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        if (notificationId == null) {
            throw new IllegalArgumentException("notificationId is required");
        }
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));

        // 验证通知属于该用户
        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Notification does not belong to this user");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    /**
     * 标记指定用户的所有通知为已读。
     */
    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 查找所有未读通知并标记为已读
        List<Notification> unreadNotifications = notificationRepository
                .findByUserIdAndIsReadOrderByCreatedAtDesc(userId, false);
        for (Notification notification : unreadNotifications) {
            notification.setIsRead(true);
        }
        notificationRepository.saveAll(unreadNotifications);
    }

    /**
     * 创建通知（内部方法，供其他服务调用）。
     */
    @Override
    @Transactional
    public void createNotification(Long userId, String type, Long sourceUserId, Long referenceId, String referenceType) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("type is required");
        }
        if (sourceUserId == null) {
            throw new IllegalArgumentException("sourceUserId is required");
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(NotificationType.valueOf(type));
        notification.setSourceUserId(sourceUserId);
        notification.setReferenceId(referenceId);
        if (referenceType != null) {
            notification.setReferenceType(ReferenceType.valueOf(referenceType));
        }
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);

        // 通过 WebSocket 推送通知给目标用户
        NotificationView notificationView = toNotificationView(notification);
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/notifications",
                notificationView
        );
    }

    // ---- 私有辅助方法 ----

    /**
     * 将 Notification 实体转换为 NotificationView。
     */
    private NotificationView toNotificationView(Notification notification) {
        // 获取源用户信息
        User sourceUser = userRepository.findById(notification.getSourceUserId()).orElse(null);
        String displayName = sourceUser != null ? sourceUser.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatar = sourceUser != null ? sourceUser.getAvatarUrl() : null;

        String summary = buildSummary(notification.getType().name(), displayName);

        return new NotificationView(
                notification.getId(),
                notification.getType().name(),
                new NotificationSourceUserView(displayName, avatar),
                notification.getReferenceId(),
                notification.getReferenceType() != null ? notification.getReferenceType().name() : null,
                notification.getIsRead(),
                notification.getCreatedAt().toString(),
                summary
        );
    }

    /**
     * 构建通知摘要文本。
     */
    private String buildSummary(String type, String sourceUserName) {
        return switch (type) {
            case "follow" -> sourceUserName + "关注了你";
            case "like" -> sourceUserName + "赞了你的帖子";
            case "comment" -> sourceUserName + "评论了你";
            case "visitor" -> sourceUserName + "访问了你的主页";
            case "match" -> "你和" + sourceUserName + "配对成功";
            default -> sourceUserName + "与你互动";
        };
    }

}
