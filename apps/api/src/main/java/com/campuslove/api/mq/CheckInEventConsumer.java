package com.campuslove.api.mq;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.repository.NotificationRepository;
import java.time.LocalDateTime;
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
 * <p><b>消费失败不再静默丢弃（P1，2026-10-31）</b>：原实现
 * {@code catch (RuntimeException) → log.warn}，异常被吞掉后消息被 ack，签到奖励通知
 * 从此消失，{@code retry.max-attempts} 与死信链路（{@code checkin.dlx} →
 * {@code checkin.dlq}）全部无从生效。现在<b>原样抛出</b>，重试耗尽后转死信并由
 * {@link DeadLetterListener} 打 ERROR。</p>
 *
 * <p><b>幂等（P0，2026-10-31）</b>：重投递会让「签到成功」和「里程碑奖励」两条通知
 * 各插两遍。先抢 {@link ConsumerIdempotencyStore} 的事件级登记，抢不到就跳过；
 * 失败时撤销登记让重试/重放仍可执行。键含 {@code consecutiveDays}，
 * 因此「第 7 天」与「第 8 天」不会被误判为同一事件（口径见 {@link EventDedupKeys}）。</p>
 *
 * <p>WebSocket 推送的异常就地 catch：客户端不在线时重试也不会送到，属于不可重试旁路。</p>
 */
@Component
@Profile("real")
public class CheckInEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(CheckInEventConsumer.class);

    /** 系统通知的虚拟源用户 ID */
    private static final long SYSTEM_SOURCE_USER_ID = 0L;

    /** WebSocket 推送签到通知的队列路径 */
    private static final String WS_CHECKIN_QUEUE = "/queue/checkin";

    /**
     * 连续签到奖励里程碑天数（达到这些天数时额外推送奖励通知）。
     * R4-00376：抽为配置项 {@code app.checkin.reward-milestones}（逗号分隔），
     * 调整奖励规则无需改代码发版；默认 7,14,30,60,100,365。
     */
    private int[] rewardMilestones = {7, 14, 30, 60, 100, 365};

    @org.springframework.beans.factory.annotation.Value("${app.checkin.reward-milestones:7,14,30,60,100,365}")
    public void setRewardMilestones(String csv) {
        if (csv == null || csv.isBlank()) {
            this.rewardMilestones = new int[0];
            return;
        }
        this.rewardMilestones = java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .mapToInt(Integer::parseInt)
                .toArray();
    }

    /** 通知持久化 Repository */
    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    /** WebSocket 消息模板，用于推送实时通知 */
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /** P0（2026-10-31）：消费幂等登记（mock/无 Redisson 时为 null，退化为不判重） */
    @Autowired(required = false)
    private ConsumerIdempotencyStore idempotencyStore;

    /**
     * 处理签到事件消息。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>抢占事件级幂等登记（重投递直接跳过）</li>
     *   <li>推送签到成功通知（WebSocket + DB 持久化）</li>
     *   <li>检查是否达到连续签到奖励里程碑，达成则额外推送奖励通知</li>
     *   <li>任一环节抛出时撤销登记并原样抛出（重试 → 死信）</li>
     * </ol>
     *
     * @param message 签到事件消息体
     */
    @RabbitListener(queues = "checkin.queue")
    @Transactional
    public void handleCheckInEvent(CheckInEventMessage message) {
        if (message == null) {
            // 非可重试：空消息重投也仍是空消息，记录后 ack
            log.warn("收到空签到事件消息，跳过处理（非可重试）");
            return;
        }

        String dedupKey = EventDedupKeys.checkInKey(message);
        if (idempotencyStore != null && !idempotencyStore.claim(dedupKey)) {
            log.info("签到事件已处理过，跳过本次投递（幂等）：dedupKey={}, userId={}",
                    dedupKey, message.getUserId());
            return;
        }

        log.info("收到签到事件：userId={}, consecutiveDays={}, rewardPoints={}, dedupKey={}",
                message.getUserId(), message.getConsecutiveDays(), message.getRewardPoints(),
                dedupKey);

        try {
            // 1. 推送签到成功通知
            pushCheckInSuccessNotification(message);

            // 2. 检查并推送连续签到奖励通知
            checkAndPushRewardNotification(message);
        } catch (RuntimeException e) {
            // 撤销幂等登记：本次没做成，必须允许 broker 重试与 DLQ 人工重放再走一遍
            if (idempotencyStore != null) {
                idempotencyStore.release(dedupKey);
            }
            // 原样抛出（不再 catch-and-swallow），否则重试与死信链路全成摆设
            log.warn("签到事件处理失败，抛出以触发重试/死信：message={}, error={}",
                    message, e.getMessage());
            throw e;
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
            } catch (RuntimeException e) {
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
     * <p>当连续签到天数达到配置的里程碑（{@code app.checkin.reward-milestones}）时，
     * 额外推送奖励通知。</p>
     *
     * @param message 签到事件消息
     */
    private void checkAndPushRewardNotification(CheckInEventMessage message) {
        Long userId = message.getUserId();
        int consecutiveDays = message.getConsecutiveDays();
        LocalDateTime createdAt = toLocalDateTime(message.getCreatedAt());

        for (int milestone : rewardMilestones) {
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
                    } catch (RuntimeException e) {
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
     * 持久化通知到 notifications 表。
     *
     * <p>R4-00374：签到通知使用独立 {@link NotificationType#system} 类型
     * （schemas 已扩展 system 枚举值），不再复用 match 作为系统类通知兜底。</p>
     *
     * <p><b>不 catch DB 异常</b>（P1，2026-10-31）：写失败必须冒到方法边界触发重试/死信，
     * 原实现的 {@code catch (DataAccessException) → warn} 会让奖励通知静默消失。</p>
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

        Notification entity = new Notification();
        entity.setUserId(userId);
        // R4-00374：签到通知使用独立 system 类型（schemas 已扩展），
        // 不再归入 match——签到成功通知此前在站内被展示为"匹配"语义
        entity.setType(NotificationType.system);
        entity.setSourceUserId(SYSTEM_SOURCE_USER_ID);
        entity.setReferenceType(ReferenceType.user);
        entity.setIsRead(false);
        entity.setCreatedAt(createdAt != null ? createdAt : LocalDateTime.now(TimeZones.BUSINESS));
        notificationRepository.save(entity);
        log.debug("签到通知已持久化：userId={}, title={}", userId, title);
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
