package com.campuslove.api.mq;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.OutboxEvent;
import com.campuslove.api.repository.OutboxEventRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * P0（2026-10-31）：outbox 补偿任务的「先认领、后投递」。
 *
 * <p><b>缺陷</b>：{@code compensatePendingEvents()} 原先
 * {@code findTop100…PENDING…} 读出来就 {@code convertAndSend}，发完才写 SENT，
 * 既无分布式锁也无行认领。滚动重启时新旧两个 JVM 会扫到同一批行、各投一次，
 * 消费端又不幂等 ⇒ 通知双插、微信订阅消息重复发送（一次性配额被烧两次）。</p>
 *
 * <p><b>本门钉死的机制</b>：投递的唯一前置条件是
 * {@code UPDATE … WHERE id=? AND status='PENDING'} 的<b>影响行数 == 1</b>。
 * 把认领去掉（或改成「不管返回值都发」），用例 1/3/4 立刻红——这是可证伪的，
 * 不是把生产代码抄一遍。</p>
 *
 * <p>另外钉住两件事：</p>
 * <ul>
 *   <li>重投 payload 的<b>编码</b>：body 必须是原始 JSON 字节 + {@code application/json}。
 *       老代码 {@code convertAndSend(..., payloadJson)} 把 String 再序列化一层，
 *       消费者永远绑不回 POJO ⇒「投得出、消费不了」，SENT 全是废单。</li>
 *   <li>僵尸认领回收：崩溃实例留在 IN_PROGRESS 的行必须被放回 PENDING，
 *       否则新代码比老代码更糟（事件再也不投）。</li>
 * </ul>
 */
@DisplayName("MessageProducer - outbox 补偿的行认领与重投编码")
class OutboxSweeperClaimTest {

    private OutboxEventRepository repository;
    private RabbitTemplate rabbitTemplate;
    private RedissonClient redissonClient;
    private RLock lock;
    private MessageProducer producer;

