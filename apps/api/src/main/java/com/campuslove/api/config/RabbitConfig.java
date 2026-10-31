package com.campuslove.api.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.MessageRecoverer;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
 *
 * <p><b>死信拓扑（P1，2026-10-31）</b>：此前三条业务队列只有「durable」一个属性，
 * 既没有 dead-letter exchange 也没有兜底监听器，而消费端又把所有异常 catch 掉
 * 「以避免重投」——两件事叠加的结果是：消费失败既不会重试、也不会进死信，
 * 消息<b>静默消失</b>，{@code spring.rabbitmq.listener.simple.retry.max-attempts: 3}
 * 是完全失效的死配置（异常根本没冒到容器），而 outbox 表里那些 SENT 行
 * 只代表「交给 broker 了」，没人能证明有人消费过。</p>
 *
 * <p>现在的拓扑（每条业务队列一套，风格与业务队列一致：全部 durable、非自动删除）：</p>
 * <pre>
 *   notification.exchange ──notification.#──▶ notification.queue ──reject(requeue=false)─┐
 *   match.exchange        ──match.event────▶ match.queue        ──reject(requeue=false)─┤
 *   checkin.exchange      ──checkin.event──▶ checkin.queue      ──reject(requeue=false)─┤
 *                                                                                       ▼
 *                                    *.dlx（DirectExchange，x-dead-letter-* 指向）  ──▶ *.dlq（*.dead 路由键）
 *                                                                                       │
 *                                                            DeadLetterListener（ERROR 日志，运维可见）
 * </pre>
 *
 * <p><b>⚠ 部署注意（队列参数不可原地修改）</b>：{@code x-dead-letter-exchange} 是
 * <b>建队时参数</b>，RabbitMQ 不允许对已存在的队列改参数——若目标环境里
 * {@code notification.queue} 等队列已经存在（无 DLX 参数），本次声明会收到
 * {@code PRECONDITION_FAILED (406)}，RabbitAdmin 自动声明失败。两条可选路径：
 * ① 维护窗口删除并重建这三条队列（消息需先排空）；
 * ② 不动队列，改用 operator policy 挂 DLX：
 * {@code rabbitmqctl set_policy dlq-notification "^notification\.queue$"
 * '{"dead-letter-exchange":"notification.dlx","dead-letter-routing-key":"notification.dead"}'
 * --apply-to queues}（DLX/DLQ 仍由本类声明）。本仓未在代码里做「探测 + 自动重建」，
 * 因为静默删队列会丢在途消息，必须由运维决定窗口。</p>
 *
 * <p><b>SENT 语义（与 {@link com.campuslove.api.entity.OutboxEvent} 对齐）</b>：
 * outbox 的 SENT 只表示「已交给 broker」；「消费成功」的唯一可观测量是
 * 业务队列为空且 {@code *.dlq} 没有堆积。看 SENT 行数判断送达会得出错误结论。</p>
 */
@Configuration
@Profile("real")
@ConditionalOnClass(TopicExchange.class)
public class RabbitConfig {

    private static final Logger log = LoggerFactory.getLogger(RabbitConfig.class);

    // ==================== 通知消息（TopicExchange） ====================

    /** 通知队列名称 */
    public static final String NOTIFICATION_QUEUE = "notification.queue";

    /** 通知交换机名称（TopicExchange，支持通配符路由） */
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";

    /** 通知路由键通配符（topic 模式下匹配 notification. 开头的所有路由键） */
    public static final String NOTIFICATION_ROUTING_KEY = "notification.#";

    /** 通知死信交换机名称（P1，2026-10-31） */
    public static final String NOTIFICATION_DLX = "notification.dlx";

    /** 通知死信队列名称（P1，2026-10-31） */
    public static final String NOTIFICATION_DLQ = "notification.dlq";

    /** 通知死信路由键（DirectExchange 精确匹配，便于按业务前缀检索） */
    public static final String NOTIFICATION_DL_ROUTING_KEY = "notification.dead";

    // ==================== 匹配事件（DirectExchange） ====================

    /** 匹配事件队列名称 */
    public static final String MATCH_QUEUE = "match.queue";

    /** 匹配事件交换机名称（DirectExchange，精确路由键匹配） */
    public static final String MATCH_EXCHANGE = "match.exchange";

    /** 匹配事件路由键 */
    public static final String MATCH_ROUTING_KEY = "match.event";

    /** 匹配事件死信交换机名称（P1，2026-10-31） */
    public static final String MATCH_DLX = "match.dlx";

    /** 匹配事件死信队列名称（P1，2026-10-31） */
    public static final String MATCH_DLQ = "match.dlq";

    /** 匹配事件死信路由键 */
    public static final String MATCH_DL_ROUTING_KEY = "match.dead";

    // ==================== 签到事件（DirectExchange） ====================

