package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipOrder;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipOrderRepository;
import com.campuslove.api.wxpay.WxPayApiException;
import com.campuslove.api.wxpay.WxPayJsapiService;
import com.campuslove.api.wxpay.WxPayProperties;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 支付链路的「外部调用必须在事务之外」边界测试（2026-10-29 支付事务改造）。
 *
 * <p>判点不是「代码里有没有 @Transactional」这种形式，而是运行期事实：
 * 调微信那一刻，线程上不允许有活动事务。因此这里用<b>真的</b>
 * {@link AbstractPlatformTransactionManager} 子类（不是 Mockito 假对象）驱动
 * {@link TransactionTemplate}，使 {@link TransactionSynchronizationManager}
 * 的线程状态与生产一致；同时把 begin/commit/save/微信调用按发生顺序记进一条列表，
 * 于是「先提交 PENDING、再调微信、再提交 PAYING」可以被逐字断言。</p>
 *
 * <p>可证伪性：若把 {@code @Transactional} 加回 createOrder / initiateRefund /
 * closeExpiredOrders（让微信调用回到事务内），或把 tx1 的提交挪到外部调用之后，
 * {@code isActualTransactionActive} 断言与事件序列会立刻变红。</p>
 */
@DisplayName("VipOrderService - 微信调用与事务边界")
class VipOrderTransactionBoundaryTest {

    private static final String ORDER_NO = "VIP20261029120000ABCD0001";

    /** 与生产同一套事务机制，只是把 begin/commit 记下来 */
    private static final class RecordingTxManager extends AbstractPlatformTransactionManager {
        private final List<String> events;

