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
 * Phase 3 新增：signalType 社交/内容信号分类筛选。
 */
@Profile("real")
@Service
public class RealNotificationService implements NotificationService {

    /** 社交信号类型：喜欢/访客/心动信号/匹配 */
    public static final String SIGNAL_TYPE_SOCIAL = "SOCIAL";
    /** 内容信号类型：评论/点赞/关注/回复 */
    public static final String SIGNAL_TYPE_CONTENT = "CONTENT";

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
     * 获取指定用户的通知列表（分页，支持未读过滤和信号类型筛选）。
     * Phase 3 新增：按社交信号(SOCIAL)/内容信号(CONTENT)分类筛选。
     * 先查询数据库获取全部通知，再在内存中按 signalType 过滤。
     */
    @Override
    @Transactional(readOnly = true)
    public List<NotificationView> getNotifications(Long userId, Boolean unreadOnly, String signalType, Pageable pageable) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 先获取全部通知
        List<NotificationView> allViews = getNotifications(userId, unreadOnly, pageable);

        // 如果指定了 signalType，进行内存过滤
        if (signalType != null && !signalType.isBlank()) {
            return allViews.stream()
                    .filter(view -> signalType.equals(view.signalType()))
                    .toList();
        }

        return allViews;
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
     * 根据通知类型判断信号分类。
     * <ul>
     *   <li>SOCIAL（社交信号）：match(匹配)、visitor(访客)、like(喜欢) -- 人与人的直接互动</li>
     *   <li>CONTENT（内容信号）：comment(评论)、follow(关注) -- 内容/关系层面的互动</li>
     * </ul>
     *
     * @param type 通知类型字符串
     * @return "SOCIAL" 或 "CONTENT"
     */
    static String determineSignalType(String type) {
        if (type == null) {
            return SIGNAL_TYPE_SOCIAL;
        }
        return switch (type) {
            case "match", "visitor", "like" -> SIGNAL_TYPE_SOCIAL;
            case "comment", "follow" -> SIGNAL_TYPE_CONTENT;
            default -> SIGNAL_TYPE_SOCIAL;
        };
    }

    /**
     * 将 Notification 实体转换为 NotificationView。
     * Phase 3 更新：增加 signalType 字段。
     */
    private NotificationView toNotificationView(Notification notification) {
        // 获取源用户信息
        User sourceUser = userRepository.findById(notification.getSourceUserId()).orElse(null);
        String displayName = sourceUser != null ? sourceUser.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatar = sourceUser != null ? sourceUser.getAvatarUrl() : null;

        String type = notification.getType().name();
        String summary = buildSummary(type, displayName);
        String signalType = determineSignalType(type);

        return new NotificationView(
                notification.getId(),
                type,
                new NotificationSourceUserView(displayName, avatar),
                notification.getReferenceId(),
                notification.getReferenceType() != null ? notification.getReferenceType().name() : null,
                notification.getIsRead(),
                notification.getCreatedAt().toString(),
                summary,
                signalType
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