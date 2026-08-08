package com.campuslove.api.mq;

import com.campuslove.api.config.RabbitConfig;
import com.campuslove.api.entity.OutboxEvent;
import com.campuslove.api.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 消息生产者。
 *
 * <p>封装 RabbitMQ 消息发送逻辑，业务服务通过调用本类的方法
 * 异步投递通知/匹配/签到消息到对应队列。</p>
 *
 * <p>降级策略（核心原则：MQ 不可用不应阻断业务流程）：</p>
 * <ol>
 *   <li>RabbitTemplate 未注入（mock 模式或 RabbitMQ 自动配置未启用）：
 *       记录 warn 日志后返回，不抛出异常</li>
 *   <li>RabbitMQ 连接或发送失败：捕获所有异常，记录 warn 日志，不向上抛出</li>
 * </ol>
 *
 * <p>R4-00373 补偿方案（替代原 FIN-00046「日志+丢弃」）：</p>
 * <ul>
 *   <li>RabbitTemplate 为 null 或发送失败时，将事件落库 {@code outbox_event} 表
 *       （{@link OutboxEvent}），由 {@link #compensatePendingEvents} 定时任务
 *       扫描 PENDING 事件补偿重投（每 30 秒，落库超过 10 秒才重投），
 *       成功置 SENT，重试超过 5 次置 FAILED 供人工介入——通知/匹配事件在
 *       MQ 抖动期不再静默丢失</li>
 *   <li>outbox 落库失败时仅记录日志（outbox 本身不可用说明 DB 也有问题，
 *       业务主流程不应被阻断）</li>
 *   <li>mock profile 无 JPA 仓库，outbox 自动跳过（仅日志）</li>
 * </ul>
 *
 * <p>线程安全：RabbitTemplate 内部为线程安全，可在多线程环境下共享使用。</p>
 */
@Component
public class MessageProducer {

    private static final Logger log = LoggerFactory.getLogger(MessageProducer.class);

    /** 通知路由键前缀，配合 topic Exchange 的 notification.# 通配符路由到通知队列 */
    private static final String NOTIFICATION_ROUTING_KEY_PREFIX = "notification.";

    /** R4-00373：outbox 事件落库后至少等待的重投延迟（秒），避免刚落库立即重投 */
    private static final long OUTBOX_MIN_DELAY_SECONDS = 10;

    /** R4-00373：单事件最大重试次数，超过后置 FAILED 供人工介入 */
    private static final int OUTBOX_MAX_RETRY = 5;

    /**
     * RabbitMQ 操作模板。
     *
     * <p>使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 RabbitMQ 配置）下也能正常启动。</p>
     */
    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    /** R4-00373：outbox 事件仓库（mock profile 无 JPA 时为 null，自动跳过补偿） */
    @Autowired(required = false)
    private OutboxEventRepository outboxEventRepository;

    /** R4-00373：消息体 JSON 序列化（Spring 容器提供的 ObjectMapper） */
    @Autowired(required = false)
    private ObjectMapper objectMapper;

    /**
     * 异步发送通知消息到 RabbitMQ。
     *
     * <p>路由键构造为 {@code notification.{type}}，配合 topic Exchange 的
     * {@code notification.#} 通配符路由到 {@code notification.queue}。</p>
     *
     * <p>失败时仅记录日志，不抛出异常，保证业务主流程不受影响
     * （R4-00373：失败事件落库 outbox_event，由定时任务补偿重投）。</p>
     *
     * @param message 通知消息体
     */
    public void sendNotification(NotificationMessage message) {
        if (message == null) {
            log.warn("通知消息为空，跳过发送");
            return;
        }

        // 构造路由键：notification.{type}
        String routingKey = NOTIFICATION_ROUTING_KEY_PREFIX
                + (message.getType() != null ? message.getType() : "default");

        if (rabbitTemplate == null) {
            // RabbitTemplate 不可用（mock 模式或自动配置未启用）
            log.warn("RabbitTemplate 未注入，通知消息转入 outbox 补偿：routingKey={}", routingKey);
            persistOutbox("notification", RabbitConfig.NOTIFICATION_EXCHANGE, routingKey, message);
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.NOTIFICATION_EXCHANGE,
                    routingKey,
                    message);
            log.debug("通知消息已投递：routingKey={}, message={}", routingKey, message);
        } catch (RuntimeException e) {
            // MQ 不可用，仅记录日志，不抛出（R4-00373：落库 outbox 补偿重投）
            log.warn("通知消息发送失败，转入 outbox 补偿：routingKey={}, error={}",
                    routingKey, e.getMessage());
            persistOutbox("notification", RabbitConfig.NOTIFICATION_EXCHANGE, routingKey, message);
        }
    }

    /**
     * 异步发送匹配事件消息到 RabbitMQ。
     *
     * <p>路由键固定为 {@code match.event}，通过 Direct Exchange 精确路由到
     * {@code match.queue}。</p>
     *
     * <p>失败时仅记录日志，不抛出异常，保证匹配主流程不受影响
     * （R4-00373：失败事件落库 outbox_event，由定时任务补偿重投）。</p>
     *
     * @param message 匹配事件消息体
     */
    public void sendMatchEvent(MatchEventMessage message) {
        if (message == null) {
            log.warn("匹配事件消息为空，跳过发送");
            return;
        }

        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，匹配事件消息转入 outbox 补偿：routingKey={}",
                    RabbitConfig.MATCH_ROUTING_KEY);
            persistOutbox("match", RabbitConfig.MATCH_EXCHANGE, RabbitConfig.MATCH_ROUTING_KEY, message);
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.MATCH_EXCHANGE,
                    RabbitConfig.MATCH_ROUTING_KEY,
                    message);
            log.debug("匹配事件消息已投递：routingKey={}, message={}",
                    RabbitConfig.MATCH_ROUTING_KEY, message);
        } catch (RuntimeException e) {
            // MQ 不可用，仅记录日志，不抛出（R4-00373：落库 outbox 补偿重投）
            log.warn("匹配事件消息发送失败，转入 outbox 补偿：routingKey={}, error={}",
                    RabbitConfig.MATCH_ROUTING_KEY, e.getMessage());
            persistOutbox("match", RabbitConfig.MATCH_EXCHANGE, RabbitConfig.MATCH_ROUTING_KEY, message);
        }
    }

    /**
     * 异步发送签到事件消息到 RabbitMQ。
     *
     * <p>路由键固定为 {@code checkin.event}，通过 Direct Exchange 精确路由到
     * {@code checkin.queue}。</p>
     *
     * <p>失败时仅记录日志，不抛出异常，保证签到主流程不受影响
     * （R4-00373：失败事件落库 outbox_event，由定时任务补偿重投）。</p>
     *
     * @param message 签到事件消息体
     */
    public void sendCheckInEvent(CheckInEventMessage message) {
        if (message == null) {
            log.warn("签到事件消息为空，跳过发送");
            return;
        }

        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，签到事件消息转入 outbox 补偿：routingKey={}",
                    RabbitConfig.CHECKIN_ROUTING_KEY);
            persistOutbox("checkin", RabbitConfig.CHECKIN_EXCHANGE, RabbitConfig.CHECKIN_ROUTING_KEY, message);
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.CHECKIN_EXCHANGE,
                    RabbitConfig.CHECKIN_ROUTING_KEY,
                    message);
            log.debug("签到事件消息已投递：routingKey={}, message={}",
                    RabbitConfig.CHECKIN_ROUTING_KEY, message);
        } catch (RuntimeException e) {
            // MQ 不可用，仅记录日志，不抛出（R4-00373：落库 outbox 补偿重投）
            log.warn("签到事件消息发送失败，转入 outbox 补偿：routingKey={}, error={}",
                    RabbitConfig.CHECKIN_ROUTING_KEY, e.getMessage());
            persistOutbox("checkin", RabbitConfig.CHECKIN_EXCHANGE, RabbitConfig.CHECKIN_ROUTING_KEY, message);
        }
    }

    /**
     * R4-00373：发送失败事件落库 outbox_event（best effort，落库失败仅记日志）。
     *
     * @param queueType  队列类型（notification/match/checkin）
     * @param exchange   目标交换机
     * @param routingKey 路由键
     * @param message    消息体（序列化为 JSON 存储）
     */
    private void persistOutbox(String queueType, String exchange, String routingKey, Object message) {
        if (outboxEventRepository == null) {
            log.debug("outbox 仓库不可用（mock/无 JPA），跳过落库：queueType={}", queueType);
            return;
        }
        try {
            String payloadJson;
            try {
                payloadJson = objectMapper != null
                        ? objectMapper.writeValueAsString(message)
                        : String.valueOf(message);
            } catch (com.fasterxml.jackson.core.JsonProcessingException je) {
                // 序列化失败不应阻断落库（以 toString 兜底，补偿重投时仍可追溯）
                log.warn("outbox 消息序列化失败，使用 toString 兜底：queueType={}, error={}",
                        queueType, je.getMessage());
                payloadJson = String.valueOf(message);
            }
            OutboxEvent event = new OutboxEvent();
            event.setQueueType(queueType);
            event.setExchangeName(exchange);
            event.setRoutingKey(routingKey);
            event.setPayloadJson(payloadJson);
            event.setStatus(OutboxEvent.OutboxStatus.PENDING);
            event.setRetryCount(0);
            event.setCreatedAt(LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS));
            outboxEventRepository.save(event);
            log.info("消息已落库 outbox 等待补偿：queueType={}, routingKey={}, outboxId={}",
                    queueType, routingKey, event.getId());
        } catch (RuntimeException e) {
            // outbox 落库失败仅记录日志（DB 异常不应阻断业务主流程）
            log.warn("outbox 落库失败，消息无法补偿：queueType={}, routingKey={}, error={}",
                    queueType, routingKey, e.getMessage());
        }
    }

    /**
     * R4-00373：定时补偿重投 PENDING 的 outbox 事件。
     *
     * <p>每 30 秒执行一次，扫描落库超过 {@link #OUTBOX_MIN_DELAY_SECONDS} 秒的
     * PENDING 事件重投（先落库先重投，单批上限 100）；投递成功置 SENT，
     * 失败累计重试次数，超过 {@link #OUTBOX_MAX_RETRY} 次置 FAILED 供人工介入。
     * mock profile（无 JPA 仓库）下自动跳过。</p>
     */
    @Scheduled(fixedDelay = 30000L, initialDelay = 30000L)
    public void compensatePendingEvents() {
        if (outboxEventRepository == null || rabbitTemplate == null) {
            return;
        }
        LocalDateTime before = LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS)
                .minusSeconds(OUTBOX_MIN_DELAY_SECONDS);
        List<OutboxEvent> pendingEvents;
        try {
            pendingEvents = outboxEventRepository
                    .findTop100ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                            OutboxEvent.OutboxStatus.PENDING, before);
        } catch (RuntimeException e) {
            log.warn("outbox 补偿扫描失败：error={}", e.getMessage());
            return;
        }
        for (OutboxEvent event : pendingEvents) {
            try {
                rabbitTemplate.convertAndSend(
                        event.getExchangeName(),
                        event.getRoutingKey(),
                        event.getPayloadJson());
                event.setStatus(OutboxEvent.OutboxStatus.SENT);
                event.setSentAt(LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS));
                event.setLastError(null);
                outboxEventRepository.save(event);
                log.info("outbox 补偿投递成功：outboxId={}, queueType={}, routingKey={}",
                        event.getId(), event.getQueueType(), event.getRoutingKey());
            } catch (RuntimeException e) {
                int retry = (event.getRetryCount() == null ? 0 : event.getRetryCount()) + 1;
                event.setRetryCount(retry);
                event.setLastError(truncate(e.getMessage(), 500));
                if (retry >= OUTBOX_MAX_RETRY) {
                    event.setStatus(OutboxEvent.OutboxStatus.FAILED);
                    log.error("outbox 补偿重试超限，置 FAILED 供人工介入：outboxId={}, retry={}, error={}",
                            event.getId(), retry, e.getMessage());
                } else {
                    log.warn("outbox 补偿投递失败，待下轮重试：outboxId={}, retry={}, error={}",
                            event.getId(), retry, e.getMessage());
                }
                try {
                    outboxEventRepository.save(event);
                } catch (RuntimeException saveEx) {
                    log.warn("outbox 补偿状态回写失败：outboxId={}, error={}",
                            event.getId(), saveEx.getMessage());
                }
            }
        }
    }

    /** 截断错误信息到指定长度（防止超长异常消息撑爆列宽） */
    private String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }
}
