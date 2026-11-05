package com.campuslove.api.chat;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

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

    /** 无分页兼容接口的列表条数上限（infra R2-00245） */
    private static final int MAX_LIST_LIMIT = 200;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    /** R16-3：落库短事务（REQUIRED）——推送移出事务后的落库载体（照抄 RealPrivateMessageService S2-1 口径） */
    private final TransactionTemplate transactionTemplate;

    public RealNotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate,
            PlatformTransactionManager transactionManager) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // ---- Phase 1 兼容方法 ----

    @Override
    @Transactional(readOnly = true)
    public List<NotificationView> getNotifications(Long userId) {
        if (userId == null) {
            return List.of();
        }
        // infra R2-00245: 无分页兼容方法限制查询上限，避免通知量大时全量加载（OOM/大响应）
        List<Notification> notifications = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, MAX_LIST_LIMIT)).getContent();
        Map<Long, User> sourceUserMap = batchLoadSourceUsers(notifications);
        return notifications.stream()
                .map(n -> toNotificationView(n, sourceUserMap))
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

        // Task 2.2.1：批量预加载源用户，避免在 toNotificationView 中触发 N+1 查询
        Map<Long, User> sourceUserMap = batchLoadSourceUsers(notificationPage.getContent());
        return notificationPage.getContent().stream()
                .map(n -> toNotificationView(n, sourceUserMap))
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

        // infra R2-00244: signalType 筛选下推到 SQL（原实现先分页后内存过滤，
        // 第 1 页全是另一类型时返回空、需翻多页才见数据）
        Page<Notification> notificationPage;
        if (signalType != null && !signalType.isBlank()) {
            List<Notification.NotificationType> types = resolveSignalTypes(signalType);
            notificationPage = Boolean.TRUE.equals(unreadOnly)
                    ? notificationRepository.findByUserIdAndIsReadAndTypeInOrderByCreatedAtDesc(
                            userId, false, types, pageable)
                    : notificationRepository.findByUserIdAndTypeInOrderByCreatedAtDesc(
                            userId, types, pageable);
        } else if (Boolean.TRUE.equals(unreadOnly)) {
            notificationPage = notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDesc(
                    userId, false, pageable);
        } else {
            notificationPage = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }

        // Task 2.2.1：批量预加载源用户，避免在 toNotificationView 中触发 N+1 查询
        Map<Long, User> sourceUserMap = batchLoadSourceUsers(notificationPage.getContent());
        return notificationPage.getContent().stream()
                .map(n -> toNotificationView(n, sourceUserMap))
                .toList();
    }

    /**
     * 将 signalType（SOCIAL/CONTENT）解析为通知类型集合，映射与 {@link #determineSignalType} 一致。
     *
     * @param signalType 信号分类（SOCIAL/CONTENT）
     * @return 对应通知类型集合（未知值按 SOCIAL 处理）
     */
    private List<Notification.NotificationType> resolveSignalTypes(String signalType) {
        if (SIGNAL_TYPE_CONTENT.equalsIgnoreCase(signalType)) {
            return List.of(Notification.NotificationType.comment,
                    Notification.NotificationType.follow,
                    Notification.NotificationType.mention,
                    Notification.NotificationType.topic_like);
        }
        return List.of(Notification.NotificationType.match,
                Notification.NotificationType.visitor,
                Notification.NotificationType.like);
    }

    /**
     * 批量查询通知源用户信息，避免 N+1 查询。
     *
     * <p>Task 2.2.1：原 {@code toNotificationView(Notification)} 内部为每条通知
     * 单独调用 {@code userRepository.findById(sourceUserId)}，N 条通知触发 N 次 SELECT user。
     * 本方法先收集 distinct sourceUserId 列表，再通过 {@link org.springframework.data.jpa.repository.JpaRepository#findAllById(Iterable)}
     * 一次性查询并组装为 Map，由 {@code toNotificationView(Notification, Map)} 复用。</p>
     *
     * @param notifications 通知列表
     * @return sourceUserId → User 实体的 Map（可能为空 Map）
     */
    private Map<Long, User> batchLoadSourceUsers(List<Notification> notifications) {
        if (notifications == null || notifications.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> sourceUserIds = notifications.stream()
                .map(Notification::getSourceUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (sourceUserIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(sourceUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
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

        // infra R2-00246: 批量 UPDATE 标记已读，避免全量加载未读通知再逐条 saveAll（写放大）
        notificationRepository.markAllAsReadByUserId(userId);
    }

    /**
     * 创建通知（内部方法，供其他服务调用）。
     *
     * <p>R16-3（2026-11-05 事务边界治理，S2-1 同口径）：原方法级 @Transactional 把 WS 推送
     * 圈进事务——①推送 I/O 期间持有 Hikari 连接；②推送先于提交，事务回滚则客户端收到
     * 幻影通知。改为 TransactionTemplate 短事务落库+取视图，推送移到事务提交之后
     * （调用方自带事务时 REQUIRED 加入、推送仍在该外层事务外执行）。</p>
     */
    @Override
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
        notification.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        // 落库 + 视图构建在短事务内完成（实体带 @Version 时 save 走 merge 返回新托管实例，
        // 必须接收返回值回填 id，否则视图里 notification.getId() 为 null）
        NotificationView notificationView = transactionTemplate.execute(status -> {
            Notification saved = notificationRepository.save(notification);
            return toNotificationView(saved);
        });

        // WS 推送在事务提交之后（S2-1 口径：接收端先收到推送、回查却读不到的幻影窗口消除；
        // 事务回滚时不再产生已推送的幻影通知）
        if (notificationView != null) {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/notifications",
                    notificationView
            );
        }
    }

    /**
     * 创建系统语义通知（自定义文案通道，F-11/F-10，2026-11-04）。
     *
     * <p>type 固定 system；summary 直接用调用方文案（不经 buildSummary——system
     * 类型在模板里没有语义正确的分支，第二辑举报结果通知曾因此渲染成
     * 「{处理人昵称}与你互动」）。sourceUser 由 userRepository.findById 实际加载，
     * WS 推送视图与 REST 列表同源。落库+推送同 {@link #createNotification} 口径。</p>
     */
    @Override
    public void createSystemNotification(Long userId, Long sourceUserId, String content, Long referenceId, String referenceType) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (sourceUserId == null) {
            throw new IllegalArgumentException("sourceUserId is required");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(NotificationType.system);
        notification.setSourceUserId(sourceUserId);
        notification.setReferenceId(referenceId);
        if (referenceType != null) {
            notification.setReferenceType(ReferenceType.valueOf(referenceType));
        }
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        // R16-3（S2-1 同口径）：落库+视图在短事务内，推送移到事务提交后
        NotificationView view = transactionTemplate.execute(status -> {
            Notification saved = notificationRepository.save(notification);
            User sourceUser = userRepository.findById(sourceUserId).orElse(null);
            return new NotificationView(
                    saved.getId(),
                    saved.getType().name(),
                    sourceUser != null
                            ? new NotificationSourceUserView(sourceUser.getId(), sourceUser.getNickname(), sourceUser.getAvatarUrl())
                            : null,
                    saved.getReferenceId(),
                    saved.getReferenceType() != null ? saved.getReferenceType().name() : null,
                    saved.getIsRead(),
                    saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null,
                    content,
                    SIGNAL_TYPE_SOCIAL
            );
        });
        if (view != null) {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/notifications",
                    view
            );
        }
    }

    // ---- 私有辅助方法 ----

    /**
     * 将 Notification 实体转换为 NotificationView（兼容旧调用）。
     * 单条通知场景（如 createNotification 的 WS 实时推送）调用，内部通过
     * userRepository.findById 加载源用户——2026-11-04 修复：原实现传 emptyMap，
     * 实时推送的 summary 全部渲染成「未知用户赞了你的帖子」（F-15，与类注释
     * 承诺的行为不符）；REST 列表侧本就正确，本修复对齐实时推送文案。
     * <p>注意：批量查询场景应使用 {@link #toNotificationView(Notification, Map)}，
     * 配合 {@link #batchLoadSourceUsers(List)} 预加载的 Map 复用，避免 N+1 查询。</p>
     */
    private NotificationView toNotificationView(Notification notification) {
        User sourceUser = userRepository.findById(notification.getSourceUserId()).orElse(null);
        Map<Long, User> map = sourceUser != null
                ? Map.of(notification.getSourceUserId(), sourceUser)
                : Collections.emptyMap();
        return toNotificationView(notification, map);
    }

    /**
     * 将 Notification 实体转换为 NotificationView（批量场景）。
     *
     * <p>Task 2.2.1：从预加载的 sourceUser Map 中按 sourceUserId 取出 User 实体，
     * 避免在循环中触发 N 次 SELECT user 查询。Map 中不存在时按"未知用户"处理。</p>
     *
     * @param notification 通知实体
     * @param sourceUserMap sourceUserId → User 实体的 Map（可能为空 Map，表示批量预加载失败或未启用）
     * @return 通知视图
     */
    private NotificationView toNotificationView(Notification notification, Map<Long, User> sourceUserMap) {
        // 从预加载的 Map 中获取源用户信息（O(1)，无 N+1 查询）
        User sourceUser = sourceUserMap != null ? sourceUserMap.get(notification.getSourceUserId()) : null;
        String displayName = sourceUser != null ? sourceUser.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatar = sourceUser != null ? sourceUser.getAvatarUrl() : null;

        String type = notification.getType().name();
        String summary = buildSummary(type, displayName, notification.getReferenceType());
        String signalType = determineSignalType(type);

        return new NotificationView(
                notification.getId(),
                type,
                // R14-4：id 直取 sourceUserId（即使源用户被删/不在预载 Map，ID 仍可靠下发）
                new NotificationSourceUserView(notification.getSourceUserId(), displayName, avatar),
                notification.getReferenceId(),
                notification.getReferenceType() != null ? notification.getReferenceType().name() : null,
                notification.getIsRead(),
                notification.getCreatedAt().toString(),
                summary,
                signalType
        );
    }

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
    public static String determineSignalType(String type) {
        if (type == null) {
            return SIGNAL_TYPE_SOCIAL;
        }
        return switch (type) {
            case "match", "visitor", "like" -> SIGNAL_TYPE_SOCIAL;
            case "comment", "follow", "mention", "topic_like" -> SIGNAL_TYPE_CONTENT;
            default -> SIGNAL_TYPE_SOCIAL;
        };
    }

    /**
     * 构建通知摘要文本。
     */
    private String buildSummary(String type, String sourceUserName, ReferenceType referenceType) {
        String ref = referenceType != null ? referenceType.name() : null;
        return switch (type) {
            case "follow" -> sourceUserName + "关注了你";
            case "like" -> sourceUserName + "赞了你的帖子";
            case "comment" -> sourceUserName + "评论了你";
            case "mention" -> switch (ref != null ? ref : "") {
                case "topic" -> sourceUserName + "在话题中提到了你";
                case "comment" -> sourceUserName + "在话题评论中提到了你";
                case "post" -> sourceUserName + "在帖子中提到了你";
                default -> sourceUserName + "提到了你";
            };
            case "topic_like" -> sourceUserName + "赞了你的话题";
            case "visitor" -> sourceUserName + "访问了你的主页";
            case "match" -> "你和" + sourceUserName + "配对成功";
            case "system" -> "系统通知";
            case "unmatch" -> sourceUserName + "取消了与你的匹配";
            default -> sourceUserName + "与你互动";
        };
    }

}