package com.campuslove.api.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * RabbitMQ 配置类。
 *
 * <p>定义消息中间件的核心拓扑结构，覆盖三类业务消息：</p>
 * <ul>
 *   <li>通知消息：{@code notification.exchange}（TopicExchange）→ {@code notification.queue}，
 *       路由键 {@code notification.#}，承接 like/match/comment/system 等通知</li>
 *   <li>匹配事件：{@code match.exchange}（DirectExchange）→ {@code match.queue}，
 *       路由键 {@code match.event}，承接互相喜欢等匹配事件</li>
 *   <li>签到事件：{@code checkin.exchange}（DirectExchange）→ {@code checkin.queue}，
 *       路由键 {@code checkin.event}，承接签到成功等事件</li>
 * </ul>
 *
 * <p>同时配置 {@link Jackson2JsonMessageConverter} 与 {@link RabbitTemplate}，
 * 使消息体以 JSON 格式序列化，便于跨语言消费与可读性。</p>
 *
 * <p>仅在 real profile 激活，mock 模式下不依赖 RabbitMQ。
 * RabbitMQ 不可用时不影响应用启动（由 {@link MessagingFallback} 兜底）。</p>
 */
@Configuration
@Profile("real")
@ConditionalOnClass(TopicExchange.class)
public class RabbitConfig {

    // ==================== 通知消息（TopicExchange） ====================

    /** 通知队列名称 */
    public static final String NOTIFICATION_QUEUE = "notification.queue";

    /** 通知交换机名称（TopicExchange，支持通配符路由） */
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";

    /** 通知路由键通配符（topic 模式下匹配 notification. 开头的所有路由键） */
    public static final String NOTIFICATION_ROUTING_KEY = "notification.#";

    // ==================== 匹配事件（DirectExchange） ====================

    /** 匹配事件队列名称 */
    public static final String MATCH_QUEUE = "match.queue";

    /** 匹配事件交换机名称（DirectExchange，精确路由键匹配） */
    public static final String MATCH_EXCHANGE = "match.exchange";

    /** 匹配事件路由键 */
    public static final String MATCH_ROUTING_KEY = "match.event";

    // ==================== 签到事件（DirectExchange） ====================

    /** 签到事件队列名称 */
    public static final String CHECKIN_QUEUE = "checkin.queue";

    /** 签到事件交换机名称（DirectExchange，精确路由键匹配） */
    public static final String CHECKIN_EXCHANGE = "checkin.exchange";

    /** 签到事件路由键 */
    public static final String CHECKIN_ROUTING_KEY = "checkin.event";

    // ==================== 通知拓扑 Bean ====================

    /**
     * 通知 Topic Exchange。
     *
     * <p>topic 类型支持通配符路由键（* 匹配一个单词，# 匹配多个单词），
     * 适合 like/match/comment/system 等多类型通知的灵活路由。</p>
     *
     * @return 通知 Topic Exchange 实例
     */
    @Bean
    public TopicExchange notificationExchange() {
        // durable=true：Exchange 持久化，RabbitMQ 重启后不丢失
        return new TopicExchange(NOTIFICATION_EXCHANGE, true, false);
    }

    /**
     * 通知队列（持久化）。
     *
     * @return 通知队列
     */
    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE).build();
    }

    /**
     * 将通知队列绑定到通知 Exchange，路由键为 {@code notification.#}。
     *
     * @return 通知绑定关系
     */
    @Bean
    public Binding notificationBinding() {
        return BindingBuilder.bind(notificationQueue())
                .to(notificationExchange())
                .with(NOTIFICATION_ROUTING_KEY);
    }

    // ==================== 匹配事件拓扑 Bean ====================

    /**
     * 匹配事件 Direct Exchange。
     *
     * <p>direct 类型按精确路由键匹配，适合定向投递的匹配事件消息。</p>
     *
     * @return 匹配事件 Direct Exchange 实例
     */
    @Bean
    public DirectExchange matchExchange() {
        return new DirectExchange(MATCH_EXCHANGE, true, false);
    }

    /**
     * 匹配事件队列（持久化）。
     *
     * @return 匹配事件队列
     */
    @Bean
    public Queue matchQueue() {
        return QueueBuilder.durable(MATCH_QUEUE).build();
    }

    /**
     * 将匹配队列绑定到匹配 Exchange，路由键为 {@code match.event}。
     *
     * @return 匹配事件绑定关系
     */
    @Bean
    public Binding matchBinding() {
        return BindingBuilder.bind(matchQueue())
                .to(matchExchange())
                .with(MATCH_ROUTING_KEY);
    }

    // ==================== 签到事件拓扑 Bean ====================

    /**
     * 签到事件 Direct Exchange。
     *
     * @return 签到事件 Direct Exchange 实例
     */
    @Bean
    public DirectExchange checkinExchange() {
        return new DirectExchange(CHECKIN_EXCHANGE, true, false);
    }

    /**
     * 签到事件队列（持久化）。
     *
     * @return 签到事件队列
     */
    @Bean
    public Queue checkinQueue() {
        return QueueBuilder.durable(CHECKIN_QUEUE).build();
    }

    /**
     * 将签到队列绑定到签到 Exchange，路由键为 {@code checkin.event}。
     *
     * @return 签到事件绑定关系
     */
    @Bean
    public Binding checkinBinding() {
        return BindingBuilder.bind(checkinQueue())
                .to(checkinExchange())
                .with(CHECKIN_ROUTING_KEY);
    }

    // ==================== 序列化与 Template ====================

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

    /**
     * 配置 RabbitTemplate 使用 Jackson 序列化。
     *
     * <p>通过注入 Spring Boot 自动创建的 RabbitTemplate（ConnectionFactory 由自动配置提供），
     * 设置其 messageConverter 为 {@link #jackson2JsonMessageConverter()}，
     * 使所有通过该 Template 发送的消息均以 JSON 格式投递。</p>
     *
     * @param connectionFactory RabbitMQ 连接工厂（由 Spring Boot 自动配置注入）
     * @param messageConverter  JSON 消息转换器
     * @return 配置好 Jackson 序列化的 RabbitTemplate
     */
    @Bean
    public RabbitTemplate rabbitTemplate(
            org.springframework.amqp.rabbit.connection.ConnectionFactory connectionFactory,
            MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
