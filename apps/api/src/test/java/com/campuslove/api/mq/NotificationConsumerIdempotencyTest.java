package com.campuslove.api.mq;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.User;
import com.campuslove.api.growth.WeChatPushService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.dao.TransientDataAccessResourceException;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * P0（2026-10-31）：通知消费幂等——同一条事件投两次，只允许落地一次。
 *
 * <p><b>缺陷</b>：{@code NotificationConsumer.handleNotification} 原先无条件
 * {@code new Notification() + save}，再打一次微信订阅消息。配合「补偿任务跨 JVM
 * 重复投递」（同期修复）与 broker 至少一次语义，同一条通知会被插两行、
 * 订阅消息被发两次——而微信订阅消息是<b>一次性配额</b>，重复发等于把用户仅有
 * 的一次推送机会烧掉两次，第二次还会被微信判为未订阅而失败。</p>
 *
 * <p><b>本门钉住的判点</b>：</p>
 * <ol>
 *   <li>同一事件（同 eventId）投两次 ⇒ {@code save} 恰好一次、
 *       {@code sendSubscribeMessage} 恰好一次（配额不被重复消耗）；</li>
 *   <li>处理<b>失败</b> ⇒ 撤销登记并抛出，重试/死信重放仍可执行
 *       （否则「先登记后干活、干活失败」会把重试一起挡死）；</li>
 *   <li>登记键的口径：优先消息自带 eventId；旧消息（滚动发版期间已在队列里）
 *       回退到业务字段派生的自然键；</li>
 *   <li>Redisson 未装配时 fail-open（宁可重复也不丢通知），行为与改造前一致。</li>
 * </ol>
 *
 * <p>可证伪性：①去掉 claim 判断（用例 1 双插，红）；②把 release 删掉
 * （用例 2 的「重试仍能落地」红）；③键改成随机 UUID 之类每次都变
 * （用例 1 与用例 3/4 红）。</p>
 */
@DisplayName("NotificationConsumer - 消费幂等（重复投递只落一条）")
class NotificationConsumerIdempotencyTest {

    private static final long USER_ID = 5001L;
    private static final String OPEN_ID = "o-idempotency";
    private static final String DEDUP_KEY = "evt-idem-42";

    private NotificationRepository notificationRepository;
    private UserRepository userRepository;
    private WeChatPushService weChatPushService;
    private RedissonClient redissonClient;
    private RBucket<String> bucket;
    private ConsumerIdempotencyStore store;
    private NotificationConsumer consumer;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(UserRepository.class);
        weChatPushService = mock(WeChatPushService.class);
        redissonClient = mock(RedissonClient.class);
        bucket = mock(RBucket.class);

        User user = new User();
        user.setId(USER_ID);
        user.setOpenid(OPEN_ID);
        when(userRepository.findById(any())).thenReturn(Optional.of(user));
        when(weChatPushService.getSocialDigestTemplateId()).thenReturn("TPL-1");
        when(weChatPushService.sendSubscribeMessage(any(), any(), any(), any())).thenReturn(true);
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // 默认：第一次投递能抢到登记，后续抢不到（SETNX 语义）
        doReturn(bucket).when(redissonClient).getBucket(anyString());
        when(bucket.setIfAbsent(any(), any(Duration.class))).thenReturn(true, false);

        store = new ConsumerIdempotencyStore();
        ReflectionTestUtils.setField(store, "redissonClient", redissonClient);

        // 幂等门与事务边界无关，用直连构造（不开事务）
        consumer = new NotificationConsumer();
        ReflectionTestUtils.setField(consumer, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(consumer, "userRepository", userRepository);
        ReflectionTestUtils.setField(consumer, "weChatPushService", weChatPushService);
        ReflectionTestUtils.setField(consumer, "idempotencyStore", store);
    }

    private NotificationMessage message(String eventId) {
        NotificationMessage message = new NotificationMessage(
                USER_ID, "like", "有人喜欢了你", "有位同学对你点了喜欢",
                Instant.parse("2026-10-31T08:00:00Z"));
        message.setEventId(eventId);
        message.setSourceUserId(999L);
        message.setReferenceId(1234L);
        message.setReferenceType("post");
        return message;
    }

    @Test
    @DisplayName("同一事件投递两次：只插一条通知、只发一次订阅消息")
    void sameEventDeliveredTwiceProducesExactlyOneNotification() {
        consumer.handleNotification(message(DEDUP_KEY));
        consumer.handleNotification(message(DEDUP_KEY));

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(saved.capture());
        assertEqualsOneRow(saved.getValue());

        // 微信订阅消息是一次性配额：重复投递不得再发一次
        verify(weChatPushService, times(1))
                .sendSubscribeMessage(any(), any(), any(), any());
    }

