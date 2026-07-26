package com.campuslove.api.mq;

import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 签到事件消费者。
 *
 * <p>监听 {@code checkin.queue} 队列，处理签到相关事件：</p>
 * <ol>
 *   <li>推送签到成功通知（"今日签到成功，连续签到 X 天"）</li>
 *   <li>连续签到达成奖励通知（达到 7 天、14 天、30 天等里程碑时额外推送奖励通知）</li>
 * </ol>
 *
 * <p>消费失败时不抛出异常（避免消息无限重投），仅记录错误日志。</p>
 */
@Component
@Profile("real")
public class CheckInEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(CheckInEventConsumer.class);

    /** 系统通知的虚拟源用户 ID */
    private static final long SYSTEM_SOURCE_USER_ID = 0L;

    /** WebSocket 推送签到通知的队列路径 */
    private static final String WS_CHECKIN_QUEUE = "/queue/checkin";

    /** 连续签到奖励里程碑天数（达到这些天数时额外推送奖励通知） */
    private static final int[] REWARD_MILESTONES = {7, 14, 30, 60, 100, 365};

    /** 通知持久化 Repository */
    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    /** WebSocket 消息模板，用于推送实时通知 */
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 处理签到事件消息。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>推送签到成功通知（WebSocket + DB 持久化）</li>
     *   <li>检查是否达到连续签到奖励里程碑，达成则额外推送奖励通知</li>
     * </ol>
     *
     * @param message 签到事件消息体
     */
    @RabbitListener(queues = "checkin.queue")
    @Transactional
    public void handleCheckInEvent(CheckInEventMessage message) {
        if (message == null) {
            log.warn("收到空签到事件消息，跳过处理");
            return;
        }

        log.info("收到签到事件：userId={}, consecutiveDays={}, rewardPoints={}",
                message.getUserId(), message.getConsecutiveDays(), message.getRewardPoints());

        try {
            // 1. 推送签到成功通知
            pushCheckInSuccessNotification(message);

            // 2. 检查并推送连续签到奖励通知
            checkAndPushRewardNotification(message);
        } catch (Exception e) {
            // 捕获所有异常，避免消息无限重投
            log.warn("签到事件处理失败，不抛出异常：message={}, error={}",
                    message, e.getMessage(), e);
        }
    }

    /**
     * 推送签到成功通知。
     *
     * <p>通知内容："今日签到成功，已连续签到 X 天，获得 Y 积分"。</p>
     *
     * @param message 签到事件消息
     */
    private void pushCheckInSuccessNotification(CheckInEventMessage message) {
        Long userId = message.getUserId();
        int consecutiveDays = message.getConsecutiveDays();
        int rewardPoints = message.getRewardPoints();
        LocalDateTime createdAt = toLocalDateTime(message.getCreatedAt());

        String title = "签到成功";
        String content = String.format("今日签到成功，已连续签到 %d 天，获得 %d 积分",
                consecutiveDays, rewardPoints);

        // 通过 WebSocket 推送实时通知
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSendToUser(
                        String.valueOf(userId),
                        WS_CHECKIN_QUEUE,
                        java.util.Map.of(
                                "type", "checkin_success",
                                "consecutiveDays", consecutiveDays,
                                "rewardPoints", rewardPoints,
                                "createdAt", createdAt.toString()
                        ));
            } catch (Exception e) {
                log.warn("WebSocket 推送签到通知失败：userId={}, error={}",
                        userId, e.getMessage());
            }
        }

        // 持久化到 notifications 表
        persistNotification(userId, title, content, createdAt);
    }

    /**
     * 检查并推送连续签到奖励通知。
     *
     * <p>当连续签到天数达到 {@link #REWARD_MILESTONES} 中的里程碑时，
     * 额外推送奖励通知。</p>
     *
     * @param message 签到事件消息
     */
    private void checkAndPushRewardNotification(CheckInEventMessage message) {
        Long userId = message.getUserId();
        int consecutiveDays = message.getConsecutiveDays();
        LocalDateTime createdAt = toLocalDateTime(message.getCreatedAt());

        for (int milestone : REWARD_MILESTONES) {
            if (consecutiveDays == milestone) {
                String title = "连续签到奖励";
                String content = String.format(
                        "恭喜你连续签到 %d 天，已获得额外奖励，再接再厉！", milestone);

                // WebSocket 推送奖励通知
                if (messagingTemplate != null) {
                    try {
                        messagingTemplate.convertAndSendToUser(
                                String.valueOf(userId),
                                WS_CHECKIN_QUEUE,
                                java.util.Map.of(
                                        "type", "checkin_milestone_reward",
                                        "milestone", milestone,
                                        "consecutiveDays", consecutiveDays,
                                        "createdAt", createdAt.toString()
                                ));
                    } catch (Exception e) {
                        log.warn("WebSocket 推送连续签到奖励通知失败：userId={}, milestone={}, error={}",
                                userId, milestone, e.getMessage());
                    }
                }

                // 持久化奖励通知
                persistNotification(userId, title, content, createdAt);
                log.info("已推送连续签到奖励通知：userId={}, milestone={}", userId, milestone);
                break;
            }
        }
    }

    /**
     * 持久化通知到 notifications 表（best effort）。
     *
     * <p>签到通知使用 {@link NotificationType#match} 作为类型（schemas 中无 system 类型，
     * 复用 match 作为系统类通知的兜底分类）。</p>
     *
     * @param userId    接收通知的用户 ID
     * @param title     通知标题（仅用于日志）
     * @param content   通知内容（仅用于日志）
     * @param createdAt 创建时间
     */
    private void persistNotification(Long userId, String title, String content,
                                     LocalDateTime createdAt) {
        if (notificationRepository == null) {
            log.debug("NotificationRepository 不可用，跳过持久化：userId={}", userId);
            return;
        }

        try {
            Notification entity = new Notification();
            entity.setUserId(userId);
            // 签到通知归入 match 类型（系统类通知兜底）
            entity.setType(NotificationType.match);
            entity.setSourceUserId(SYSTEM_SOURCE_USER_ID);
            entity.setReferenceType(ReferenceType.user);
            entity.setIsRead(false);
            entity.setCreatedAt(createdAt != null ? createdAt : LocalDateTime.now());
            notificationRepository.save(entity);
            log.debug("签到通知已持久化：userId={}, title={}", userId, title);
        } catch (Exception e) {
            log.warn("签到通知持久化失败：userId={}, title={}, error={}",
                    userId, title, e.getMessage());
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
