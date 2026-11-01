package com.campuslove.api.mq;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * F-08（第五轮审查）：注销必须是终态 —— 后台消费者不得在主体注销之后再往墓碑 user_id 上追加行。
 *
 * <p><b>缺陷基线</b>：{@code AccountErasureService} 的类注释自己写明「outbox 补偿投递 +
 * {@code NotificationConsumer} 确实可能在注销之后再补出一条通知行」，给出的应对是「可重跑」。
 * 但重跑没有触发者：账号已 {@code deactivated}、token 已吊销，主体再也调不到任何接口
 * （注销接口本身也要 token），所以这条残留是<b>永久</b>的 ⇒「清单执行完 = 数据已消灭」
 * 在时间轴上不成立。同形缺陷有三处：{@code NotificationConsumer}、{@code MatchEventConsumer}、
 * {@code CheckInEventConsumer} 的落库段都只按 {@code message.userId} 直接 INSERT。</p>
 *
 * <p><b>本门钉住的判点</b>（每个消费者各两条，一负一正）：</p>
 * <ol>
 *   <li>接收者 {@code status=deactivated} ⇒ 一条 {@code save} 都不许发生，且方法正常返回
 *       （正常返回 = ack，坏消息不会白白进重试/死信）；</li>
 *   <li>接收者 {@code status=active} ⇒ 通知照常落库 —— 防止「一律不写」这种假修好把门蒙绿；</li>
 *   <li>{@code status=disabled}（管理员禁用，可逆）<b>不算</b>注销终态，仍然落库
 *       （判点口径只用 {@link User#isErasedSubject()}，不扩大到 {@code isDisabled()}）。</li>
 * </ol>
 *
 * <p><b>可证伪性</b>：①摘掉任一消费者的短路（该负例红）；②把短路条件写成
 * {@code findById(...).isEmpty()} 之类「一律拦」的形态（该正例红）；
 * ③把条件换成 {@code isDisabled()}（disabled 正例红）。三条都在同一个类里，见 §交付报告的反向变异。</p>
 *
 * <p><b>本机判不出</b>：真实 broker 下的重投时序（outbox 每 30s 补偿）需要 RabbitMQ + 真库；
 * 本类证的是「落库段前的短路 + ack」这段代码事实，端到端重投未验证。</p>
 */
@DisplayName("F-08：注销后后台消费者不得复活主体数据（三个消费者）")
class ErasedSubjectBackgroundWriteTest {

    private static final long ERASED_USER = 9001L;
    private static final long ACTIVE_USER = 9002L;
    private static final long DISABLED_USER = 9003L;
    private static final Instant EVENT_TIME = Instant.parse("2026-11-01T08:00:00Z");

    private NotificationRepository notificationRepository;
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        userRepository = mock(UserRepository.class);
        when(userRepository.findById(ERASED_USER))
                .thenReturn(Optional.of(user(ERASED_USER, "deactivated")));
        when(userRepository.findById(ACTIVE_USER))
                .thenReturn(Optional.of(user(ACTIVE_USER, "active")));
        when(userRepository.findById(DISABLED_USER))
                .thenReturn(Optional.of(user(DISABLED_USER, "disabled")));
    }

    private static User user(long id, String status) {
        User user = new User();
        user.setId(id);
        user.setStatus(status);
        user.setOpenid("it-" + id);
        return user;
    }

    /** 统计 mock 上真实发生的 {@code save(Notification)} 调用次数（正控用）。 */
    private long savedCount() {
        return org.mockito.Mockito.mockingDetails(notificationRepository).getInvocations().stream()
                .filter(invocation -> "save".equals(invocation.getMethod().getName()))
                .count();
    }

    // ---- NotificationConsumer ----

    @Test
    @DisplayName("站内通知：已注销接收者 ⇒ 不写 notifications 且正常 ack")
    void notificationConsumer_dropsErasedReceiverAndAcks() {
        NotificationConsumer consumer = new NotificationConsumer();
        ReflectionTestUtils.setField(consumer, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(consumer, "userRepository", userRepository);

        consumer.handleNotification(notification(ERASED_USER));

        verify(notificationRepository, never()).save(any(Notification.class));

        // 正控：同一消费者、同一消息形状，换成活跃接收者必须照常落库
        consumer.handleNotification(notification(ACTIVE_USER));
        assertEquals(1, savedCount(), "活跃接收者的通知必须仍然落库（短路不得扩大成「一律不写」）");
    }

    @Test
    @DisplayName("站内通知：disabled（可逆禁用）不算注销终态，仍照常落库")
    void notificationConsumer_stillWritesForDisabledUser() {
        NotificationConsumer consumer = new NotificationConsumer();
        ReflectionTestUtils.setField(consumer, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(consumer, "userRepository", userRepository);

        consumer.handleNotification(notification(DISABLED_USER));

        assertEquals(1, savedCount(),
                "判据必须是 status=deactivated（注销终态），不能顺手把 disabled 也拦掉");
    }

    private static NotificationMessage notification(long userId) {
        NotificationMessage message = new NotificationMessage(
                userId, "like", "有人喜欢了你", "有位同学对你点了喜欢", EVENT_TIME);
        message.setEventId("evt-" + userId + "-" + System.nanoTime());
        return message;
    }

    // ---- MatchEventConsumer ----

    @Test
    @DisplayName("匹配/喜欢事件：已注销接收者 ⇒ 不写 notifications；活跃方照常写")
    void matchEventConsumer_dropsErasedReceiver() {
        MatchEventConsumer consumer = new MatchEventConsumer();
        ReflectionTestUtils.setField(consumer, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(consumer, "userRepository", userRepository);

        // 发起者活跃、接收者已注销 ⇒ 一条都不写
        consumer.handleMatchEvent(new MatchEventMessage(ACTIVE_USER, ERASED_USER, "like", EVENT_TIME));
        verify(notificationRepository, never()).save(any(Notification.class));

        // 正控：接收者换成活跃用户 ⇒ 必须写一条
        consumer.handleMatchEvent(new MatchEventMessage(ERASED_USER, ACTIVE_USER, "like", EVENT_TIME));
        assertEquals(1, savedCount(),
                "活跃接收者仍应收到喜欢通知（短路只针对已注销主体）");
    }

    @Test
    @DisplayName("互相匹配事件：只给已注销的那一方丢弃，另一方照常落库")
    void matchEventConsumer_mutualMatchOnlyDropsErasedSide() {
        MatchEventConsumer consumer = new MatchEventConsumer();
        ReflectionTestUtils.setField(consumer, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(consumer, "userRepository", userRepository);

        // match 事件会 persistNotification 两次（双方各一条）：一方注销、一方活跃 ⇒ 恰好 1 条
        consumer.handleMatchEvent(new MatchEventMessage(ERASED_USER, ACTIVE_USER, "match", EVENT_TIME));

        assertEquals(1, savedCount(),
                "双方通知必须按接收者逐个判定：注销方丢弃、活跃方保留");
    }

    // ---- CheckInEventConsumer ----

    @Test
    @DisplayName("签到事件：已注销主体 ⇒ 不写 notifications；活跃主体照常写")
    void checkInEventConsumer_dropsErasedSubject() {
        CheckInEventConsumer consumer = new CheckInEventConsumer();
        ReflectionTestUtils.setField(consumer, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(consumer, "userRepository", userRepository);

        consumer.handleCheckInEvent(new CheckInEventMessage(ERASED_USER, 3, 10, EVENT_TIME));
        verify(notificationRepository, never()).save(any(Notification.class));

        consumer.handleCheckInEvent(new CheckInEventMessage(ACTIVE_USER, 3, 10, EVENT_TIME));
        assertEquals(1, savedCount(), "活跃用户的签到通知必须照常落库");
    }
}
