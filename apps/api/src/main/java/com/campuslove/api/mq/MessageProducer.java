package com.campuslove.api.mq;

import com.campuslove.api.entity.OutboxEvent;
import org.springframework.context.annotation.Profile;
import com.campuslove.api.config.RabbitConfig;
import com.campuslove.api.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.redisson.api.RedissonClient;
import org.redisson.api.RLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * 消息生产者。
 *
 * <p>封装 RabbitMQ 消息发送逻辑，业务服务通过调用本类的方法
 * 异步投递通知/匹配/签到消息到对应队列。</p>
 *
 * <p>降级策略（核心原则：MQ 不可用不应阻断业务流程）：</p>
 * <ol>
 *   <li>RabbitTemplate 未注入（mock 模式或 RabbitMQ 自动配置未启用）：
 *       记录 warn 日志后转入 outbox，不抛出异常</li>
 *   <li>RabbitMQ 连接或发送失败：捕获所有异常，记录 warn 日志，转 outbox 补偿，
 *       不向上抛出</li>
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
 * <p><b>P0 修复（2026-10-31）：补偿任务原本会在多 JVM 间把同一条消息投两次。</b>
 * 原实现 {@code findTop100…PENDING…} 读出来就直接 {@code convertAndSend}，发完才写
 * SENT，并且既没有分布式锁也没有行认领——滚动重启期间新旧两个进程会扫到同一批行、
 * 各发一遍，消费端又不幂等，结果是站内通知重复入库、微信订阅消息重复发送
 * （订阅消息是一次性配额，重复发等于把用户唯一的推送机会烧掉）。现在的顺序是：</p>
 * <ol>
 *   <li><b>行认领（真正的防线）</b>：{@link OutboxEventRepository#claim} 执行
 *       {@code UPDATE … SET status='IN_PROGRESS' WHERE id=? AND status='PENDING'}，
 *       InnoDB 行锁保证并发下只有一个实例拿到「影响行数 == 1」；
 *       <b>只有拿到 1 的实例才允许投递</b>。影响行数为 0 ⇒ 直接跳过，一行都不发。</li>
 *   <li><b>Redisson sweep 锁（纵深防御）</b>：{@code scheduled:outboxCompensation}，
 *       拿不到锁就本轮不跑。它只是省掉无谓的扫描与竞争，
 *       <b>不能</b>当作去重手段——锁租约到期、Redis 抖动、mock 场景下 Redisson
 *       为 null 时都可能两个实例同时进入，此时仍然只有上面的行认领挡得住。</li>
 *   <li><b>僵尸认领回收</b>：实例在「已认领、未回写」之间被杀会把行永久卡在
 *       IN_PROGRESS（比原来更糟：事件再也不投）。每轮先按 {@code claimed_at}
 *       超时（{@link #OUTBOX_CLAIM_TIMEOUT_SECONDS}）回收成 PENDING。</li>
 *   <li><b>消费端幂等（最后一道）</b>：见 {@link ConsumerIdempotencyStore}
 *       与 {@link EventDedupKeys}；投递侧的 {@code eventId} 由本类补齐并随
 *       payload 落库，键能穿过整条 outbox 重投链路。</li>
 * </ol>
 *
 * <p><b>SENT 只表示「已交给 broker」，不表示「消费成功」</b>——此前代码把这两件事混为
 * 一谈，于是「表里全是 SENT，用户却什么也没收到」完全无法解释。broker 收下
 * （convertAndSend 未抛异常）就写 SENT；能不能被消费、消费成不成功，本表一无所知，
 * 要看 {@link RabbitConfig} 声明的死信队列（{@code *.dlq}）与
 * {@link DeadLetterListener} 打出的 ERROR 日志。排查链路请同时看这两处。</p>
 *
 * <p>重投时的消息字节口径也一并修好了：老代码把 {@code payload_json} 当
 * {@code String} 直接 {@code convertAndSend}，经 Jackson2JsonMessageConverter
 * 会被再包一层 JSON 字符串（{@code "{\"userId\":1}"} → 带引号的字符串字面量，
 * content_type=text/plain），消费者按方法签名反序列化成 POJO 必然失败——
 * 也就是说<b>补偿投出去的消息从来没有被成功消费过</b>，SENT 行全是废单。
 * 现在直接以原始 JSON 字节 + {@code application/json} 投递，与首次发送的编码一致。</p>
 *
 * <p>线程安全：RabbitTemplate 内部为线程安全，可在多线程环境下共享使用。</p>
 */
@Profile("real")
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
     * P0（2026-10-31）：认领超时（秒）。超过此时长仍是 IN_PROGRESS 的行视为
     * 「认领实例已崩溃」，回收给别的实例。取 5 分钟：远大于单条消息投递耗时
     * （毫秒级），又足以让崩溃事件在几分钟内恢复。
     */
    private static final long OUTBOX_CLAIM_TIMEOUT_SECONDS = 300;

    /** P0（2026-10-31）：补偿任务的分布式 sweep 锁键（纵深防御，见类注释） */
    private static final String OUTBOX_SWEEP_LOCK_KEY = "scheduled:outboxCompensation";

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
     * P0（2026-10-31）：sweep 锁用的 Redisson 客户端。
     *
     * <p>可为 null（mock profile 排除了 Redisson）；为 null 时只靠行认领去重，
     * 这正是因为行认领才是真防线。</p>
     */
    @Autowired(required = false)
    private RedissonClient redissonClient;

    /**
     * 异步发送通知消息到 RabbitMQ。
     *
     * <p>路由键构造为 {@code notification.{type}}，配合 topic Exchange 的
     * {@code notification.#} 通配符路由到 {@code notification.queue}。</p>
     *
     * <p>失败时仅记录日志，不抛出异常，保证业务主流程不受影响
     * （R4-00373：失败事件落库 outbox_event，由定时任务补偿重投）。</p>
     *
     * <p>入参对象不会被修改：调用方没带 {@code eventId} 时，本方法在<b>副本</b>上补一个
     * UUID（调用方若复用同一个消息对象发两次业务事件，不会被误判成重复事件）。</p>
     *
     * @param message 通知消息体
     */
    public void sendNotification(NotificationMessage message) {
        if (message == null) {
            log.warn("通知消息为空，跳过发送");
            return;
        }

        NotificationMessage payload = copyWithEventId(message);

        // 构造路由键：notification.{type}
        String routingKey = NOTIFICATION_ROUTING_KEY_PREFIX
                + (payload.getType() != null ? payload.getType() : "default");

        if (rabbitTemplate == null) {
            // RabbitTemplate 不可用（mock 模式或自动配置未启用）
            log.warn("RabbitTemplate 未注入，通知消息转入 outbox 补偿：routingKey={}", routingKey);
            persistOutbox("notification", RabbitConfig.NOTIFICATION_EXCHANGE, routingKey,
                    payload, payload.getEventId());
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.NOTIFICATION_EXCHANGE,
                    routingKey,
                    payload,
                    withMessageId(payload.getEventId()));
            log.debug("通知消息已投递：routingKey={}, eventId={}, message={}",
                    routingKey, payload.getEventId(), payload);
        } catch (RuntimeException e) {
            // MQ 不可用，仅记录日志，不抛出（R4-00373：落库 outbox 补偿重投）
            log.warn("通知消息发送失败，转入 outbox 补偿：routingKey={}, eventId={}, error={}",
                    routingKey, payload.getEventId(), e.getMessage());
            persistOutbox("notification", RabbitConfig.NOTIFICATION_EXCHANGE, routingKey,
                    payload, payload.getEventId());
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

        MatchEventMessage payload = copyWithEventId(message);

        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，匹配事件消息转入 outbox 补偿：routingKey={}",
                    RabbitConfig.MATCH_ROUTING_KEY);
            persistOutbox("match", RabbitConfig.MATCH_EXCHANGE, RabbitConfig.MATCH_ROUTING_KEY,
                    payload, payload.getEventId());
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.MATCH_EXCHANGE,
                    RabbitConfig.MATCH_ROUTING_KEY,
                    payload,
                    withMessageId(payload.getEventId()));
            log.debug("匹配事件消息已投递：routingKey={}, eventId={}, message={}",
                    RabbitConfig.MATCH_ROUTING_KEY, payload.getEventId(), payload);
        } catch (RuntimeException e) {
            // MQ 不可用，仅记录日志，不抛出（R4-00373：落库 outbox 补偿重投）
            log.warn("匹配事件消息发送失败，转入 outbox 补偿：routingKey={}, eventId={}, error={}",
                    RabbitConfig.MATCH_ROUTING_KEY, payload.getEventId(), e.getMessage());
            persistOutbox("match", RabbitConfig.MATCH_EXCHANGE, RabbitConfig.MATCH_ROUTING_KEY,
                    payload, payload.getEventId());
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

        CheckInEventMessage payload = copyWithEventId(message);

        if (rabbitTemplate == null) {
            log.warn("RabbitTemplate 未注入，签到事件消息转入 outbox 补偿：routingKey={}",
                    RabbitConfig.CHECKIN_ROUTING_KEY);
            persistOutbox("checkin", RabbitConfig.CHECKIN_EXCHANGE, RabbitConfig.CHECKIN_ROUTING_KEY,
                    payload, payload.getEventId());
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.CHECKIN_EXCHANGE,
                    RabbitConfig.CHECKIN_ROUTING_KEY,
                    payload,
                    withMessageId(payload.getEventId()));
            log.debug("签到事件消息已投递：routingKey={}, eventId={}, message={}",
                    RabbitConfig.CHECKIN_ROUTING_KEY, payload.getEventId(), payload);
        } catch (RuntimeException e) {
            // MQ 不可用，仅记录日志，不抛出（R4-00373：落库 outbox 补偿重投）
            log.warn("签到事件消息发送失败，转入 outbox 补偿：routingKey={}, eventId={}, error={}",
                    RabbitConfig.CHECKIN_ROUTING_KEY, payload.getEventId(), e.getMessage());
            persistOutbox("checkin", RabbitConfig.CHECKIN_EXCHANGE, RabbitConfig.CHECKIN_ROUTING_KEY,
                    payload, payload.getEventId());
        }
    }

    /**
     * R4-00373：发送失败事件落库 outbox_event（best effort，落库失败仅记日志）。
     *
     * <p>P0（2026-10-31）：写入 {@code dedup_key}（唯一索引 uk_outbox_dedup_key），
     * 于是「同一业务事件」在补偿表里落不下第二行——生产者自身重试、两个实例同时
     * 兜底落库都会被数据库拒绝。落库前先 {@code existsByDedupKey} 预检（省掉异常栈），
     * 真正兜底的是唯一索引：并发穿透预检时插入抛
     * {@link org.springframework.dao.DataIntegrityViolationException}，
     * 由下方 RuntimeException 分支记日志吸收（重复行本来就等价，不丢事件）。</p>
     *
     * @param queueType  队列类型（notification/match/checkin）
     * @param exchange   目标交换机
     * @param routingKey 路由键
     * @param message    消息体（序列化为 JSON 存储）
     * @param dedupKey   事件幂等键（可为 null：无法确定业务身份时不强行赋键）
     */
    private void persistOutbox(String queueType, String exchange, String routingKey,
                               Object message, String dedupKey) {
        if (outboxEventRepository == null) {
            log.debug("outbox 仓库不可用（mock/无 JPA），跳过落库：queueType={}", queueType);
            return;
        }
        try {
            if (dedupKey != null && outboxEventRepository.existsByDedupKey(dedupKey)) {
                log.info("同一业务事件已在 outbox 中，跳过重复落库：queueType={}, dedupKey={}",
                        queueType, dedupKey);
                return;
            }
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
            event.setDedupKey(dedupKey);
            event.setStatus(OutboxEvent.OutboxStatus.PENDING);
            event.setRetryCount(0);
            event.setCreatedAt(LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS));
            outboxEventRepository.save(event);
            log.info("消息已落库 outbox 等待补偿：queueType={}, routingKey={}, outboxId={}, dedupKey={}",
                    queueType, routingKey, event.getId(), dedupKey);
        } catch (RuntimeException e) {
            // outbox 落库失败仅记录日志（DB 异常不应阻断业务主流程）
            log.warn("outbox 落库失败，消息无法补偿：queueType={}, routingKey={}, error={}",
                    queueType, routingKey, e.getMessage());
        }
    }

    /**
     * R4-00373：定时补偿重投 PENDING 的 outbox 事件。
     *
     * <p>每 30 秒执行一次。执行顺序（P0 修复后）：</p>
     * <ol>
     *   <li>抢 Redisson sweep 锁（{@code scheduled:outboxCompensation}）；拿不到就说明
     *       别的实例正在扫，本轮直接退出。锁用「不传 leaseTime」的
     *       {@code tryLock(0, SECONDS)}，靠 Redisson 看门狗续期，口径同
     *       JwtTokenProvider 的清理任务（R4-00311），并在 finally 释放（FIN-00061）。</li>
     *   <li>回收超时未回写的 IN_PROGRESS 僵尸认领。</li>
     *   <li>取候选（落库超过 {@link #OUTBOX_MIN_DELAY_SECONDS} 秒，先落库先重投，
     *       单批上限 100）。</li>
     *   <li><b>逐行条件认领，认领成功（影响行数 == 1）才 convertAndSend</b>；
     *       投递成功置 SENT，失败累计重试次数，超过 {@link #OUTBOX_MAX_RETRY} 次置
     *       FAILED 供人工介入。投递结果的回写同样带 status 前置条件。</li>
     * </ol>
     *
     * <p>mock profile（无 JPA 仓库）下自动跳过。锁不可用（Redisson 未装配）时仍然执行，
     * 由行认领保证不重复投。</p>
     */
    @Scheduled(fixedDelay = 30000L, initialDelay = 30000L)
    public void compensatePendingEvents() {
        if (outboxEventRepository == null || rabbitTemplate == null) {
            return;
        }
        RLock lock = redissonClient != null ? redissonClient.getLock(OUTBOX_SWEEP_LOCK_KEY) : null;
        boolean locked = false;
        if (lock != null) {
            try {
                locked = lock.tryLock(0, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("outbox 补偿任务获取分布式锁被中断，跳过本次执行");
                return;
            }
            if (!locked) {
                log.debug("outboxCompensation 已被其他实例持有，跳过本次扫描");
                return;
            }
        }
        try {
            sweepOnce();
        } finally {
            if (locked) {
                try {
                    if (lock.isHeldByCurrentThread()) {
                        lock.unlock();
                    }
                } catch (IllegalStateException e) {
                    log.warn("outbox 补偿锁释放异常（锁可能已超时自动释放）：error={}", e.getMessage());
                }
            }
        }
    }

    /**
     * 单轮补偿扫描（抽成独立方法便于边界测试直接驱动，不经锁）。
     *
     * <p>包内可见，不做 protected 扩展点用。</p>
     */
    void sweepOnce() {
        LocalDateTime now = LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS);

        // 1) 回收僵尸认领：实例在认领与回写之间被杀（滚动重启/OOM）会把行卡在 IN_PROGRESS
        try {
            int reclaimed = outboxEventRepository.reclaimStaleClaims(
                    OutboxEvent.OutboxStatus.IN_PROGRESS, OutboxEvent.OutboxStatus.PENDING,
                    now.minusSeconds(OUTBOX_CLAIM_TIMEOUT_SECONDS));
            if (reclaimed > 0) {
                log.warn("outbox 回收超时认领（认领实例疑似已崩溃）：rows={}, timeoutSeconds={}",
                        reclaimed, OUTBOX_CLAIM_TIMEOUT_SECONDS);
            }
        } catch (RuntimeException e) {
            log.warn("outbox 超时认领回收失败，继续本轮扫描：error={}", e.getMessage());
        }

        // 2) 候选（未认领，仅用于缩小范围）
        List<OutboxEvent> candidates;
        try {
            candidates = outboxEventRepository
                    .findTop100ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                            OutboxEvent.OutboxStatus.PENDING,
                            now.minusSeconds(OUTBOX_MIN_DELAY_SECONDS));
        } catch (RuntimeException e) {
            log.warn("outbox 补偿扫描失败：error={}", e.getMessage());
            return;
        }

        // 3) 逐行认领后投递
        for (OutboxEvent candidate : candidates) {
            publishIfClaimed(candidate, now);
        }
    }

    /**
     * 认领成功后才投递一行事件（P0 的落点）。
     *
     * <p>投递的前置条件是 {@link OutboxEventRepository#claim} 的<b>影响行数 == 1</b>。
     * 拿到 0 意味着该行已被其他实例/其他轮次认领或已投递，此时一行都不发。</p>
     *
     * @param candidate 候选行（读取自扫描，状态此时可能已变）
     * @param now       本轮时间（写入 claimed_at）
     */
    private void publishIfClaimed(OutboxEvent candidate, LocalDateTime now) {
        int claimed;
        try {
            claimed = outboxEventRepository.claim(candidate.getId(),
                    OutboxEvent.OutboxStatus.PENDING, OutboxEvent.OutboxStatus.IN_PROGRESS, now);
        } catch (RuntimeException e) {
            // 认领本身失败 ⇒ 绝不投递（宁可不发，也不能重复发）
            log.warn("outbox 行认领失败，跳过投递：outboxId={}, error={}",
                    candidate.getId(), e.getMessage());
            return;
        }
        if (claimed != 1) {
            log.debug("outbox 行未被本实例认领（影响行数={}），跳过投递：outboxId={}",
                    claimed, candidate.getId());
            return;
        }

        try {
            publishPayload(candidate);
            int marked = outboxEventRepository.markSent(candidate.getId(),
                    OutboxEvent.OutboxStatus.IN_PROGRESS, OutboxEvent.OutboxStatus.SENT,
                    LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS));
            if (marked == 0) {
                // 消息已发出，但回写没命中：说明认领在投递期间被别的 sweep 超时回收过。
                // 后果是「可能重复投一次」，由消费端幂等守卫吸收（见类注释）。
                log.warn("outbox 已投递但状态回写未命中（认领疑似被回收），"
                        + "可能出现重复投递，由消费端幂等守卫兜底：outboxId={}, dedupKey={}",
                        candidate.getId(), candidate.getDedupKey());
            } else {
                log.info("outbox 补偿投递成功：outboxId={}, queueType={}, routingKey={}, dedupKey={}",
                        candidate.getId(), candidate.getQueueType(), candidate.getRoutingKey(),
                        candidate.getDedupKey());
            }
        } catch (RuntimeException e) {
            int retry = (candidate.getRetryCount() == null ? 0 : candidate.getRetryCount()) + 1;
            OutboxEvent.OutboxStatus target = retry >= OUTBOX_MAX_RETRY
                    ? OutboxEvent.OutboxStatus.FAILED : OutboxEvent.OutboxStatus.PENDING;
            log.warn("outbox 补偿投递{}：outboxId={}, retry={}, error={}",
                    target == OutboxEvent.OutboxStatus.FAILED ? "超限置 FAILED" : "失败，交回下轮重试",
                    candidate.getId(), retry, e.getMessage());
            try {
                outboxEventRepository.releaseAfterFailedPublish(candidate.getId(),
                        OutboxEvent.OutboxStatus.IN_PROGRESS, target, retry,
                        truncate(e.getMessage(), 500));
            } catch (RuntimeException saveEx) {
                log.warn("outbox 补偿状态回写失败：outboxId={}, error={}",
                        candidate.getId(), saveEx.getMessage());
            }
        }
    }

    /**
     * 以「原始 JSON 字节 + application/json」投递 payload。
     *
     * <p>不能像老代码那样 {@code convertAndSend(exchange, key, payloadJson)}：那是把一个
     * Java {@code String} 交给 Jackson 转换器，会被再序列化一层（body 成为带引号的 JSON
     * 字符串字面量、content_type=text/plain），消费者按监听方法签名把 body 绑定成
     * POJO 必然失败——补偿链路因此「投得出、消费不了」。这里绕过转换器直接构造
     * {@link Message}，body 与首次发送的 JSON 逐字节一致，{@code __TypeId__} 显式给出
     * 目标类名（多语言/无签名推断的消费方也能识别）。</p>
     *
     * @param event outbox 行（已认领）
     */
    private void publishPayload(OutboxEvent event) {
        MessageProperties props = new MessageProperties();
        props.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        String dedupKey = event.getDedupKey();
        if (dedupKey != null) {
            props.setMessageId(dedupKey);
        }
        Class<?> payloadType = payloadTypeFor(event.getQueueType());
        if (payloadType != null) {
            props.setHeader(org.springframework.amqp.support.converter
                    .AbstractJavaTypeMapper.DEFAULT_CLASSID_FIELD_NAME, payloadType.getName());
        }
        byte[] body = event.getPayloadJson() == null
                ? new byte[0]
                : event.getPayloadJson().getBytes(StandardCharsets.UTF_8);
        rabbitTemplate.send(event.getExchangeName(), event.getRoutingKey(), new Message(body, props));
    }

    /** queueType → 消息类（未知类型返回 null：只发裸 JSON，由消费端按签名推断或落 DLQ） */
    private Class<?> payloadTypeFor(String queueType) {
        if (queueType == null) {
            return null;
        }
        return switch (queueType) {
            case "notification" -> NotificationMessage.class;
            case "match" -> MatchEventMessage.class;
            case "checkin" -> CheckInEventMessage.class;
            default -> null;
        };
    }

    /**
     * 把 AMQP 的 {@code message_id} 设成事件幂等键。
     *
     * <p>运维价值：DLQ 里的消息（{@link DeadLetterListener} 打印的 headers）与
     * {@code outbox_event.dedup_key} 从此可以对上同一个号。</p>
     */
    private static MessagePostProcessor withMessageId(String eventId) {
        return amqpMessage -> {
            if (eventId != null) {
                amqpMessage.getMessageProperties().setMessageId(eventId);
            }
            return amqpMessage;
        };
    }

    /**
     * 在副本上补齐 eventId（不修改调用方对象）。
     *
     * <p>为什么用副本：若在入参上就地写 UUID，调用方复用同一对象再发一次时
     * 会带上同一个键，第二次真实事件会被消费端判成重复而丢弃。</p>
     */
    private static NotificationMessage copyWithEventId(NotificationMessage m) {
        NotificationMessage copy = new NotificationMessage(
                m.getUserId(), m.getType(), m.getTitle(), m.getContent(), m.getCreatedAt(),
                m.getSourceUserId(), m.getReferenceId(), m.getReferenceType());
        copy.setEventId(hasText(m.getEventId()) ? m.getEventId() : newEventId());
        return copy;
    }

    /** 见 {@link #copyWithEventId(NotificationMessage)} */
    private static MatchEventMessage copyWithEventId(MatchEventMessage m) {
        MatchEventMessage copy = new MatchEventMessage(
                m.getUserId(), m.getTargetUserId(), m.getEventType(), m.getCreatedAt());
        copy.setEventId(hasText(m.getEventId()) ? m.getEventId() : newEventId());
        return copy;
    }

    /** 见 {@link #copyWithEventId(NotificationMessage)} */
    private static CheckInEventMessage copyWithEventId(CheckInEventMessage m) {
        CheckInEventMessage copy = new CheckInEventMessage(
                m.getUserId(), m.getConsecutiveDays(), m.getRewardPoints(), m.getCreatedAt());
        copy.setEventId(hasText(m.getEventId()) ? m.getEventId() : newEventId());
        return copy;
    }

    private static String newEventId() {
        return UUID.randomUUID().toString();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /** 截断错误信息到指定长度（防止超长异常消息撑爆列宽） */
    private String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }
}