    /** 签到事件队列名称 */
    public static final String CHECKIN_QUEUE = "checkin.queue";

    /** 签到事件交换机名称（DirectExchange，精确路由键匹配） */
    public static final String CHECKIN_EXCHANGE = "checkin.exchange";

    /** 签到事件路由键 */
    public static final String CHECKIN_ROUTING_KEY = "checkin.event";

    /** 签到事件死信交换机名称（P1，2026-10-31） */
    public static final String CHECKIN_DLX = "checkin.dlx";

    /** 签到事件死信队列名称（P1，2026-10-31） */
    public static final String CHECKIN_DLQ = "checkin.dlq";

    /** 签到事件死信路由键 */
    public static final String CHECKIN_DL_ROUTING_KEY = "checkin.dead";

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
     * 通知队列（持久化，带死信路由）。
     *
     * <p>{@code x-dead-letter-exchange} 指向 {@link #NOTIFICATION_DLX}：消费重试耗尽后
     * 消息不会消失，而是进 {@link #NOTIFICATION_DLQ}。注意这是建队参数，
     * 已存在的队列无法原地追加（见类注释「部署注意」）。</p>
     *
     * @return 通知队列
     */
    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE)
                .deadLetterExchange(NOTIFICATION_DLX)
                .deadLetterRoutingKey(NOTIFICATION_DL_ROUTING_KEY)
                .build();
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

    /**
     * 通知死信交换机（P1，2026-10-31）。
     *
     * <p>direct 类型：死信只按固定路由键投递，不需要通配符。</p>
     *
     * @return 通知死信交换机
     */
    @Bean
    public DirectExchange notificationDeadLetterExchange() {
        return new DirectExchange(NOTIFICATION_DLX, true, false);
    }

    /**
     * 通知死信队列（P1，2026-10-31）。
     *
     * <p>刻意<b>不再</b>挂 DLX：死信队列的死信无处可去，挂上会形成回环。
     * 队列同样 durable（死信是排查消费失败的唯一物证，不能被内存淘汰）。
     * 长度上限留给运维按环境用 policy 调整，不在代码里静默截断。</p>
     *
     * @return 通知死信队列
     */
    @Bean
    public Queue notificationDeadLetterQueue() {
        return QueueBuilder.durable(NOTIFICATION_DLQ).build();
    }

    /**
     * 通知死信队列绑定（路由键 {@code notification.dead}）。
     *
     * @return 通知死信绑定关系
     */
    @Bean
    public Binding notificationDeadLetterBinding() {
        return BindingBuilder.bind(notificationDeadLetterQueue())
                .to(notificationDeadLetterExchange())
                .with(NOTIFICATION_DL_ROUTING_KEY);
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
     * 匹配事件队列（持久化，带死信路由，口径同 {@link #notificationQueue()}）。
     *
     * @return 匹配事件队列
     */
    @Bean
    public Queue matchQueue() {
        return QueueBuilder.durable(MATCH_QUEUE)
                .deadLetterExchange(MATCH_DLX)
                .deadLetterRoutingKey(MATCH_DL_ROUTING_KEY)
                .build();
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

    /**
     * 匹配事件死信交换机（P1，2026-10-31）。
     *
     * @return 匹配事件死信交换机
     */
    @Bean
    public DirectExchange matchDeadLetterExchange() {
        return new DirectExchange(MATCH_DLX, true, false);
    }

    /**
     * 匹配事件死信队列（P1，2026-10-31，不再挂 DLX 以免回环）。
     *
     * @return 匹配事件死信队列
     */
    @Bean
    public Queue matchDeadLetterQueue() {
        return QueueBuilder.durable(MATCH_DLQ).build();
    }

    /**
     * 匹配事件死信队列绑定（路由键 {@code match.dead}）。
     *
     * @return 匹配事件死信绑定关系
     */
    @Bean
    public Binding matchDeadLetterBinding() {
        return BindingBuilder.bind(matchDeadLetterQueue())
                .to(matchDeadLetterExchange())
                .with(MATCH_DL_ROUTING_KEY);
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
     * 签到事件队列（持久化，带死信路由，口径同 {@link #notificationQueue()}）。
     *
     * @return 签到事件队列
     */
    @Bean
    public Queue checkinQueue() {
        return QueueBuilder.durable(CHECKIN_QUEUE)
                .deadLetterExchange(CHECKIN_DLX)
                .deadLetterRoutingKey(CHECKIN_DL_ROUTING_KEY)
                .build();
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

    /**
     * 签到事件死信交换机（P1，2026-10-31）。
     *
     * @return 签到事件死信交换机
     */
    @Bean
    public DirectExchange checkinDeadLetterExchange() {
        return new DirectExchange(CHECKIN_DLX, true, false);
    }

    /**
     * 签到事件死信队列（P1，2026-10-31，不再挂 DLX 以免回环）。
     *
     * @return 签到事件死信队列
     */
    @Bean
    public Queue checkinDeadLetterQueue() {
        return QueueBuilder.durable(CHECKIN_DLQ).build();
    }

    /**
     * 签到事件死信队列绑定（路由键 {@code checkin.dead}）。
     *
     * @return 签到事件死信绑定关系
     */
    @Bean
    public Binding checkinDeadLetterBinding() {
        return BindingBuilder.bind(checkinDeadLetterQueue())
                .to(checkinDeadLetterExchange())
                .with(CHECKIN_DL_ROUTING_KEY);
    }

    // ==================== 死信恢复器（P1，2026-10-31） ====================

    /**
     * 重试耗尽后的恢复策略：<b>记日志 + 抛「拒绝且不重投」</b>，让死信链路真的生效。
     *
     * <p>Spring Boot 会把容器里的 {@link MessageRecoverer} bean 接进监听器容器的重试
     * 拦截器（{@code SimpleRabbitListenerContainerFactoryConfigurer} 持有该 bean），
     * 于是 {@code spring.rabbitmq.listener.simple.retry.*} 从「死配置」变成生效配置：
     * 按 max-attempts 重试后调用本 recoverer，本方法抛出
     * {@link org.springframework.amqp.AmqpRejectAndDontRequeueException}，容器的
     * {@code ConditionalRejectingErrorHandler} 认得它 ⇒ {@code basicNack(requeue=false)}
     * ⇒ 队列的 {@code x-dead-letter-exchange} 把消息投进 {@code *.dlq}。</p>
     *
     * <p>为什么不是 {@code RepublishMessageRecoverer}：那个 recoverer 自己把消息
     * republish 到错误交换机<b>并且</b>让消息被 ack；本仓队列已带
     * {@code x-dead-letter-*}，两条路并存会出现「同一消息既被 republish 又被 broker
     * 死信路由」的双重投递风险。选「rethrow 交给 broker 路由」这一条：
     * 死信次数、来源队列、原路由键都由 broker 以 {@code x-death} 头记录，比我们自己
     * 拼头更可信。</p>
     *
     * <p>注意（勿误读）：只有 {@code retry.enabled=true} 时 Boot 才会装这条重试链
     * （application-real.yml 显式声明为 true）。若某环境把它关掉，消费异常会走
     * 容器默认的「reject + requeue」，那是一条<b>无限重投</b>路径——所以关掉 retry
     * 之前必须先想清楚，不要只图省事。</p>
     *
     * <p>核实过（Boot 3.3.1 字节码）：{@code RabbitAnnotationDrivenConfiguration
     * .simpleRabbitListenerContainerFactoryConfigurer()} 会把容器里的
     * {@code MessageRecoverer} bean 传给 configurer，
     * {@code AbstractRabbitListenerContainerFactoryConfigurer} 再以
     * {@code RetryInterceptorBuilder...recoverer(该 bean，否则默认
     * RejectAndDontRequeueRecoverer)} 装进 advice chain。也就是说：<b>死信路由本身
     * 不依赖本 bean</b>（默认 recoverer 也会 nack requeue=false），本 bean 的价值是把
     * 「重试耗尽」这件事打成带原异常与 payload 摘要的 ERROR 日志，并把恢复策略显式
     * 留在本仓代码里而不是依赖框架默认值。</p>
     *
     * @return 抛「拒绝且不重投」的恢复器
     */
    @Bean
    public MessageRecoverer deadLetteringMessageRecoverer() {
        return (message, cause) -> {
            MessageProperties props = message.getMessageProperties();
            log.error("消费重试耗尽，拒绝且不重投（将由 x-dead-letter-exchange 投入死信队列）："
                            + "queue={}, exchange={}, routingKey={}, messageId={}, redelivered={}, body={}",
                    props.getConsumerQueue(), props.getReceivedExchange(),
                    props.getReceivedRoutingKey(), props.getMessageId(), props.getRedelivered(),
                    truncateForLog(message.getBody()), cause);
            throw new org.springframework.amqp.AmqpRejectAndDontRequeueException(
                    "消费失败已达重试上限，拒绝并转死信：" + props.getConsumerQueue(), cause);
        };
    }

    /**
     * 日志用摘要：只截断，不落完整 payload（R4-00303 隐私口径：消息体可能含用户内容）。
     *
     * <p>完整内容不丢：它正躺在这条消息将要进入的死信队列里，运维按 messageId/时间窗
     * 到 {@code *.dlq} 取即可，不需要（也不应该）把它复制进日志文件。</p>
     */
    private static String truncateForLog(byte[] body) {
        if (body == null || body.length == 0) {
            return "<empty>";
        }
        String text = new String(body, java.nio.charset.StandardCharsets.UTF_8);
        int max = 500;
        return text.length() <= max
                ? text
                : text.substring(0, max) + "...(truncated, totalBytes=" + body.length + ")";
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