    @BeforeEach
    void setUp() throws Exception {
        repository = mock(OutboxEventRepository.class);
        rabbitTemplate = mock(RabbitTemplate.class);
        redissonClient = mock(RedissonClient.class);
        lock = mock(RLock.class);
        when(redissonClient.getLock(anyString())).thenReturn(lock);
        // 默认：本实例能抢到 sweep 锁，并且确实持有它（unlock 前置检查用）
        when(lock.tryLock(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(lock.isHeldByCurrentThread()).thenReturn(true);

        producer = new MessageProducer();
        ReflectionTestUtils.setField(producer, "rabbitTemplate", rabbitTemplate);
        ReflectionTestUtils.setField(producer, "outboxEventRepository", repository);
        ReflectionTestUtils.setField(producer, "redissonClient", redissonClient);
    }

    private OutboxEvent pendingRow(long id, int retryCount) {
        OutboxEvent event = new OutboxEvent();
        event.setId(id);
        event.setQueueType("notification");
        event.setExchangeName("notification.exchange");
        event.setRoutingKey("notification.like");
        event.setPayloadJson("{\"userId\":7,\"type\":\"like\",\"eventId\":\"evt-" + id + "\"}");
        event.setDedupKey("evt-" + id);
        event.setStatus(OutboxEvent.OutboxStatus.PENDING);
        event.setRetryCount(retryCount);
        event.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        return event;
    }

    private void givenCandidates(OutboxEvent... events) {
        when(repository.findTop100ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                eq(OutboxEvent.OutboxStatus.PENDING), any(LocalDateTime.class)))
                .thenReturn(List.of(events));
    }

    private void givenClaim(OutboxEvent event, int affectedRows) {
        when(repository.claim(eq(event.getId()),
                eq(OutboxEvent.OutboxStatus.PENDING),
                eq(OutboxEvent.OutboxStatus.IN_PROGRESS),
                any(LocalDateTime.class))).thenReturn(affectedRows);
    }

    @Test
    @DisplayName("认领影响行数为 0（被别的 JVM 抢先）：一行都不许投出去")
    void claimLostMeansNoPublish() {
        OutboxEvent row = pendingRow(1L, 0);
        givenCandidates(row);
        givenClaim(row, 0);

        producer.sweepOnce();

        verify(rabbitTemplate, never()).send(anyString(), anyString(), any(Message.class));
        verify(repository, never()).markSent(any(), any(), any(), any());
        verify(repository, never()).releaseAfterFailedPublish(any(), any(), any(), anyInt(), any());
        // 认领确实发生过——若把 claim 调用删掉，本用例也必须变红（否则门是空的）
        verify(repository).claim(eq(1L), eq(OutboxEvent.OutboxStatus.PENDING),
                eq(OutboxEvent.OutboxStatus.IN_PROGRESS), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("认领成功（行数 == 1）：投递一次并回写 SENT，payload 原样编码")
    void claimWonPublishesOnceWithRawJsonBody() {
        OutboxEvent row = pendingRow(2L, 0);
        givenCandidates(row);
        givenClaim(row, 1);

        producer.sweepOnce();

        ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
        verify(rabbitTemplate, times(1)).send(
                eq("notification.exchange"), eq("notification.like"), captor.capture());
        Message sent = captor.getValue();
        // 老代码的致命点：body 会被 Jackson 再包一层字符串（带引号 + text/plain），
        // 消费者绑不回 POJO —— 这里钉成「原始 JSON 字节 + application/json」
        assertEquals(row.getPayloadJson(), new String(sent.getBody(), StandardCharsets.UTF_8),
                "重投 body 必须与落库的 payload_json 逐字节一致");
        assertEquals(MessageProperties.CONTENT_TYPE_JSON,
                sent.getMessageProperties().getContentType());
        assertEquals("evt-2", sent.getMessageProperties().getMessageId(),
                "AMQP message_id 应与 dedup_key 同源，便于与 outbox 行/死信对上号");
        assertTrue(String.valueOf(sent.getMessageProperties().getHeaders()
                        .get("__TypeId__")).contains("NotificationMessage"),
                "应显式给出 __TypeId__，供不做签名推断的消费方识别");

        verify(repository).markSent(eq(2L), eq(OutboxEvent.OutboxStatus.IN_PROGRESS),
                eq(OutboxEvent.OutboxStatus.SENT), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("认领语句自身抛异常：绝不投递（宁可不发，不可重发）")
    void claimFailureSuppressesPublish() {
        OutboxEvent row = pendingRow(3L, 0);
        givenCandidates(row);
        when(repository.claim(eq(3L), any(), any(), any()))
                .thenThrow(new IllegalStateException("DB 死锁，认领语句本身失败"));

        producer.sweepOnce();

        verify(rabbitTemplate, never()).send(anyString(), anyString(), any(Message.class));
        verify(repository, never()).markSent(any(), any(), any(), any());
    }

    @Test
    @DisplayName("同一批两行、只有第二行认领成功：只投第二行（逐行门，不是整批门）")
    void claimIsGatedPerRowNotPerBatch() {
        OutboxEvent lost = pendingRow(4L, 0);
        OutboxEvent won = pendingRow(5L, 0);
        givenCandidates(lost, won);
        givenClaim(lost, 0);
        givenClaim(won, 1);

        producer.sweepOnce();

        ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
        verify(rabbitTemplate, times(1)).send(anyString(), anyString(), captor.capture());
        assertTrue(new String(captor.getValue().getBody(), StandardCharsets.UTF_8).contains("evt-5"),
                "只允许投递认领成功的那一行");
    }

    @Test
    @DisplayName("两个实例并发扫同一行：各自只有认领成功的一方投递（总投递数 == 1）")
    void twoJvmScanSameRowButOnlyOnePublishes() {
        OutboxEvent row = pendingRow(6L, 0);
        givenCandidates(row);
        // 第一次 claim 返回 1（实例 A），第二次返回 0（实例 B 抢输了）
        when(repository.claim(eq(6L), eq(OutboxEvent.OutboxStatus.PENDING),
                eq(OutboxEvent.OutboxStatus.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(1, 0);

        producer.sweepOnce();
        producer.sweepOnce();

        verify(rabbitTemplate, times(1)).send(anyString(), anyString(), any(Message.class));
    }

    @Test
    @DisplayName("投递失败：回写 PENDING 交回重投权（不是留在 IN_PROGRESS，也不是 SENT）")
    void publishFailureReleasesClaimForNextRound() {
        OutboxEvent row = pendingRow(7L, 1);
        givenCandidates(row);
        givenClaim(row, 1);
        doThrow(new AmqpException("broker 掉了"))
                .when(rabbitTemplate).send(anyString(), anyString(), any(Message.class));

        producer.sweepOnce();

        verify(repository, never()).markSent(any(), any(), any(), any());
        verify(repository).releaseAfterFailedPublish(eq(7L),
                eq(OutboxEvent.OutboxStatus.IN_PROGRESS),
                eq(OutboxEvent.OutboxStatus.PENDING), eq(2), anyString());
    }

    @Test
    @DisplayName("投递失败且已达重试上限：置 FAILED 供人工介入")
    void publishFailureOverRetryLimitMarksFailed() {
        OutboxEvent row = pendingRow(8L, 4); // 本次是第 5 次尝试
        givenCandidates(row);
        givenClaim(row, 1);
        doThrow(new AmqpException("broker 掉了"))
                .when(rabbitTemplate).send(anyString(), anyString(), any(Message.class));

        producer.sweepOnce();

        verify(repository).releaseAfterFailedPublish(eq(8L),
                eq(OutboxEvent.OutboxStatus.IN_PROGRESS),
                eq(OutboxEvent.OutboxStatus.FAILED), eq(5), anyString());
    }

    @Test
    @DisplayName("每轮先回收超时 IN_PROGRESS（崩溃实例留下的僵尸认领）")
    void staleClaimsAreReclaimedBeforePublishing() {
        givenCandidates();

        producer.sweepOnce();

        verify(repository).reclaimStaleClaims(eq(OutboxEvent.OutboxStatus.IN_PROGRESS),
                eq(OutboxEvent.OutboxStatus.PENDING), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("拿不到分布式 sweep 锁（别的实例在扫）：本轮不查库、不投递、不解自己的锁")
    void sweepSkippedWhenAnotherInstanceHoldsTheLock() throws Exception {
        when(lock.tryLock(anyLong(), any(TimeUnit.class))).thenReturn(false);

        producer.compensatePendingEvents();

        verify(repository, never()).findTop100ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                any(), any());
        verify(rabbitTemplate, never()).send(anyString(), anyString(), any(Message.class));
        // 没拿到锁就不能 unlock，否则会误释放别的实例持有的锁（FIN-00061）
        verify(lock, never()).unlock();
    }

    @Test
    @DisplayName("拿到锁：正常扫描，并在 finally 释放锁（FIN-00061）")
    void sweepReleasesTheLockWhenDone() throws Exception {
        OutboxEvent row = pendingRow(10L, 0);
        givenCandidates(row);
        givenClaim(row, 1);

        producer.compensatePendingEvents();

        verify(lock).unlock();
        verify(rabbitTemplate, times(1)).send(anyString(), anyString(), any(Message.class));
    }

    @Test
    @DisplayName("MQ 或仓库未装配时补偿任务直接退出：不抢锁、不查库")
    void noRabbitTemplateShortCircuits() throws Exception {
        ReflectionTestUtils.setField(producer, "rabbitTemplate", null);

        producer.compensatePendingEvents();

        verify(lock, never()).tryLock(anyLong(), any(TimeUnit.class));
        verify(repository, never()).findTop100ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                any(), any());
    }
}
