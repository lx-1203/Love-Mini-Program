package com.campuslove.api.mq;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;

import com.campuslove.api.config.RabbitConfig;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;

/**
 * P1（2026-10-31）：死信拓扑与「重试耗尽后必须拒绝」的恢复器。
 *
 * <p><b>缺陷</b>：三条业务队列原先只声明了 durable，没有
 * {@code x-dead-letter-exchange}；消费端又把所有异常 catch 掉「以避免重投」，
 * 于是消费失败既不重试也不进死信，消息静默消失，
 * {@code spring.rabbitmq.listener.simple.retry.max-attempts: 3} 是死配置。</p>
 *
 * <p>本门把「每条业务队列都有配套 DLX/DLQ、DLQ 自己不再挂 DLX（防回环）、
 * 恢复器抛的是 {@code AmqpRejectAndDontRequeueException}（容器据此 nack requeue=false，
 * broker 才会按 x-dead-letter-* 把消息投进 DLQ）」钉成断言。
 * 直接 {@code new RabbitConfig()} 调 @Bean 方法即可验证声明内容，
 * 不需要真的连 RabbitMQ（本机没有 broker，这条门仍然跑得动）。</p>
 */
@DisplayName("RabbitConfig - 死信交换机/队列拓扑与恢复器")
class DeadLetterTopologyTest {

    private final RabbitConfig config = new RabbitConfig();

    @Test
    @DisplayName("通知队列带死信参数，指向 notification.dlx / notification.dead")
    void notificationQueueCarriesDeadLetterArguments() {
        assertDeadLetterArguments(config.notificationQueue(),
                RabbitConfig.NOTIFICATION_QUEUE,
                RabbitConfig.NOTIFICATION_DLX,
                RabbitConfig.NOTIFICATION_DL_ROUTING_KEY);
    }

    @Test
    @DisplayName("匹配队列带死信参数，指向 match.dlx / match.dead")
    void matchQueueCarriesDeadLetterArguments() {
        assertDeadLetterArguments(config.matchQueue(),
                RabbitConfig.MATCH_QUEUE,
                RabbitConfig.MATCH_DLX,
                RabbitConfig.MATCH_DL_ROUTING_KEY);
    }

    @Test
    @DisplayName("签到队列带死信参数，指向 checkin.dlx / checkin.dead")
    void checkInQueueCarriesDeadLetterArguments() {
        assertDeadLetterArguments(config.checkinQueue(),
                RabbitConfig.CHECKIN_QUEUE,
                RabbitConfig.CHECKIN_DLX,
                RabbitConfig.CHECKIN_DL_ROUTING_KEY);
    }

    private void assertDeadLetterArguments(Queue queue, String name, String dlx, String dlKey) {
        Map<String, Object> args = queue.getArguments();
        assertEquals(name, queue.getName());
        assertTrue(queue.isDurable(), "业务队列必须持久化（改造前后一致）");
        assertEquals(dlx, args.get("x-dead-letter-exchange"),
                name + " 必须声明死信交换机，否则消费失败的消息会被直接丢弃");
        assertEquals(dlKey, args.get("x-dead-letter-routing-key"));
    }

    @Test
    @DisplayName("业务交换器的绑定保持不变（本次只加死信，不动既有路由）")
    void businessBindingsUnchanged() {
        Binding notification = config.notificationBinding();
        assertEquals(RabbitConfig.NOTIFICATION_QUEUE, notification.getDestination());
        assertEquals(RabbitConfig.NOTIFICATION_EXCHANGE, notification.getExchange());
        assertEquals(RabbitConfig.NOTIFICATION_ROUTING_KEY, notification.getRoutingKey());

        assertEquals(RabbitConfig.MATCH_QUEUE, config.matchBinding().getDestination());
        assertEquals(RabbitConfig.MATCH_ROUTING_KEY, config.matchBinding().getRoutingKey());

        assertEquals(RabbitConfig.CHECKIN_QUEUE, config.checkinBinding().getDestination());
        assertEquals(RabbitConfig.CHECKIN_ROUTING_KEY, config.checkinBinding().getRoutingKey());

        assertTrue(config.notificationExchange() instanceof TopicExchange,
                "通知仍是 topic 交换机（通配符路由不能被本次改动降级）");
    }

    @Test
    @DisplayName("死信队列/交换机：durable，且死信队列不再挂 DLX（防回环）")
    void deadLetterQueuesAreDurableAndLoopFree() {
        assertDlq(config.notificationDeadLetterQueue(), RabbitConfig.NOTIFICATION_DLQ);
        assertDlq(config.matchDeadLetterQueue(), RabbitConfig.MATCH_DLQ);
        assertDlq(config.checkinDeadLetterQueue(), RabbitConfig.CHECKIN_DLQ);

        DirectExchange dlx = config.notificationDeadLetterExchange();
        assertEquals(RabbitConfig.NOTIFICATION_DLX, dlx.getName());
        assertTrue(dlx.isDurable(), "死信交换机必须持久化，否则重启后无人认领死信");
        assertFalse(dlx.isAutoDelete());
    }

    private void assertDlq(Queue dlq, String name) {
        assertEquals(name, dlq.getName());
        assertTrue(dlq.isDurable(), "死信是消费失败的唯一物证，不能被内存淘汰");
        assertFalse(dlq.getArguments().containsKey("x-dead-letter-exchange"),
                name + " 不允许再挂死信交换机：死信队列的死信无处可去，挂上会形成回环");
    }

