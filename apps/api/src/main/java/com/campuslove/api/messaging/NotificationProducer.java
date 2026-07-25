package com.campuslove.api.messaging;

import com.campuslove.api.config.MessagingFallback;
import com.campuslove.api.config.RabbitMQConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 通知消息生产者。
 *
 * <p>封装 RabbitMQ 消息发送逻辑，业务服务通过调用 {@link #sendNotification}
 * 异步投递通知消息到 {@code notification.queue}。</p>
 *
 * <p>降级策略：</p>
 * <ol>
 *   <li>RabbitTemplate 未注入（mock 模式或 RabbitMQ 自动配置被排除）：
 *       记录日志后返回，不阻塞主流程</li>
 *   <li>RabbitMQ 连接失败：捕获 {@link AmqpException}，
 *       调用 {@link MessagingFallback} 记录并丢弃消息</li>
 * </ol>
 *
 * <p>线程安全：RabbitTemplate 内部为线程安全，可在多线程环境下共享使用。</p>
 */
@Component
public class NotificationProducer {

    private static final Logger log = LoggerFactory.getLogger(NotificationProducer.class);

    /** 路由键前缀，配合 topic Exchange 的 notification.* 通配符路由到通知队列 */
    private static final String ROUTING_KEY_PREFIX = "notification.";

    /**
     * RabbitMQ 操作模板。
     *
     * <p>使用 {@link Autowired} 注入并标记 required = false，
     * 确保 mock 模式（无 RabbitMQ 配置）下也能正常启动。</p>
     */
    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    /** 消息降级处理器，RabbitMQ 不可用时记录并丢弃消息 */
    @Autowired
    private MessagingFallback messagingFallback;

    /**
     * 异步发送通知消息到 RabbitMQ。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>校验消息非空</li>
     *   <li>检查 RabbitTemplate 是否可用 + MessagingFallback 状态</li>
     *   <li>调用 {@link RabbitTemplate#convertAndSend} 投递消息</li>
     *   <li>捕获 {@link AmqpException}，调用降级处理器</li>
     * </ol>
     *
     * @param message 通知消息体
     */
    public void sendNotification(NotificationMessage message) {
        if (message == null) {
            log.warn("通知消息为空，跳过发送");
            return;
        }

        // 1. RabbitTemplate 不可用（mock 模式或自动配置未启用）
        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，丢弃通知消息：{}", message);
            return;
        }

        // 2. MessagingFallback 已检测到 RabbitMQ 不可用，提前降级
        if (!messagingFallback.isAvailable()) {
            messagingFallback.discard(message, null);
            return;
        }

        // 3. 构造路由键：notification.{type}，配合 topic 通配符 notification.* 路由
        String routingKey = ROUTING_KEY_PREFIX
                + (message.getType() != null ? message.getType() : "default");

        // 4. 实际发送消息，捕获 RabbitMQ 异常避免阻塞主流程
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    routingKey,
                    message);
            log.debug("通知消息已投递：routingKey={}, message={}", routingKey, message);
        } catch (AmqpException e) {
            // RabbitMQ 不可用，调用降级处理器记录并丢弃
            messagingFallback.discard(message, e);
        } catch (Exception e) {
            // 其他未预期异常，记录但不抛出，保证业务主流程不受影响
            log.error("通知消息发送出现未预期异常：message={}, error={}", message, e.getMessage(), e);
        }
    }
}