        RecordingTxManager(List<String> events) {
            this.events = events;
        }

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            events.add("tx-begin");
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            events.add("tx-commit");
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            events.add("tx-rollback");
        }
    }

    private List<String> events;
    private VipOrderRepository vipOrderRepository;
    private UserRepository userRepository;
    private WxPayJsapiService wxPayJsapiService;
    private VipOrderService service;

    /** 模拟表里那一行：save 写入后由 findById / findByOrderNo 回读 */
    private VipOrder stored;

    @BeforeEach
    void setUp() {
        events = Collections.synchronizedList(new ArrayList<>());
        vipOrderRepository = mock(VipOrderRepository.class);
        userRepository = mock(UserRepository.class);
        wxPayJsapiService = mock(WxPayJsapiService.class);
        WxPayProperties wxPayProperties = new WxPayProperties();
        wxPayProperties.setEnabled(true);

        service = new VipOrderService(vipOrderRepository, mock(BillingService.class),
                mock(PaymentCallbackLogRepository.class), new VipPlanCatalog(),
                new RecordingTxManager(events));
        ReflectionTestUtils.setField(service, "wxPayProperties", wxPayProperties);
        ReflectionTestUtils.setField(service, "wxPayJsapiService", wxPayJsapiService);
        ReflectionTestUtils.setField(service, "userRepository", userRepository);
        stored = null;
    }

    /** save 打点 + 按 JPA 语义补主键 */
    private void stubRepositorySave() {
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> {
            VipOrder o = inv.getArgument(0);
            if (o.getId() == null) {
                o.setId(9001L);
            }
            stored = o;
            events.add("save:" + o.getStatus());
            return o;
        });
    }

    private static User userWithOpenid() {
        User user = new User();
        user.setId(100L);
        user.setOpenid("oWx-test-openid");
        return user;
    }

    private static VipOrder orderIn(String status, String orderNo) {
        VipOrder order = new VipOrder();
        order.setId(9001L);
        order.setOrderNo(orderNo);
        order.setUserId(100L);
        order.setPlanId("monthly");
        order.setPlanName("月卡");
        order.setPlanDays(30);
        order.setAmountCents(1800);
        order.setStatus(status);
        return order;
    }

    /** 核心判点：调微信时线程上不能有活动事务 */
    private void assertNoTransactionActive(String label) {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive(),
                "微信调用「" + label + "」必须落在事务之外，否则外部耗时计入事务并长时间持有行锁");
    }

    @Nested
    @DisplayName("下单 createOrder")
    class CreateOrder {

        @Test
        @DisplayName("序列：提交 PENDING → 调微信（无事务）→ 提交 PAYING → 出签名参数")
        void shouldCommitPendingBeforeCallingWechat() {
            stubRepositorySave();
            when(userRepository.findById(anyLong())).thenReturn(Optional.of(userWithOpenid()));
            when(vipOrderRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(stored));
            when(wxPayJsapiService.createJsapiOrder(any(WxPayJsapiService.CreateOrderCommand.class)))
                    .thenAnswer(inv -> {
                        assertNoTransactionActive("统一下单");
                        WxPayJsapiService.CreateOrderCommand cmd = inv.getArgument(0);
                        // 存量缺陷回归点：LocalDateTime 直接按 XXX 格式化会抛
                        // UnsupportedTemporalTypeException，导致所有下单在调微信前就 500
                        assertTrue(cmd.timeExpire() != null
                                        && cmd.timeExpire().matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}"),
                                "time_expire 必须是带时区偏移的 RFC 3339，当前=" + cmd.timeExpire());
                        events.add("wx-createOrder");
                        return new WxPayJsapiService.PrepayResult("wx_prepay_id_1");
                    });
            when(wxPayJsapiService.buildJsapiPayParams(anyString(), anyString())).thenAnswer(inv -> {
                assertNoTransactionActive("签名参数");
                events.add("wx-buildParams");
                return new WxPayJsapiService.JsapiPayParams(inv.getArgument(0), "wxapp", "1700000000",
                        "nonce", "prepay_id=wx_prepay_id_1", "RSA", "sig");
            });

            VipOrderService.OrderCreatedView view = service.createOrder(100L, "monthly");

            assertTrue(view.packageValue().startsWith("prepay_id="), "返回值应带微信要求的 prepay_id 包体");
            assertEquals(List.of(
                    "tx-begin", "save:PENDING", "tx-commit",
                    "wx-createOrder",
                    "tx-begin", "save:PAYING", "tx-commit",
                    "wx-buildParams"), events, "PENDING 必须先提交；微信调用不得在任何事务内");
            assertEquals(VipOrder.STATUS_PAYING, stored.getStatus());
            assertEquals("wx_prepay_id_1", stored.getPrepayId());
        }

        @Test
        @DisplayName("微信下单失败：PENDING 已提交，随后独立事务置 FAILED（留下可审计终态）")
        void shouldPersistFailedWhenWechatRejects() {
            stubRepositorySave();
            when(userRepository.findById(anyLong())).thenReturn(Optional.of(userWithOpenid()));
            when(vipOrderRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(stored));
            when(wxPayJsapiService.createJsapiOrder(any(WxPayJsapiService.CreateOrderCommand.class)))
                    .thenAnswer(inv -> {
                        assertNoTransactionActive("统一下单");
                        events.add("wx-createOrder");
                        throw new WxPayApiException(400, "PARAM_ERROR", "签名错误");
                    });

            assertThrows(IllegalArgumentException.class, () -> service.createOrder(100L, "monthly"));

            assertEquals(List.of(
                    "tx-begin", "save:PENDING", "tx-commit",
                    "wx-createOrder",
                    "tx-begin", "save:FAILED", "tx-commit"), events);
        }

        @Test
        @DisplayName("竞态保护：下单期间回调已置 SUCCESS ⇒ 放弃 PAYING 迁移，不覆盖回调结论")
        void shouldNotOverwriteStatusAdvancedByCallback() {
            stubRepositorySave();
            when(userRepository.findById(anyLong())).thenReturn(Optional.of(userWithOpenid()));
            VipOrder callbackAdvanced = orderIn(VipOrder.STATUS_SUCCESS, ORDER_NO);
            // tx1 之后库里状态已被回调推到 SUCCESS：回读时返回另一份实体
            when(vipOrderRepository.findById(anyLong())).thenReturn(Optional.of(callbackAdvanced));
            when(wxPayJsapiService.createJsapiOrder(any(WxPayJsapiService.CreateOrderCommand.class)))
                    .thenAnswer(inv -> {
                        assertNoTransactionActive("统一下单");
                        events.add("wx-createOrder");
                        return new WxPayJsapiService.PrepayResult("wx_prepay_id_1");
                    });
            when(wxPayJsapiService.buildJsapiPayParams(anyString(), anyString()))
                    .thenReturn(new WxPayJsapiService.JsapiPayParams(ORDER_NO, "wxapp", "1700000000",
                            "nonce", "prepay_id=wx_prepay_id_1", "RSA", "sig"));

            service.createOrder(100L, "monthly");

            // tx2 照常开/关，但一个字段都不写：回调写下的 SUCCESS 不能被下单流程回退
            assertEquals(List.of(
                    "tx-begin", "save:PENDING", "tx-commit",
                    "wx-createOrder",
                    "tx-begin", "tx-commit"), events, "已非 PENDING 的订单不得被下单流程再次写库");
            assertNull(callbackAdvanced.getPrepayId(), "放弃迁移时不得回填 prepay_id");
            assertEquals(VipOrder.STATUS_SUCCESS, callbackAdvanced.getStatus());
        }
    }

    @Nested
    @DisplayName("退款 initiateRefund")
    class Refund {

        @Test
        @DisplayName("微信退款在事务外；受理成功后单个短事务写 REFUNDING + refundId")
        void shouldCallWechatOutsideTransactionThenCommitOnce() {
            stubRepositorySave();
            VipOrder dbOrder = orderIn(VipOrder.STATUS_SUCCESS, ORDER_NO);
            stored = dbOrder;
            when(vipOrderRepository.findByOrderNo(anyString())).thenReturn(Optional.of(dbOrder));
            when(wxPayJsapiService.createRefund(any(WxPayJsapiService.RefundCommand.class)))
                    .thenAnswer(inv -> {
                        assertNoTransactionActive("退款受理");
                        events.add("wx-createRefund");
                        return new WxPayJsapiService.RefundResult("50000000RN1", "RF" + ORDER_NO, "PROCESSING");
                    });

            VipOrderService.RefundInitiatedView view = service.initiateRefund(ORDER_NO, "客诉退款");

            assertEquals(List.of("wx-createRefund", "tx-begin", "save:REFUNDING", "tx-commit"), events);
            assertEquals(VipOrder.STATUS_REFUNDING, view.status());
            assertEquals("RF" + ORDER_NO, view.outRefundNo(), "商户退款单号必须是 RF+orderNo（幂等重试键）");
            assertEquals(1800, view.refundCents());
            assertEquals("50000000RN1", dbOrder.getRefundId());
        }

        @Test
        @DisplayName("微信拒绝退款：一次写库都没有，订单仍是 SUCCESS（可直接重试）")
        void shouldNotWriteWhenWechatRejectsRefund() {
            when(vipOrderRepository.findByOrderNo(anyString()))
                    .thenReturn(Optional.of(orderIn(VipOrder.STATUS_SUCCESS, ORDER_NO)));
            when(wxPayJsapiService.createRefund(any(WxPayJsapiService.RefundCommand.class)))
                    .thenAnswer(inv -> {
                        assertNoTransactionActive("退款受理");
                        events.add("wx-createRefund");
                        throw new WxPayApiException(400, "NOT_ENOUGH", "商户余额不足");
                    });

            assertThrows(WxPayApiException.class, () -> service.initiateRefund(ORDER_NO, null));

            assertEquals(List.of("wx-createRefund"), events);
            verify(vipOrderRepository, never()).save(any(VipOrder.class));
        }
    }

    @Nested
    @DisplayName("超时关单 closeExpiredOrders")
    class CloseExpired {

        @Test
        @DisplayName("每单一个短事务：微信关单在事务外，两单各自 begin/commit")
        void shouldUsePerOrderTransaction() {
            stubRepositorySave();
            VipOrder a = orderIn(VipOrder.STATUS_PAYING, ORDER_NO + "A");
            VipOrder b = orderIn(VipOrder.STATUS_PAYING, ORDER_NO + "B");
            when(vipOrderRepository.findByStatusInAndExpireAtBefore(any(), any())).thenReturn(List.of(a, b));
            when(vipOrderRepository.findByOrderNo(anyString()))
                    .thenAnswer(inv -> Optional.of((ORDER_NO + "A").equals(inv.getArgument(0)) ? a : b));
            // closeOrder 返回 void，桩必须走 doAnswer
            org.mockito.Mockito.doAnswer(inv -> {
                assertNoTransactionActive("关单");
                events.add("wx-close:" + inv.getArgument(0));
                return null;
            }).when(wxPayJsapiService).closeOrder(anyString());

            int closed = service.closeExpiredOrders();

            assertEquals(2, closed);
            assertEquals(List.of(
                    "wx-close:" + ORDER_NO + "A", "tx-begin", "save:CLOSED", "tx-commit",
                    "wx-close:" + ORDER_NO + "B", "tx-begin", "save:CLOSED", "tx-commit"), events,
                    "关单不得共用一个长事务，否则一单失败会把整批回滚、下轮重复调微信");
        }

        @Test
        @DisplayName("微信关单失败（可能刚支付成功）：跳过该单且不写库，等回调确认")
        void shouldSkipOrderWhenWechatCloseFails() {
            stubRepositorySave();
            VipOrder a = orderIn(VipOrder.STATUS_PAYING, ORDER_NO);
            when(vipOrderRepository.findByStatusInAndExpireAtBefore(any(), any())).thenReturn(List.of(a));
            when(vipOrderRepository.findByOrderNo(anyString())).thenReturn(Optional.of(a));
            org.mockito.Mockito.doAnswer(inv -> {
                assertNoTransactionActive("关单");
                events.add("wx-close");
                throw new WxPayApiException(400, "ORDERPAID", "订单已支付");
            }).when(wxPayJsapiService).closeOrder(anyString());

            assertEquals(0, service.closeExpiredOrders());
            assertEquals(List.of("wx-close"), events);
            verify(vipOrderRepository, never()).save(any(VipOrder.class));
        }
    }
}
