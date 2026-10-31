package com.campuslove.api.mq;

import com.campuslove.api.common.TimeZones;
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
 * <p><b>消费失败不再静默丢弃（P1，2026-10-31）</b>：原实现在这里
 * {@code catch (RuntimeException) → log.warn}，异常被吞掉后消息被 ack，
 * 事件从此消失——{@code spring.rabbitmq.listener.simple.retry.max-attempts: 3} 是死配置，
 * 死信链路（{@code match.dlx} → {@code match.dlq}，见 RabbitConfig）也永远收不到东西。
 * 现在<b>原样抛出</b>：容器按 yml 重试，耗尽后由
 * {@code RabbitConfig#deadLetteringMessageRecoverer()} 拒绝并转死信，
 * {@link DeadLetterListener} 打 ERROR。</p>
 *
 * <p><b>幂等（P0，2026-10-31）</b>：一次投递会写<b>两条</b>通知（match/unmatch 双方各一条），
 * 所以去重发生在「一次投递」这一层而不是「一行通知」这一层——先向
 * {@link ConsumerIdempotencyStore} 抢事件级登记，抢不到就直接跳过；
 * 处理失败时撤销登记，让重试/死信重放仍能执行。键口径见 {@link EventDedupKeys}。</p>
 *
 * <p>WebSocket 推送的异常仍然就地 catch：它属于「不可重试」的旁路提醒
 * （客户端不在线/会话已断，重试也不会送到），而且一次重投会让双方各收到两次
 * 实时信号；站内通知的持久化才是本方法的职责并参与重试。</p>
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

    /** P0（2026-10-31）：消费幂等登记（mock/无 Redisson 时为 null，退化为不判重） */
    @Autowired(required = false)
    private ConsumerIdempotencyStore idempotencyStore;

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
            // 非可重试：空消息重投也仍是空消息，记录后 ack
            log.warn("收到空匹配事件消息，跳过处理（非可重试）");
            return;
        }

        String dedupKey = EventDedupKeys.matchKey(message);
        if (idempotencyStore != null && !idempotencyStore.claim(dedupKey)) {
            log.info("匹配事件已处理过，跳过本次投递（幂等）：dedupKey={}, userId={}, eventType={}",
                    dedupKey, message.getUserId(), message.getEventType());
            return;
        }

        log.info("收到匹配事件：userId={}, targetUserId={}, eventType={}, dedupKey={}",
                message.getUserId(), message.getTargetUserId(), message.getEventType(), dedupKey);

        String eventType = message.getEventType();
        if (eventType == null) {
            // 非可重试：字段缺失不会因重试变好；撤销登记后按「本事件已放弃」处理
            log.warn("匹配事件类型为空，跳过处理（非可重试）：{}", message);
            if (idempotencyStore != null) {
                idempotencyStore.release(dedupKey);
            }
            return;
        }

        try {
            switch (eventType) {
                case "match" -> handleMutualMatch(message);
                case "like", "super_like" -> handleSingleLike(message);
                case "visitor" -> handleVisitor(message);
                case "unmatch" -> handleUnmatch(message);
                default -> {
                    // 非可重试：未知类型永远未知。不再静默 warn 后 ack —— 抛出去，
                    // 让它带 x-death 进 match.dlq 留案发现场（口径同 NotificationConsumer）。
                    log.warn("未知的匹配事件类型，拒绝并转死信：eventType={}, message={}",
                            eventType, message);
                    throw new org.springframework.amqp.AmqpRejectAndDontRequeueException(
                            "未知匹配事件类型，不可重试：eventType=" + eventType);
                }
            }
        } catch (RuntimeException e) {
            // 撤销幂等登记：本次没做成，必须允许 broker 重试与 DLQ 人工重放再走一遍
            if (idempotencyStore != null) {
                idempotencyStore.release(dedupKey);
            }
            // 原样抛出（不再 catch-and-swallow），否则重试与死信链路全成摆设
            throw e;
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
            } catch (RuntimeException e) {
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
            } catch (RuntimeException e) {
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

        // R4-00375：取消匹配使用独立 unmatch 类型（schemas 已扩展），
        // 不再复用 match——此前被取消匹配的用户收到与「你们互相喜欢了」同型的通知
        persistNotification(userId, targetUserId, NotificationType.unmatch,
                "匹配已取消",
                "你们的匹配已取消",
                createdAt);
        persistNotification(targetUserId, userId, NotificationType.unmatch,
                "匹配已取消",
                "你们的匹配已取消",
                createdAt);
    }

    /**
     * 处理访客（visitor）事件。
     *
     * <p>通知被访用户：有人查看了你的资料。</p>
     *
     * <p>2026-08-09 访客通知链路修复：{@code MatchRecorder.recordVisit} 写入访客记录后
     * 发布 visitor 事件，此处负责 WebSocket 实时推送 + notifications 表持久化，
     * 与「喜欢/匹配」通知走同一消费链路，保证通知中心数据完整。</p>
     *
     * @param message 匹配事件消息
     */
    private void handleVisitor(MatchEventMessage message) {
        Long userId = message.getUserId();
        Long targetUserId = message.getTargetUserId();
        LocalDateTime createdAt = toLocalDateTime(message.getCreatedAt());

        // 通过 WebSocket 推送访客通知
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSendToUser(
                        String.valueOf(targetUserId),
                        WS_MATCHES_QUEUE,
                        Map.of("type", "visitor",
                                "fromUserId", userId,
                                "createdAt", createdAt.toString()));
            } catch (RuntimeException e) {
                log.warn("WebSocket 推送访客通知失败：targetUserId={}, error={}",
                        targetUserId, e.getMessage());
            }
        }

        // 持久化通知
        persistNotification(targetUserId, userId, NotificationType.visitor,
                "有人查看了你的资料",
                "有位同学看了你的主页，快去看看吧",
                createdAt);
    }

    /**
     * 持久化通知到 notifications 表。
     *
     * <p><b>不 catch DB 异常</b>（P1，2026-10-31）：原实现 {@code catch
     * (DataAccessException) → warn}，通知写失败会被 ack 掉、彻底消失。现在让它冒到
     * 方法边界，由外层 {@link #handleMatchEvent} 撤销幂等登记并重新抛出，
     * 交给容器重试 / {@code match.dlq}。</p>
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

        Notification entity = new Notification();
        entity.setUserId(receiverId);
        entity.setType(type);
        entity.setSourceUserId(sourceUserId != null ? sourceUserId : SYSTEM_SOURCE_USER_ID);
        entity.setReferenceType(ReferenceType.user);
        entity.setIsRead(false);
        entity.setCreatedAt(createdAt != null ? createdAt : LocalDateTime.now(TimeZones.BUSINESS));
        notificationRepository.save(entity);
        log.debug("匹配事件通知已持久化：receiverId={}, type={}, title={}",
                receiverId, type, title);
    }

    /**
     * 将 Instant 转换为 LocalDateTime（系统默认时区）。
     *
     * @param instant Instant 实例
     * @return LocalDateTime，为 null 时返回当前时间
     */
    private LocalDateTime toLocalDateTime(java.time.Instant instant) {
        if (instant == null) {
            return LocalDateTime.now(TimeZones.BUSINESS);
        }
        return LocalDateTime.ofInstant(instant, TimeZones.BUSINESS);
    }
}
