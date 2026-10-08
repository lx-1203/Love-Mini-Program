package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.VipOrder;
import com.campuslove.api.monitor.PaymentMetrics;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.VipOrderRepository;
import com.campuslove.api.wxpay.WxPayModels;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * VIP 微信支付订单服务单元测试（2026-10-05 微信支付工程补齐）。
 *
 * <p>覆盖：订单状态机非法迁移拒绝、支付回调幂等（订单已 SUCCESS 直接成功应答）、
 * 金额对账（容差 1 分）、订单不存在拒绝、成功开通写账单（WECHAT + 微信交易单号）、
 * 退款回调状态迁移与 REFUND 账单。</p>
 */
@ExtendWith(MockitoExtension.class)
class VipOrderServiceTest {

    private static final String ORDER_NO = "VIP20261005120000ABCD1234";

    @Mock
    private VipOrderRepository vipOrderRepository;
    @Mock
    private PaymentCallbackLogRepository paymentCallbackLogRepository;

    private BillingService billingService;
    private VipOrderService service;

    @BeforeEach
    void setUp() {
        billingService = mock(BillingService.class);
        service = new VipOrderService(vipOrderRepository, billingService, paymentCallbackLogRepository);
        lenient().when(paymentCallbackLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private VipOrder pendingOrder() {
        VipOrder order = new VipOrder();
        order.setId(1L);
        order.setOrderNo(ORDER_NO);
        order.setUserId(100L);
        order.setPlanId("monthly");
        order.setPlanName("月卡");
        order.setPlanDays(30);
        order.setAmountCents(1800);
        order.setStatus(VipOrder.STATUS_PENDING);
        return order;
    }

    private WxPayModels.WxPayTransaction successTx(Integer total) {
        return new WxPayModels.WxPayTransaction(
                "1900000001", "wxappid", ORDER_NO, "420000WX-TX-1",
                "JSAPI", "SUCCESS", "2026-10-05T12:00:00+08:00",
                new WxPayModels.WxPayTransaction.Amount(total, total, "CNY"));
    }

    /* ==================== 状态机 ==================== */

    @Test
    @DisplayName("状态机：PENDING→SUCCESS 非法迁移拒绝（必须先 PAYING 或直接由回调迁移）")
    void applyTransition_pendingToSuccessRejected() {
        VipOrder order = pendingOrder();
        assertThrows(VipOrderService.IllegalOrderStateException.class,
                () -> service.applyTransition(order, VipOrder.STATUS_SUCCESS));
    }

    @Test
    @DisplayName("状态机：终态（CLOSED）无出边，任何迁移均拒绝")
    void applyTransition_terminalStateRejected() {
        VipOrder order = pendingOrder();
        order.setStatus(VipOrder.STATUS_CLOSED);
        assertThrows(VipOrderService.IllegalOrderStateException.class,
                () -> service.applyTransition(order, VipOrder.STATUS_PAYING));
        assertThrows(VipOrderService.IllegalOrderStateException.class,
                () -> service.applyTransition(order, VipOrder.STATUS_CLOSED));

        order.setStatus(VipOrder.STATUS_REFUNDED);
        assertThrows(VipOrderService.IllegalOrderStateException.class,
                () -> service.applyTransition(order, VipOrder.STATUS_REFUNDING));

        order.setStatus(VipOrder.STATUS_FAILED);
        assertThrows(VipOrderService.IllegalOrderStateException.class,
                () -> service.applyTransition(order, VipOrder.STATUS_SUCCESS));
    }

    @Test
    @DisplayName("状态机：SUCCESS→REFUNDED 非法（必须经 REFUNDING）")
    void applyTransition_successToRefundedRejected() {
        VipOrder order = pendingOrder();
        order.setStatus(VipOrder.STATUS_SUCCESS);
        assertThrows(VipOrderService.IllegalOrderStateException.class,
                () -> service.applyTransition(order, VipOrder.STATUS_REFUNDED));
    }

    @Test
    @DisplayName("状态机：合法迁移路径放行（PENDING→PAYING→SUCCESS→REFUNDING→REFUNDED）")
    void applyTransition_legalPathAccepted() {
        VipOrder order = pendingOrder();
        service.applyTransition(order, VipOrder.STATUS_PAYING);
        service.applyTransition(order, VipOrder.STATUS_SUCCESS);
        service.applyTransition(order, VipOrder.STATUS_REFUNDING);
        service.applyTransition(order, VipOrder.STATUS_REFUNDED);
        assertEquals(VipOrder.STATUS_REFUNDED, order.getStatus());
    }

    /* ==================== 支付回调 ==================== */

    @Test
    @DisplayName("支付回调：订单不存在 → FAIL 且留痕")
    void handlePayNotification_orderNotFoundFails() {
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.empty());

        String result = service.handlePayNotification(successTx(1800), "EV-1", "{}", "{}");

        assertEquals("FAIL", result);
        verify(vipOrderRepository, never()).save(any());
        ArgumentCaptor<com.campuslove.api.entity.PaymentCallbackLog> logCaptor =
                ArgumentCaptor.forClass(com.campuslove.api.entity.PaymentCallbackLog.class);
        verify(paymentCallbackLogRepository).save(logCaptor.capture());
        assertEquals("订单不存在", logCaptor.getValue().getDetail());
    }

    @Test
    @DisplayName("支付回调幂等：订单已 SUCCESS 的重复通知直接成功应答，不重复开通")
    void handlePayNotification_duplicateReturnsSuccessWithoutRegrant() {
        VipOrder order = pendingOrder();
        order.setStatus(VipOrder.STATUS_SUCCESS);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));