    @Test
    @DisplayName("死信绑定把 *.dlx 的 *.dead 路由到对应 dlq")
    void deadLetterBindingsRouteToDlq() {
        assertDeadLetterBinding(config.notificationDeadLetterBinding(),
                RabbitConfig.NOTIFICATION_DLQ, RabbitConfig.NOTIFICATION_DLX,
                RabbitConfig.NOTIFICATION_DL_ROUTING_KEY);
        assertDeadLetterBinding(config.matchDeadLetterBinding(),
                RabbitConfig.MATCH_DLQ, RabbitConfig.MATCH_DLX,
                RabbitConfig.MATCH_DL_ROUTING_KEY);
        assertDeadLetterBinding(config.checkinDeadLetterBinding(),
                RabbitConfig.CHECKIN_DLQ, RabbitConfig.CHECKIN_DLX,
                RabbitConfig.CHECKIN_DL_ROUTING_KEY);
    }

    private void assertDeadLetterBinding(Binding binding, String queue, String exchange,
                                         String routingKey) {
        assertEquals(queue, binding.getDestination());
        assertEquals(exchange, binding.getExchange());
        assertEquals(routingKey, binding.getRoutingKey());
    }

    @Test
    @DisplayName("恢复器必须抛出「拒绝且不重投」——不抛就没有死信，只有静默丢弃")
    void recovererRejectsWithoutRequeue() {
        RuntimeException cause = new IllegalStateException("消费端 DB 写失败");
        Message message = new Message("{\"userId\":1}".getBytes(java.nio.charset.StandardCharsets.UTF_8),
                new MessageProperties());

        AmqpRejectAndDontRequeueException thrown = assertThrows(
                AmqpRejectAndDontRequeueException.class,
                () -> config.deadLetteringMessageRecoverer().recover(message, cause),
                "恢复器必须抛出，容器才会 nack(requeue=false)，broker 才会按 x-dead-letter-* 投死信");
        assertEquals(cause, thrown.getCause(), "原始失败原因必须随异常保留，便于排查");
    }

    @Test
    @DisplayName("死信监听即出队：必须把原文留档成 outbox FAILED 行，否则证据随 ack 消失")
    void deadLetterIsArchivedAsFailedOutboxRow() {
        com.campuslove.api.repository.OutboxEventRepository repository =
                org.mockito.Mockito.mock(com.campuslove.api.repository.OutboxEventRepository.class);
        DeadLetterListener listener = new DeadLetterListener();
        org.springframework.test.util.ReflectionTestUtils.setField(
                listener, "outboxEventRepository", repository);

        MessageProperties props = new MessageProperties();
        props.setConsumerQueue(RabbitConfig.NOTIFICATION_DLQ);
        props.setMessageId("evt-dead-1");
        // broker 在死信时写入的 x-death：记录原始交换机/路由键/被拒原因
        props.setHeader("x-death", java.util.List.of(java.util.Map.of(
                "queue", RabbitConfig.NOTIFICATION_QUEUE,
                "exchange", RabbitConfig.NOTIFICATION_EXCHANGE,
                "routing-keys", java.util.List.of("notification.like"),
                "reason", "reject",
                "count", 3L)));
        String payload = "{\"userId\":7,\"type\":\"like\",\"eventId\":\"evt-dead-1\"}";
        Message message = new Message(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8), props);

        listener.handleDeadLetter(message);

        ArgumentCaptor<com.campuslove.api.entity.OutboxEvent> captor =
                ArgumentCaptor.forClass(com.campuslove.api.entity.OutboxEvent.class);
        org.mockito.Mockito.verify(repository).save(captor.capture());
        com.campuslove.api.entity.OutboxEvent archived = captor.getValue();
        assertEquals(payload, archived.getPayloadJson(), "原文必须可复原，否则无法重放");
        assertEquals(com.campuslove.api.entity.OutboxEvent.OutboxStatus.FAILED, archived.getStatus(),
                "FAILED 是终态：sweep 只扫 PENDING，留档绝不能变成自动重投（会形成循环投递）");
        assertEquals("notification.like", archived.getRoutingKey(),
                "重放需要原始路由键，应取自 x-death 而不是本次死信的路由键");
        assertEquals(RabbitConfig.NOTIFICATION_EXCHANGE, archived.getExchangeName());
        assertEquals("notification", archived.getQueueType());
        assertTrue(archived.getDedupKey().startsWith("dead:"),
                "留档行必须与原事件行区分，避免撞 uk_outbox_dedup_key");
    }

    @Test
    @DisplayName("死信监听器绝不抛出：这里是链路终点，抛出只会让坏消息热循环")
    void deadLetterListenerNeverRethrows() {
        com.campuslove.api.repository.OutboxEventRepository repository =
                org.mockito.Mockito.mock(com.campuslove.api.repository.OutboxEventRepository.class);
        org.mockito.Mockito.when(repository.save(any()))
                .thenThrow(new IllegalStateException("DB 写不进去"));
        DeadLetterListener listener = new DeadLetterListener();
        org.springframework.test.util.ReflectionTestUtils.setField(
                listener, "outboxEventRepository", repository);

        Message message = new Message("{}".getBytes(java.nio.charset.StandardCharsets.UTF_8),
                new MessageProperties());

        // 若这里抛出，容器会 requeue ⇒ 同一条坏消息被无限重投（比丢一条更糟）
        assertDoesNotThrow(() -> listener.handleDeadLetter(message));
    }
}
