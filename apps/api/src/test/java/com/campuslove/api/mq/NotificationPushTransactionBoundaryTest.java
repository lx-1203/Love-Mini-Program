package com.campuslove.api.mq;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.User;
import com.campuslove.api.growth.WeChatPushService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.TransientDataAccessResourceException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * P1（2026-10-31）：微信订阅消息外呼与数据库事务边界。
 *
 * <p><b>缺陷</b>：{@code NotificationConsumer.handleNotification} 带着方法级
 * {@code @Transactional}，而它调用的 {@link WeChatPushService#sendSubscribeMessage}
 * 是一次打到微信的 HTTP 调用。于是每条通知都是「持着一条 Hikari 连接 +
 * notifications 写入，等一个不受我们控制的第三方接口」。更糟的是推送失败会
 * <b>连带回滚已经写好的通知行</b>——站内通知凭空消失。</p>
 *
 * <p><b>判点是运行期事实，不是代码长相</b>：用<b>真的</b>
 * {@link RecordingTxManager}（真继承 AbstractPlatformTransactionManager，
 * 口径同 {@code village/ContentSecCheckTransactionBoundaryTest}）驱动
 * {@code TransactionTemplate}，并把 push / tx-begin / save / tx-commit 等按发生顺序
 * 记进一条事件列表；同时记录「外呼那一刻」与「落库那一刻」线程上
 * {@code isActualTransactionActive()} 的真值。因此
 * 「推送必须在事务外」与「落库必须在事务内」都能被逐字断言。</p>
 *
 * <p><b>正控（关键，否则 false 是空读）</b>：同一根线程在 {@code save} 那一刻必须真的
 * 处于活动事务内。若落库其实根本没进事务，那「推送时没有事务」这个断言毫无意义。</p>
 *
 * <p><b>外层事务用例</b>：调用方（或将来某个 {@code @Transactional} 的委托层）已经开着
 * 事务时，内层 {@code REQUIRED} 会「加入」它，只把外呼改成编程式事务治不好这个病——
 * 必须用 {@code PROPAGATION_NOT_SUPPORTED} 把外层事务<b>挂起</b>。该用例断言
 * push 恰好夹在 tx-suspend 与 tx-resume 之间，且全程只 commit 一次。</p>
 *
 * <p>可证伪性：①把 {@code @Transactional} 加回 handleNotification（反射用例红）；
 * ②把推送挪回事务内 / 去掉 suspendingTemplate（push 的 tx 标志与事件序列双红）；
 * ③把落库挪出 TransactionTemplate（正控用例红）。</p>
 */
@DisplayName("NotificationConsumer - 微信推送外呼与事务边界")
class NotificationPushTransactionBoundaryTest {

    private static final long USER_ID = 9001L;
    private static final String OPEN_ID = "o-boundary-test";
    private static final String TEMPLATE_ID = "TPL-boundary";

    private List<String> events;
    /** 外呼（调微信）那一刻线程上是否有活动事务——必须全为 false。 */
    private List<Boolean> pushHappenedInsideTransaction;
    /** 正控：落库那一刻线程上必须有活动事务，否则上面的 false 只是「根本没事务」。 */
    private List<Boolean> writeHappenedInsideTransaction;

    private NotificationRepository notificationRepository;
    private UserRepository userRepository;
    private WeChatPushService weChatPushService;
    private RecordingTxManager txManager;
    private NotificationConsumer consumer;

    @BeforeEach
    void setUp() {
        events = new ArrayList<>();
        pushHappenedInsideTransaction = new ArrayList<>();
        writeHappenedInsideTransaction = new ArrayList<>();

        txManager = new RecordingTxManager(events);
        consumer = new NotificationConsumer(txManager);

        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(UserRepository.class);
        weChatPushService = mock(WeChatPushService.class);

        User user = new User();
        user.setId(USER_ID);
        user.setOpenid(OPEN_ID);
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(user));
        when(weChatPushService.getSocialDigestTemplateId()).thenReturn(TEMPLATE_ID);
        when(weChatPushService.sendSubscribeMessage(any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    pushHappenedInsideTransaction.add(
                            TransactionSynchronizationManager.isActualTransactionActive());
                    events.add("wechat-push");
                    return true;
                });
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            writeHappenedInsideTransaction.add(
                    TransactionSynchronizationManager.isActualTransactionActive());
            events.add("save-notification");
            return invocation.getArgument(0);
        });

        ReflectionTestUtils.setField(consumer, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(consumer, "userRepository", userRepository);
        ReflectionTestUtils.setField(consumer, "weChatPushService", weChatPushService);
        // idempotencyStore 保持 null：本门只测事务边界，去重另有用例钉住
    }

    private NotificationMessage message(String eventId) {
        NotificationMessage message = new NotificationMessage(
                USER_ID, "like", "有人喜欢了你", "有位同学对你点了喜欢", Instant.now());
        message.setEventId(eventId);
        message.setSourceUserId(777L);
        return message;
    }

    @Test
    @DisplayName("推送发生在事务之外，落库发生在事务之内（正控成立）")
    void weChatPushRunsOutsideTransactionWhileDbWriteRunsInside() {
        consumer.handleNotification(message("evt-boundary-1"));

        assertEquals(List.of("tx-begin", "save-notification", "tx-commit", "wechat-push"), events,
                "顺序必须是「短事务落库并提交 → 事务外推微信」；实际: " + events);
        assertFalse(pushHappenedInsideTransaction.isEmpty(),
                "桩微信服务一次都没被调用，本门等于空转（必须能观察到外呼）");
        assertTrue(pushHappenedInsideTransaction.stream().noneMatch(Boolean::booleanValue),
                "调用微信订阅消息时线程上不允许有活动事务，实际: " + pushHappenedInsideTransaction);
        // 正控：同一根线程在落库那一刻必须真的处于事务内，否则上面的 false 是空读。
        assertEquals(List.of(Boolean.TRUE), List.copyOf(writeHappenedInsideTransaction),
                "notificationRepository.save 必须在活动事务内执行，实际: "
                        + writeHappenedInsideTransaction);
    }

    @Test
    @DisplayName("调用方带外层事务时：外呼期间外层事务被挂起，落库仍在那个事务里")
    void outerTransactionIsSuspendedAroundWeChatCall() {
        // 复现真实风险路径：任何 @Transactional 的委托层调进来时，线程上已有活动事务。
        // 只把内层改成编程式事务治不好——REQUIRED 会「加入」外层事务，微信外呼照样在事务里。
        TransactionTemplate outer = new TransactionTemplate(txManager);

        outer.execute(status -> {
            consumer.handleNotification(message("evt-boundary-2"));
            return null;
        });

        assertEquals(List.of(Boolean.FALSE), List.copyOf(pushHappenedInsideTransaction),
                "即使调用方开了事务，调微信那一刻也不允许有活动事务，实际: "
                        + pushHappenedInsideTransaction);
        assertEquals(List.of(Boolean.TRUE), List.copyOf(writeHappenedInsideTransaction),
                "落库必须在事务内（原子性与改造前一致），实际: " + writeHappenedInsideTransaction);
        int suspendAt = events.indexOf("tx-suspend");
        int pushAt = events.indexOf("wechat-push");
        int resumeAt = events.indexOf("tx-resume");
        assertTrue(suspendAt >= 0 && pushAt > suspendAt && resumeAt > pushAt,
                "外呼必须夹在 suspend 与 resume 之间，实际序列: " + events);
        assertEquals(1, events.stream().filter("tx-commit"::equals).count(),
                "内层模板应加入外层事务，只允许一次真正提交，实际序列: " + events);
    }

    @Test
    @DisplayName("推送失败不回滚已提交的通知行（也不重投）")
    void pushFailureDoesNotRollBackPersistedNotification() {
        when(weChatPushService.sendSubscribeMessage(any(), any(), any(), any()))
                .thenAnswer(invocation -> {
                    events.add("wechat-push");
                    throw new IllegalStateException("微信 5xx / 用户未订阅");
                });

        consumer.handleNotification(message("evt-boundary-3"));

        assertTrue(events.contains("save-notification"), "通知必须照常落库");
        assertFalse(events.contains("tx-rollback"),
                "推送失败绝不允许回滚已落库的通知行，实际序列: " + events);
        assertEquals(1, events.stream().filter("tx-commit"::equals).count(),
                "落库事务应正常提交一次，实际序列: " + events);
    }

    @Test
    @DisplayName("落库失败必须抛出并回滚（不再被 catch 吞掉，重试/死信才有机会生效）")
    void dbFailurePropagatesOutOfTransaction() {
        when(notificationRepository.save(any(Notification.class)))
                .thenThrow(new TransientDataAccessResourceException("DB 抖动"));

        assertThrows(TransientDataAccessResourceException.class,
                () -> consumer.handleNotification(message("evt-boundary-4")));

        assertTrue(events.contains("tx-rollback"),
                "落库失败应回滚本段事务，实际序列: " + events);
        assertFalse(events.contains("wechat-push"),
                "落库没成功之前不允许推微信（否则重试会重复烧一次性订阅配额）：" + events);
    }

    @Test
    @DisplayName("handleNotification 不得再声明 @Transactional（边界只能由 TransactionTemplate 表达）")
    void listenerMustNotBeAnnotatedTransactional() {
        for (Method method : NotificationConsumer.class.getDeclaredMethods()) {
            if (!"handleNotification".equals(method.getName())) {
                continue;
            }
            assertFalse(method.isAnnotationPresent(Transactional.class),
                    "handleNotification 重新带上 @Transactional 会把微信外呼圈回事务里："
                            + java.util.Arrays.toString(method.getParameterTypes()));
        }
        assertFalse(NotificationConsumer.class.isAnnotationPresent(Transactional.class),
                "类级 @Transactional 会让整条消费链路回到事务内");
    }

    @Test
    @DisplayName("事务管理器未装配时（直连构造）不允许伪造「事务已生效」")
    void noOpManagerDoesNotPretendATransactionIsActive() {
        NotificationConsumer legacy = new NotificationConsumer();
        ReflectionTestUtils.setField(legacy, "notificationRepository", notificationRepository);
        ReflectionTestUtils.setField(legacy, "userRepository", userRepository);
        ReflectionTestUtils.setField(legacy, "weChatPushService", weChatPushService);
        writeHappenedInsideTransaction.clear();
        pushHappenedInsideTransaction.clear();

        legacy.handleNotification(message("evt-boundary-5"));

        assertEquals(List.of(Boolean.FALSE), List.copyOf(writeHappenedInsideTransaction),
                "直连构造的事务桩必须显式承认「没开事务」，否则外呼出事务的判点会在别的用例里假绿");
        assertEquals(List.of(Boolean.FALSE), List.copyOf(pushHappenedInsideTransaction));
    }

    @Test
    @DisplayName("templateId 未配置：跳过推送但通知照常落库（FIN-00048 可见性）")
    void missingTemplateIdSkipsPushWithoutAffectingPersistence() {
        when(weChatPushService.getSocialDigestTemplateId()).thenReturn("  ");

        consumer.handleNotification(message("evt-boundary-6"));

        assertTrue(events.contains("save-notification"), "通知仍要落库");
        assertFalse(events.contains("wechat-push"), "无模板 ID 时不允许调用微信接口");
        verifyNoPushAttempt();
    }

    /** 直接断言从未尝试过发送（避免只依赖事件列表）。 */
    private void verifyNoPushAttempt() {
        org.mockito.Mockito.verify(weChatPushService, never())
                .sendSubscribeMessage(any(), any(), any(), any());
        assertTrue(pushHappenedInsideTransaction.isEmpty());
    }
}
