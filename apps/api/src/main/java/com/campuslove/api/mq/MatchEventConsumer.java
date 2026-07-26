package com.campuslove.api.mq;

import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 匹配事件消费者。
 *
 * <p>监听 {@code match.queue} 队列，处理匹配相关事件：</p>
 * <ul>
 *   <li>match（互相喜欢）：通过 WebSocket 向双方推送心动信号，并持久化通知</li>
 *   <li>like / super_like：持久化"有人喜欢了你"通知</li>
 *   <li>unmatch：持久化取消匹配通知</li>
 * </ul>
 *
 * <p>消费失败时不抛出异常（避免消息无限重投），仅记录错误日志。</p>
 */
@Component
@Profile("real")
public class MatchEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(MatchEventConsumer.class);

    /** 系统通知的虚拟源用户 ID */
    private static final long SYSTEM_SOURCE_USER_ID = 0L;

    /** WebSocket 推送心动信号的队列路径 */
    private static final String WS_SIGNALS_QUEUE = "/queue/signals";

    /** WebSocket 推送匹配通知的队列路径 */
    private static final String WS_MATCHES_QUEUE = "/queue/matches";

    /**
     * WebSocket 消息模板，用于向客户端推送实时消息。
     * 仅在 real profile 下注入。
     */
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /** 通知持久化 Repository */
    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    /** 用户 Repository，用于查询用户信息 */
    @Autowired(required = false)
    private UserRepository userRepository;

    /**
     * 处理匹配事件消息。
     *
     * <p>根据事件类型分发处理：</p>
     * <ul>
     *   <li>{@code match}：互相喜欢，发送心动信号 + 双向通知</li>
     *   <li>{@code like} / {@code super_like}：单向喜欢，通知被喜欢方</li>
     *   <li>{@code unmatch}：取消匹配，通知双方</li>
     * </ul>
     *
     * @param message 匹配事件消息体
     */
    @RabbitListener(queues = "match.queue")
    @Transactional
    public void handleMatchEvent(MatchEventMessage message) {
        if (message == null) {
            log.warn("收到空匹配事件消息，跳过处理");
            return;
        }

        log.info("收到匹配事件：userId={}, targetUserId={}, eventType={}",
                message.getUserId(), message.getTargetUserId(), message.getEventType());

        String eventType = message.getEventType();
        if (eventType == null) {
            log.warn("匹配事件类型为空，跳过处理：{}", message);
            return;
        }

        try {
            switch (eventType) {
                case "match" -> handleMutualMatch(message);
                case "like", "super_like" -> handleSingleLike(message);
                case "unmatch" -> handleUnmatch(message);
                default -> log.warn("未知的匹配事件类型：{}, message={}", eventType, message);
            }
        } catch (Exception e) {
            // 捕获所有异常，避免消息无限重投
            log.warn("匹配事件处理失败，不抛出异常：message={}, error={}",
                    message, e.getMessage(), e);
        }
    }

    /**
     * 处理互相喜欢（match）事件。
     *
     * <p>处理动作：</p>
     * <ol>
     *   <li>通过 WebSocket 向双方推送心动信号</li>
     *   <li>持久化互相匹配的通知到双方的通知列表</li>
     * </ol>
     *
     * @param message 匹配事件消息
     */
    private void handleMutualMatch(MatchEventMessage message) {
        Long userId = message.getUserId();
        Long targetUserId = message.getTargetUserId();
        LocalDateTime createdAt = toLocalDateTime(message.getCreatedAt());

        // 1. 通过 WebSocket 推送心动信号给双方
        if (messagingTemplate != null) {
            try {
                Map<String, Object> signal = Map.of(
                        "type", "mutual_match",
                        "userId", userId,
                        "targetUserId", targetUserId,
                        "createdAt", createdAt.toString()
                );
                messagingTemplate.convertAndSendToUser(
                        String.valueOf(userId), WS_SIGNALS_QUEUE, signal);
                messagingTemplate.convertAndSendToUser(
                        String.valueOf(targetUserId), WS_SIGNALS_QUEUE, signal);
                log.debug("已通过 WebSocket 推送心动信号：userId={}, targetUserId={}",
                        userId, targetUserId);
            } catch (Exception e) {
                log.warn("WebSocket 推送心动信号失败：userId={}, targetUserId={}, error={}",
                        userId, targetUserId, e.getMessage());
            }
        }

        // 2. 持久化通知给双方
        persistNotification(targetUserId, userId, NotificationType.match,
                "你们互相喜欢了",
                "你们互相喜欢了，可以开始聊天了",
                createdAt);
        persistNotification(userId, targetUserId, NotificationType.match,
                "你们互相喜欢了",
                "你们互相喜欢了，可以开始聊天了",
                createdAt);
    }

    /**
     * 处理单向喜欢（like / super_like）事件。
     *
     * <p>通知被喜欢的用户：有人喜欢了你。</p>
     *
     * @param message 匹配事件消息
     */
    private void handleSingleLike(MatchEventMessage message) {
        Long userId = message.getUserId();
        Long targetUserId = message.getTargetUserId();
        LocalDateTime createdAt = toLocalDateTime(message.getCreatedAt());

        String title = "super_like".equals(message.getEventType())
                ? "有人超级喜欢了你"
                : "有人喜欢了你";
        String content = "super_like".equals(message.getEventType())
                ? "有位同学对你点了超级喜欢，快去看看吧"
                : "有位同学对你点了喜欢，快去看看吧";

        // 通过 WebSocket 推送匹配事件通知
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSendToUser(
                        String.valueOf(targetUserId),
                        WS_MATCHES_QUEUE,
                        Map.of("type", message.getEventType(),
                                "fromUserId", userId,
                                "createdAt", createdAt.toString()));
            } catch (Exception e) {
                log.warn("WebSocket 推送喜欢通知失败：targetUserId={}, error={}",
                        targetUserId, e.getMessage());
            }
        }

        // 持久化通知
        persistNotification(targetUserId, userId, NotificationType.like, title, content, createdAt);
    }

    /**
     * 处理取消匹配（unmatch）事件。
     *
     * <p>通知双方：匹配已取消。</p>
     *
     * @param message 匹配事件消息
     */
    private void handleUnmatch(MatchEventMessage message) {
        Long userId = message.getUserId();
        Long targetUserId = message.getTargetUserId();
        LocalDateTime createdAt = toLocalDateTime(message.getCreatedAt());

        persistNotification(userId, targetUserId, NotificationType.match,
                "匹配已取消",
                "你们的匹配已取消",
                createdAt);
        persistNotification(targetUserId, userId, NotificationType.match,
                "匹配已取消",
                "你们的匹配已取消",
                createdAt);
    }

    /**
     * 持久化通知到 notifications 表（best effort）。
     *
     * @param receiverId   通知接收者
     * @param sourceUserId 源用户 ID
     * @param type         通知类型
     * @param title        通知标题（仅用于日志，Notification 实体无 title 字段）
     * @param content      通知内容（仅用于日志）
     * @param createdAt    创建时间
     */
    private void persistNotification(Long receiverId, Long sourceUserId,
                                     NotificationType type, String title,
                                     String content, LocalDateTime createdAt) {
        if (notificationRepository == null) {
            log.debug("NotificationRepository 不可用，跳过持久化：receiverId={}", receiverId);
            return;
        }

        try {
            Notification entity = new Notification();
            entity.setUserId(receiverId);
            entity.setType(type);
            entity.setSourceUserId(sourceUserId != null ? sourceUserId : SYSTEM_SOURCE_USER_ID);
            entity.setReferenceType(ReferenceType.user);
            entity.setIsRead(false);
            entity.setCreatedAt(createdAt != null ? createdAt : LocalDateTime.now());
            notificationRepository.save(entity);
            log.debug("匹配事件通知已持久化：receiverId={}, type={}, title={}",
                    receiverId, type, title);
        } catch (Exception e) {
            log.warn("匹配事件通知持久化失败：receiverId={}, title={}, error={}",
                    receiverId, title, e.getMessage());
        }
    }

    /**
     * 将 Instant 转换为 LocalDateTime（系统默认时区）。
     *
     * @param instant Instant 实例
     * @return LocalDateTime，为 null 时返回当前时间
     */
    private LocalDateTime toLocalDateTime(java.time.Instant instant) {
        if (instant == null) {
            return LocalDateTime.now();
        }
        return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
    }
}