        String result = service.handlePayNotification(successTx(1800), "EV-2", "{}", "{}");

        assertEquals("SUCCESS", result);
        verify(billingService, never()).grantVipExpiry(anyLong(), anyInt());
        verify(billingService, never()).createBill(anyLong(), anyString(), anyString(),
                anyInt(), anyInt(), anyString(), anyString(), anyString(), anyString(),
                any(), any(), any());
        verify(vipOrderRepository, never()).save(any());
    }

    @Test
    @DisplayName("支付回调金额对账：回调金额与订单金额差超 1 分 → FAIL")
    void handlePayNotification_amountMismatchFails() {
        VipOrder order = pendingOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));

        // 订单 1800 分，回调 1000 分（差异远超容差 1 分）
        String result = service.handlePayNotification(successTx(1000), "EV-3", "{}", "{}");

        assertEquals("FAIL", result);
        verify(vipOrderRepository, never()).save(any());
        verify(billingService, never()).createBill(anyLong(), anyString(), anyString(),
                anyInt(), anyInt(), anyString(), anyString(), anyString(), anyString(),
                any(), any(), any());
    }

    @Test
    @DisplayName("支付回调金额对账：容差 1 分内视为一致并正常开通")
    void handlePayNotification_amountWithinToleranceSucceeds() {
        VipOrder order = pendingOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        when(billingService.grantVipExpiry(eq(100L), eq(30))).thenReturn(LocalDateTime.now().plusDays(30));

        // 回调 1801 分（差 1 分，容差内）
        String result = service.handlePayNotification(successTx(1801), "EV-4", "{}", "{}");

        assertEquals("SUCCESS", result);
        assertEquals(VipOrder.STATUS_SUCCESS, order.getStatus());
        assertEquals("420000WX-TX-1", order.getWxTransactionId());
    }

    @Test
    @DisplayName("支付回调成功：PENDING 订单迁移 SUCCESS，写 vip_bills（WECHAT + 微信交易单号）")
    void handlePayNotification_successGrantsVipAndWritesBill() {
        VipOrder order = pendingOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        when(billingService.grantVipExpiry(eq(100L), eq(30))).thenReturn(LocalDateTime.now().plusDays(30));

        String result = service.handlePayNotification(successTx(1800), "EV-5", "{}", "{}");

        assertEquals("SUCCESS", result);
        assertEquals(VipOrder.STATUS_SUCCESS, order.getStatus());
        assertNotNull(order.getPaidAt());
        // VIP 时长顺延：按套餐天数（monthly=30）复用 BillingService 公共逻辑
        verify(billingService).grantVipExpiry(eq(100L), eq(30));
        ArgumentCaptor<String> txIdCaptor = ArgumentCaptor.forClass(String.class);
        verify(billingService).createBill(eq(100L), eq("monthly"), eq("月卡"),
                eq(1800), eq(1800), eq("SUBSCRIBE"), eq("SUCCESS"), eq("WECHAT"),
                txIdCaptor.capture(), any(), any(), any());
        assertEquals("420000WX-TX-1", txIdCaptor.getValue(), "账单 transactionId 应为微信交易单号");
    }

    @Test
    @DisplayName("支付回调 trade_state=CLOSED：订单迁移 CLOSED 并成功应答")
    void handlePayNotification_tradeStateClosedMarksOrderClosed() {
        VipOrder order = pendingOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        WxPayModels.WxPayTransaction closedTx = new WxPayModels.WxPayTransaction(
                "1900000001", "wxappid", ORDER_NO, "420000WX-TX-2",
                "JSAPI", "CLOSED", "2026-10-05T12:00:00+08:00",
                new WxPayModels.WxPayTransaction.Amount(1800, 1800, "CNY"));

        String result = service.handlePayNotification(closedTx, "EV-6", "{}", "{}");

        assertEquals("SUCCESS", result);
        assertEquals(VipOrder.STATUS_CLOSED, order.getStatus());
        assertNotNull(order.getClosedAt());
        verify(billingService, never()).createBill(anyLong(), anyString(), anyString(),
                anyInt(), anyInt(), anyString(), anyString(), anyString(), anyString(),
                any(), any(), any());
    }

    /* ==================== 退款回调 ==================== */

    @Test
    @DisplayName("退款回调：REFUNDING 订单收到 SUCCESS → REFUNDED 并写 REFUND 账单（transactionId=退款单号）")
    void handleRefundNotification_successMarksRefundedAndWritesBill() {
        VipOrder order = pendingOrder();
        order.setStatus(VipOrder.STATUS_REFUNDING);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        WxPayModels.WxPayRefundPayload payload = new WxPayModels.WxPayRefundPayload(
                "1900000001", ORDER_NO, "420000WX-TX-1", "REFUND-1", "50000000RN1",
                "SUCCESS", new WxPayModels.WxPayRefundPayload.Amount(1800, 1800, 1800));

        String result = service.handleRefundNotification(payload, "EV-7", "{}", "{}");

        assertEquals("SUCCESS", result);
        assertEquals(VipOrder.STATUS_REFUNDED, order.getStatus());
        assertEquals("50000000RN1", order.getRefundId());
        ArgumentCaptor<String> txIdCaptor = ArgumentCaptor.forClass(String.class);
        verify(billingService).createBill(eq(100L), eq("monthly"), eq("月卡"),
                eq(1800), eq(1800), eq("REFUND"), eq("REFUNDED"), eq("WECHAT"),
                txIdCaptor.capture(), any(), any(), any());
        assertEquals("50000000RN1", txIdCaptor.getValue(), "退款账单 transactionId 应为微信退款单号（独立于支付交易单号）");
    }

    @Test
    @DisplayName("退款回调：CLOSED 终态订单收到退款通知 → 非法迁移拒绝（FAIL）")
    void handleRefundNotification_illegalTransitionFails() {
        VipOrder order = pendingOrder();
        order.setStatus(VipOrder.STATUS_CLOSED);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));

        WxPayModels.WxPayRefundPayload payload = new WxPayModels.WxPayRefundPayload(
                "1900000001", ORDER_NO, "420000WX-TX-1", "REFUND-1", "50000000RN1",
                "SUCCESS", new WxPayModels.WxPayRefundPayload.Amount(1800, 1800, 1800));

        String result = service.handleRefundNotification(payload, "EV-8", "{}", "{}");

        assertEquals("FAIL", result);
        verify(vipOrderRepository, never()).save(any());
    }

    @Test
    @DisplayName("退款回调幂等：订单已 REFUNDED 的重复通知直接成功应答")
    void handleRefundNotification_duplicateReturnsSuccess() {
        VipOrder order = pendingOrder();
        order.setStatus(VipOrder.STATUS_REFUNDED);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));

        WxPayModels.WxPayRefundPayload payload = new WxPayModels.WxPayRefundPayload(
                "1900000001", ORDER_NO, "420000WX-TX-1", "REFUND-1", "50000000RN1",
                "SUCCESS", new WxPayModels.WxPayRefundPayload.Amount(1800, 1800, 1800));

        String result = service.handleRefundNotification(payload, "EV-9", "{}", "{}");

        assertEquals("SUCCESS", result);
        verify(vipOrderRepository, never()).save(any());
        verify(billingService, never()).createBill(anyLong(), anyString(), anyString(),
                anyInt(), anyInt(), anyString(), anyString(), anyString(), anyString(),
                any(), any(), any());
    }

    /* ==================== 幂等核心缺陷钉死（2026-10-05 修复回归） ==================== */

    @Test
    @DisplayName("支付回调幂等钉死：同 orderNo 先后两条通知（新 notificationId）→ 第二条不得再次顺延 VIP")
    void handlePayNotification_secondNotificationWithNewIdMustNotRegrant() {
        // 第一条通知：PENDING 订单支付成功（开通 + 写账单各一次）
        VipOrder order = pendingOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        when(billingService.grantVipExpiry(eq(100L), eq(30))).thenReturn(LocalDateTime.now().plusDays(30));

        assertEquals("SUCCESS", service.handlePayNotification(successTx(1800), "NOTIF-FIRST", "{}", "{}"));
        assertEquals(VipOrder.STATUS_SUCCESS, order.getStatus());

        // 第二条通知：同一 orderNo 换新 notificationId（旧双键方案可被此绕过造成重复顺延）
        assertEquals("SUCCESS", service.handlePayNotification(successTx(1800), "NOTIF-SECOND-NEW-ID", "{}", "{}"));

        // 核心断言：开通/写账 total 仍各只有 1 次（第二条被订单状态机幂等拦截）
        verify(billingService, times(1)).grantVipExpiry(eq(100L), eq(30));
        verify(billingService, times(1)).createBill(anyLong(), anyString(), anyString(),
                anyInt(), anyInt(), anyString(), anyString(), anyString(), anyString(),
                any(), any(), any());
    }

    /* ==================== 指标接线（2026-10-05 补齐） ==================== */

    @Test
    @DisplayName("指标接线：订单不存在 → recordCallbackFailure(order_not_found)")
    void handlePayNotification_recordsOrderNotFoundMetric() {
        PaymentMetrics metrics = mock(PaymentMetrics.class);
        ReflectionTestUtils.setField(service, "paymentMetrics", metrics);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.empty());

        service.handlePayNotification(successTx(1800), "EV-M1", "{}", "{}");

        verify(metrics).recordCallbackFailure("order_not_found");
    }

    @Test
    @DisplayName("指标接线：金额不符 → recordCallbackFailure(amount_mismatch)")
    void handlePayNotification_recordsAmountMismatchMetric() {
        PaymentMetrics metrics = mock(PaymentMetrics.class);
        ReflectionTestUtils.setField(service, "paymentMetrics", metrics);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(pendingOrder()));

        service.handlePayNotification(successTx(1000), "EV-M2", "{}", "{}");

        verify(metrics).recordCallbackFailure("amount_mismatch");
    }

    @Test
    @DisplayName("指标接线：重复通知（幂等拒绝重复开通）→ recordCallbackFailure(duplicate_notify)")
    void handlePayNotification_recordsDuplicateNotifyMetric() {
        PaymentMetrics metrics = mock(PaymentMetrics.class);
        ReflectionTestUtils.setField(service, "paymentMetrics", metrics);
        VipOrder order = pendingOrder();
        order.setStatus(VipOrder.STATUS_SUCCESS);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));

        service.handlePayNotification(successTx(1800), "EV-M3", "{}", "{}");

        verify(metrics).recordCallbackFailure("duplicate_notify");
        verify(billingService, never()).grantVipExpiry(anyLong(), anyInt());
    }

    /* ==================== 金额换算 ==================== */

    @Test
    @DisplayName("回调金额留痕：分转元两位小数写入留痕日志")
    void handlePayNotification_logsYuanAmount() {
        VipOrder order = pendingOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        when(billingService.grantVipExpiry(anyLong(), anyInt())).thenReturn(LocalDateTime.now().plusDays(30));

        service.handlePayNotification(successTx(1800), "EV-10", "{}", "{}");

        ArgumentCaptor<com.campuslove.api.entity.PaymentCallbackLog> logCaptor =
                ArgumentCaptor.forClass(com.campuslove.api.entity.PaymentCallbackLog.class);
        verify(paymentCallbackLogRepository).save(logCaptor.capture());
        assertEquals(new BigDecimal("18.00"), logCaptor.getValue().getAmount());
        assertEquals("420000WX-TX-1", logCaptor.getValue().getWxTransactionId());
        assertTrue(logCaptor.getValue().getStatus().equals("SUCCESS"));
    }
}
