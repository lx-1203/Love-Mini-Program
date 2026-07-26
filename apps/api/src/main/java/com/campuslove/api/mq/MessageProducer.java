package com.campuslove.api.mq;

import com.campuslove.api.config.RabbitConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
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
 *       记录日志后返回，不抛出异常</li>
 *   <li>RabbitMQ 连接或发送失败：捕获所有异常，仅记录日志，不向上抛出</li>
 * </ol>
 *
 * <p>线程安全：RabbitTemplate 内部为线程安全，可在多线程环境下共享使用。</p>
 */
@Component
public class MessageProducer {

    private static final Logger log = LoggerFactory.getLogger(MessageProducer.class);

    /** 通知路由键前缀，配合 topic Exchange 的 notification.# 通配符路由到通知队列 */
    private static final String NOTIFICATION_ROUTING_KEY_PREFIX = "notification.";

    /**
     * RabbitMQ 操作模板。
     *
     * <p>使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 RabbitMQ 配置）下也能正常启动。</p>
     */
    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    /**
     * 异步发送通知消息到 RabbitMQ。
     *
     * <p>路由键构造为 {@code notification.{type}}，配合 topic Exchange 的
     * {@code notification.#} 通配符路由到 {@code notification.queue}。</p>
     *
     * <p>失败时仅记录日志，不抛出异常，保证业务主流程不受影响。</p>
     *
     * @param message 通知消息体
     */
    public void sendNotification(NotificationMessage message) {
        if (message == null) {
            log.warn("通知消息为空，跳过发送");
            return;
        }

        // RabbitTemplate 不可用（mock 模式或自动配置未启用）
        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，丢弃通知消息：{}", message);
            return;
        }

        // 构造路由键：notification.{type}
        String routingKey = NOTIFICATION_ROUTING_KEY_PREFIX
                + (message.getType() != null ? message.getType() : "default");

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.NOTIFICATION_EXCHANGE,
                    routingKey,
                    message);
            log.debug("通知消息已投递：routingKey={}, message={}", routingKey, message);
        } catch (Exception e) {
            // MQ 不可用，仅记录日志，不抛出
            log.warn("通知消息发送失败，已丢弃：routingKey={}, message={}, error={}",
                    routingKey, message, e.getMessage());
        }
    }

    /**
     * 异步发送匹配事件消息到 RabbitMQ。
     *
     * <p>路由键固定为 {@code match.event}，通过 Direct Exchange 精确路由到
     * {@code match.queue}。</p>
     *
     * <p>失败时仅记录日志，不抛出异常，保证匹配主流程不受影响。</p>
     *
     * @param message 匹配事件消息体
     */
    public void sendMatchEvent(MatchEventMessage message) {
        if (message == null) {
            log.warn("匹配事件消息为空，跳过发送");
            return;
        }

        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，丢弃匹配事件消息：{}", message);
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.MATCH_EXCHANGE,
                    RabbitConfig.MATCH_ROUTING_KEY,
                    message);
            log.debug("匹配事件消息已投递：routingKey={}, message={}",
                    RabbitConfig.MATCH_ROUTING_KEY, message);
        } catch (Exception e) {
            // MQ 不可用，仅记录日志，不抛出
            log.warn("匹配事件消息发送失败，已丢弃：message={}, error={}",
                    message, e.getMessage());
        }
    }

    /**
     * 异步发送签到事件消息到 RabbitMQ。
     *
     * <p>路由键固定为 {@code checkin.event}，通过 Direct Exchange 精确路由到
     * {@code checkin.queue}。</p>
     *
     * <p>失败时仅记录日志，不抛出异常，保证签到主流程不受影响。</p>
     *
     * @param message 签到事件消息体
     */
    public void sendCheckInEvent(CheckInEventMessage message) {
        if (message == null) {
            log.warn("签到事件消息为空，跳过发送");
            return;
        }

        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，丢弃签到事件消息：{}", message);
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.CHECKIN_EXCHANGE,
                    RabbitConfig.CHECKIN_ROUTING_KEY,
                    message);
            log.debug("签到事件消息已投递：routingKey={}, message={}",
                    RabbitConfig.CHECKIN_ROUTING_KEY, message);
        } catch (Exception e) {
            // MQ 不可用，仅记录日志，不抛出
            log.warn("签到事件消息发送失败，已丢弃：message={}, error={}",
                    message, e.getMessage());
        }
    }
}