    @Test
    @DisplayName("不同 eventId 的两个事件：各自落地一条（幂等不得误伤真实事件）")
    void distinctEventsAreNotCollapsed() {
        // 放开「第二次抢不到」的默认桩：两个不同键都应能抢到
        when(bucket.setIfAbsent(any(), any(Duration.class))).thenReturn(true);

        consumer.handleNotification(message("evt-A"));
        consumer.handleNotification(message("evt-B"));

        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    @DisplayName("登记键用消息自带的 eventId（口径与 outbox.dedup_key / AMQP message_id 同源）")
    void claimUsesEventIdAsDedupKey() {
        consumer.handleNotification(message(DEDUP_KEY));

        // 显式标注匹配器参数类型：RedissonClient 的 getBucket 有 (String) 与 (PlainOptions)
        // 两个重载，类型推断会歧义
        verify(redissonClient).getBucket(argThat((String key) -> key.endsWith(DEDUP_KEY)));
    }

    @Test
    @DisplayName("旧消息（无 eventId，滚动发版期间已在队列里）回退到业务自然键并仍能去重")
    void legacyMessageWithoutEventIdFallsBackToNaturalKey() {
        consumer.handleNotification(message(null));
        consumer.handleNotification(message(null));

        verify(notificationRepository, times(1)).save(any(Notification.class));
        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(redissonClient, times(2)).getBucket(keyCaptor.capture());
        String key = keyCaptor.getAllValues().get(0);
        assertTrue(key.contains("notif"), "自然键应带业务前缀，实际: " + key);
        assertTrue(key.contains(String.valueOf(USER_ID)), "自然键应含接收者，实际: " + key);
        assertTrue(key.contains("like"), "自然键应含通知类型，实际: " + key);
        // 自然键必须含事件时间戳：否则「同一秒的两次不同互动」会被折叠成丢数据
        assertTrue(key.contains(String.valueOf(Instant.parse("2026-10-31T08:00:00Z").getEpochSecond())),
                "自然键应含 createdAt 秒，实际: " + key);
    }

    @Test
    @DisplayName("处理失败：撤销登记并抛出，重试仍能落地（登记不得挡死重试）")
    void failedDeliveryReleasesClaimSoRetryStillWorks() {
        when(notificationRepository.save(any(Notification.class)))
                .thenThrow(new TransientDataAccessResourceException("DB 抖动"))
                .thenAnswer(invocation -> invocation.getArgument(0));
        // 允许第二次投递再抢到（模拟 release 之后重投）
        when(bucket.setIfAbsent(any(), any(Duration.class))).thenReturn(true);

        assertThrows(TransientDataAccessResourceException.class,
                () -> consumer.handleNotification(message(DEDUP_KEY)));
        // 失败时：既没推微信（配额未消耗），也必须撤销登记，否则重投会被判成重复
        verify(bucket).delete();
        verify(weChatPushService, never()).sendSubscribeMessage(any(), any(), any(), any());

        consumer.handleNotification(message(DEDUP_KEY));
        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    @DisplayName("未知通知类型：拒绝转死信（不再静默 ack 丢事件），且不落库")
    void unknownTypeIsRejectedInsteadOfSilentlyDropped() {
        NotificationMessage message = message(DEDUP_KEY);
        message.setType("emoji-reply");

        assertThrows(AmqpRejectAndDontRequeueException.class,
                () -> consumer.handleNotification(message));

        verify(notificationRepository, never()).save(any(Notification.class));
        // 没做成 ⇒ 撤销登记，人工修复生产端后重放仍可生效
        verify(bucket).delete();
    }

    @Test
    @DisplayName("Redisson 未装配（mock profile）：fail-open，通知照常落地而不是被丢掉")
    void missingRedissonFailsOpenRatherThanDroppingNotifications() {
        ReflectionTestUtils.setField(store, "redissonClient", null);

        consumer.handleNotification(message(DEDUP_KEY));

        // 判重不可用时必须放行：宁可冒重复的风险，也不能把通知判成重复而丢掉
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    private void assertEqualsOneRow(Notification saved) {
        assertTrue(USER_ID == saved.getUserId(),
                "接收者应来自消息 userId 字段，实际: " + saved.getUserId());
    }
}
