package com.campuslove.api.mq;

import com.campuslove.api.config.RabbitConfig;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 死信监听器（P1，2026-10-31）。
 *
 * <p>监听三条业务死信队列，把「消费重试耗尽」这件事<b>打成 ERROR</b>，让运维第一次
 * 就有可见的告警面。此前没有任何 DLQ 监听：业务消费者又把所有异常 catch 掉
 * 「以避免重投」，于是消费失败既无重试、也无死信、也无日志级别的痕迹——
 * 「通知没送到」在这套代码里是不可观测的。</p>
 *
 * <p>消息是怎么到这里来的：业务监听方法<b>抛出</b>异常 → Boot 依
 * {@code spring.rabbitmq.listener.simple.retry.*} 重试 → 耗尽后调用
 * {@link RabbitConfig#deadLetteringMessageRecoverer()} → 抛
 * {@code AmqpRejectAndDontRequeueException} → {@code basicNack(requeue=false)}
 * → 队列的 {@code x-dead-letter-exchange} 把消息投到这里的 {@code *.dlq}。</p>
 *
 * <p><b>本监听器不重投、不抛出（唯一一处「catch 一切」，理由是它自己就是终点）</b>：
 * 死信队列没有下一层死信（见 RabbitConfig 里 DLQ 刻意不挂 DLX，避免回环）。
 * 若这里再抛异常，容器会 requeue，同一条坏消息在极短时间内被反复投递，
 * 形成热循环并刷满日志、拖垮消费者线程——比丢一条消息更糟。
 * 因此这里的 catch 属于「非可重试场景」：<b>记录</b>是它唯一的正确动作。</p>
 *
 * <p><b>监听即出队 —— 所以证据必须落库，不能只靠队列长度</b>：本类一旦开始消费
 * {@code *.dlq}，消息就被 ack 并从队列移除，「DLQ 堆积」这个告警指标会永远是 0，
 * 只看队列会得出「没有失败」的假结论。因此每条死信除了打 ERROR，还会以
 * {@code status=FAILED} 回写一行 {@code outbox_event}（dedup_key 前缀
 * {@code dead:} + 原 message_id，与事件本体的行区分开，不覆盖历史）。
 * 于是运维的可查口径统一成一条 SQL：
 * {@code SELECT * FROM outbox_event WHERE status='FAILED'}；
 * 修好消费端缺陷后，把该行的 {@code payload_json} 重新投回原
 * exchange/routing_key 即可重放——消费端有
 * {@link ConsumerIdempotencyStore} 幂等守卫，重放不会二次落地。</p>
 *
 * <p>回写的行<b>不会</b>被补偿任务再次投递：sweep 只扫 {@code PENDING}，
 * {@code FAILED} 是终态（否则「消费失败 → 死信 → 回炉 → 再失败」会形成循环投递）。</p>
 *
 * <p>为什么这里落 payload、而生产端只落摘要：死信消息本身就是「必须有人来看」的对象，
 * 不打出来就等于没有告警。为避免把用户隐私整份复制进日志文件，这里按 R4-00303 的
 * 截断口径打印前 500 字符 + 总字节数，<b>完整原文落进上面那条 FAILED 行的
 * {@code payload_json}（TEXT）</b>，不依赖日志文件留存。</p>
 */
@Component
@Profile("real")
public class DeadLetterListener {

    private static final Logger log = LoggerFactory.getLogger(DeadLetterListener.class);

    /** 日志中打印的 payload 最大字符数（超出截断，完整原文落 outbox FAILED 行） */
    private static final int MAX_BODY_LOG_CHARS = 500;

    /** 死信回写 outbox 时的 dedup_key 前缀（与事件本体的行区分，避免撞唯一索引） */
    private static final String DEAD_LETTER_KEY_PREFIX = "dead:";

    /**
     * outbox 仓库（用于把死信留档成 FAILED 行）。
     *
     * <p>{@code required = false}：为 null 时只打日志、不留档（行为退化但不影响消费）。</p>
     */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.campuslove.api.repository.OutboxEventRepository outboxEventRepository;

    /**
     * 消费三条业务死信队列：打 ERROR + 留档一行 FAILED。
     *
     * @param message 原始消息（以 {@link Message} 接收，绕开 JSON 转换：
     *                死信很可能是「反序列化/类型绑定失败」本身造成的，
     *                这里若再要求转换成功，就会连案发现场都读不到）
     */
    @RabbitListener(queues = {
            RabbitConfig.NOTIFICATION_DLQ,
            RabbitConfig.MATCH_DLQ,
            RabbitConfig.CHECKIN_DLQ})
    public void handleDeadLetter(Message message) {
        try {
            if (message == null) {
                log.error("死信队列为 null，无法记录（请检查 broker 侧 dlq 状态）");
                return;
            }
            MessageProperties props = message.getMessageProperties();
            // x-death：broker 写入的死信来源（queue/exchange/routing-keys/reason/count），
            // 是「这条消息从哪儿来、被拒了几次」的权威证据，比任何应用层日志都可靠。
            Object xDeath = props.getHeaders() == null
                    ? null : props.getHeaders().get("x-death");
            log.error("消息已进入死信队列，需人工介入：dlq={}, sourceQueue={}, "
                            + "originalExchange={}, originalRoutingKey={}, messageId={}, "
                            + "redelivered={}, contentType={}, xDeath={}, body[{}B]={}",
                    props.getConsumerQueue(), header(props, "x-first-death-queue"),
                    props.getReceivedExchange(), props.getReceivedRoutingKey(),
                    props.getMessageId(), props.getRedelivered(), props.getContentType(),
                    xDeath, message.getBody() == null ? 0 : message.getBody().length,
                    truncateBody(message.getBody()));
            archiveAsFailedOutbox(message, props, xDeath);
        } catch (RuntimeException e) {
            // 见类注释：本监听器是链路终点，抛出只会造成热循环，绝不重投。
            log.error("死信记录过程本身异常（消息已被 broker 投递，未丢失）：error={}",
                    e.getMessage(), e);
        }
    }

    /**
     * 把死信留档成 {@code outbox_event} 的 FAILED 行（监听即出队，不留档就等于证据消失）。
     *
     * <p>留档失败本身不影响消费（消息内容已进 ERROR 日志），只影响可检索性；
     * 属于不可重试场景：DB 若已经挂到写不进 outbox，重投这条死信也写不进去。</p>
     */
    private void archiveAsFailedOutbox(Message message, MessageProperties props, Object xDeath) {
        if (outboxEventRepository == null) {
            return;
        }
        try {
            String body = message.getBody() == null
                    ? "" : new String(message.getBody(), StandardCharsets.UTF_8);
            String messageId = props.getMessageId();
            com.campuslove.api.entity.OutboxEvent row = new com.campuslove.api.entity.OutboxEvent();
            row.setQueueType(queueTypeOfDlq(props.getConsumerQueue()));
            row.setExchangeName(originalExchange(props, xDeath));
            row.setRoutingKey(originalRoutingKey(props, xDeath));
            row.setPayloadJson(body);
            row.setDedupKey(messageId == null || messageId.isBlank()
                    ? null : DEAD_LETTER_KEY_PREFIX + messageId);
            row.setStatus(com.campuslove.api.entity.OutboxEvent.OutboxStatus.FAILED);
            row.setRetryCount(0);
            row.setLastError(truncateReason(xDeath));
            row.setCreatedAt(java.time.LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS));
            outboxEventRepository.save(row);
        } catch (RuntimeException e) {
            log.warn("死信留档 outbox 失败（内容与原因仍在本条 ERROR 日志中）：error={}", e.getMessage());
        }
    }

    /** dlq 名 → 队列类型（{@code notification.dlq} → {@code notification}）。 */
    private static String queueTypeOfDlq(String dlq) {
        if (dlq == null) {
            return "unknown";
        }
        int dot = dlq.indexOf('.');
        return dot > 0 ? dlq.substring(0, dot) : dlq;
    }

    /** 原始交换机：优先取 {@code x-death[0].exchange}，取不到则回退到本次投递的 exchange。 */
    private static String originalExchange(MessageProperties props, Object xDeath) {
        Object exchange = firstXDeath(xDeath).get("exchange");
        if (exchange != null && !String.valueOf(exchange).isBlank()) {
            return String.valueOf(exchange);
        }
        return props.getReceivedExchange() == null ? "" : props.getReceivedExchange();
    }

    /** 原始路由键：优先 {@code x-death[0].routing-keys[0]}，回退本次投递的 routing key。 */
    private static String originalRoutingKey(MessageProperties props, Object xDeath) {
        Object routingKeys = firstXDeath(xDeath).get("routing-keys");
        if (routingKeys instanceof java.util.List<?> list && !list.isEmpty() && list.get(0) != null) {
            return String.valueOf(list.get(0));
        }
        return props.getReceivedRoutingKey() == null ? "" : props.getReceivedRoutingKey();
    }

    /** 死信原因摘要（写进 last_error，便于「为什么进 DLQ」一眼可辨）。 */
    private static String truncateReason(Object xDeath) {
        Object reason = firstXDeath(xDeath).get("reason");
        String text = reason == null
                ? "消费重试耗尽，由 x-dead-letter-exchange 投递"
                : "消费重试耗尽（x-death.reason=" + reason + "）";
        return text.length() <= 500 ? text : text.substring(0, 500);
    }

    @SuppressWarnings("unchecked")
    private static java.util.Map<String, Object> firstXDeath(Object xDeath) {
        if (xDeath instanceof java.util.List<?> list && !list.isEmpty()
                && list.get(0) instanceof java.util.Map<?, ?> map) {
            return (java.util.Map<String, Object>) map;
        }
        return java.util.Map.of();
    }

    /** 取字符串头（不存在返回 "n/a"，避免日志里出现 null 干扰检索）。 */
    private static String header(MessageProperties props, String name) {
        Map<String, Object> headers = props.getHeaders();
        if (headers == null) {
            return "n/a";
        }
        Object value = headers.get(name);
        return value == null ? "n/a" : String.valueOf(value);
    }

    /** UTF-8 解出 payload 前若干字符，解析失败也不影响告警主体。 */
    private static String truncateBody(byte[] body) {
        if (body == null || body.length == 0) {
            return "<empty>";
        }
        String text;
        try {
            text = new String(body, StandardCharsets.UTF_8);
        } catch (RuntimeException e) {
            // 非 UTF-8 字节（极端情况）：不打印二进制，只报长度
            return "<undecodable " + body.length + "B>";
        }
        return text.length() <= MAX_BODY_LOG_CHARS
                ? text
                : text.substring(0, MAX_BODY_LOG_CHARS) + "...(截断，完整原文在 dlq)";
    }
}
