package com.campuslove.api.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * RabbitMQ 配置类。
 *
 * <p>本配置定义消息中间件的核心拓扑结构：</p>
 * <ul>
 *   <li>Exchange: {@code campuslove.exchange}（topic 类型，支持通配符路由）</li>
 *   <li>Queue: {@code notification.queue} —— 通知消息队列</li>
 *   <li>Queue: {@code audit.queue} —— 审计日志异步队列</li>
 *   <li>RoutingKey: {@code notification.*} / {@code audit.*}</li>
 *   <li>{@link Jackson2JsonMessageConverter}：消息体使用 JSON 序列化，
 *       便于跨语言消费与可读性</li>
 * </ul>
 *
 * <p>仅在 real profile 激活，mock 模式下不依赖 RabbitMQ。
 * RabbitMQ 不可用时不影响应用启动（由 {@link MessagingFallback} 兜底）。</p>
 */
@Configuration
@Profile("real")
@ConditionalOnClass(TopicExchange.class)
public class RabbitMQConfig {

    /** 业务统一 Exchange 名称 */
    public static final String EXCHANGE_NAME = "campuslove.exchange";

    /** 通知队列名称 */
    public static final String NOTIFICATION_QUEUE = "notification.queue";

    /** 审计队列名称 */
    public static final String AUDIT_QUEUE = "audit.queue";

    /** 通知路由键前缀（topic 模式下匹配 notification.开头的所有路由键） */
    public static final String NOTIFICATION_ROUTING_KEY = "notification.*";

    /** 审计路由键前缀（topic 模式下匹配 audit.开头的所有路由键） */
    public static final String AUDIT_ROUTING_KEY = "audit.*";

    /**
     * 定义 Topic Exchange。
     *
     * <p>topic 类型支持通配符路由键（* 匹配一个单词，# 匹配多个单词），
     * 适合多业务场景的灵活路由。</p>
     *
     * @return Topic Exchange 实例
     */
    @Bean
    public TopicExchange campusloveExchange() {
        // durable=true：Exchange 持久化，RabbitMQ 重启后不丢失
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    /**
     * 通知队列。
     *
     * <p>持久化队列，RabbitMQ 重启后队列与未消费消息不丢失。</p>
     *
     * @return 通知队列
     */
    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE).build();
    }

    /**
     * 审计队列。
     *
     * @return 审计队列
     */
    @Bean
    public Queue auditQueue() {
        return QueueBuilder.durable(AUDIT_QUEUE).build();
    }

    /**
     * 将通知队列绑定到 Exchange，路由键为 {@code notification.*}。
     *
     * @return 绑定关系
     */
    @Bean
    public Binding notificationBinding() {
        return BindingBuilder.bind(notificationQueue())
                .to(campusloveExchange())
                .with(NOTIFICATION_ROUTING_KEY);
    }

    /**
     * 将审计队列绑定到 Exchange，路由键为 {@code audit.*}。
     *
     * @return 绑定关系
     */
    @Bean
    public Binding auditBinding() {
        return BindingBuilder.bind(auditQueue())
                .to(campusloveExchange())
                .with(AUDIT_ROUTING_KEY);
    }

    /**
     * JSON 消息转换器。
     *
     * <p>生产者发送的对象会被序列化为 JSON，消费者反序列化为原始对象。
     * 默认携带 __TypeId__ 头部，便于多语言消费方识别消息类型。</p>
     *
     * @return Jackson2JsonMessageConverter 实例
     */
    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
