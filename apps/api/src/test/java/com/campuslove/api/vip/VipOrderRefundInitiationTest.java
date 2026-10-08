package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.VipOrder;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.VipOrderRepository;
import com.campuslove.api.wxpay.WxPayApiException;
import com.campuslove.api.wxpay.WxPayDisabledException;
import com.campuslove.api.wxpay.WxPayJsapiService;
import com.campuslove.api.wxpay.WxPayProperties;
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
 * 管理员发起退款单元测试（2026-10-05 微信支付工程补齐）。
 *
 * <p>覆盖：mock/off 状态拒绝（WxPayDisabledException）、SUCCESS 订单发起成功
 * （状态机 REFUNDING + createRefund 全额 + refundId 回填）、非 SUCCESS 订单拒绝、
 * 重复发起拒绝（IllegalOrderStateException）、微信 API 失败不落退款单号
 * （事务回滚由 @Transactional 保证，单测断言不写库 + 异常上抛）。</p>
 */
@ExtendWith(MockitoExtension.class)
class VipOrderRefundInitiationTest {

    private static final String ORDER_NO = "VIP20261005120000ABCD1234";

    @Mock
    private VipOrderRepository vipOrderRepository;
    @Mock
    private PaymentCallbackLogRepository paymentCallbackLogRepository;

    private BillingService billingService;
    private VipOrderService service;
    private WxPayProperties wxPayProperties;
    private WxPayJsapiService wxPayJsapiService;

    @BeforeEach
    void setUp() {
        billingService = mock(BillingService.class);
        service = new VipOrderService(vipOrderRepository, billingService, paymentCallbackLogRepository);
        wxPayProperties = new WxPayProperties();
        wxPayProperties.setEnabled(true);
        wxPayJsapiService = mock(WxPayJsapiService.class);
        ReflectionTestUtils.setField(service, "wxPayProperties", wxPayProperties);
        ReflectionTestUtils.setField(service, "wxPayJsapiService", wxPayJsapiService);
        lenient().when(paymentCallbackLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private VipOrder successOrder() {
        VipOrder order = new VipOrder();
        order.setId(1L);
        order.setOrderNo(ORDER_NO);
        order.setUserId(100L);
        order.setPlanId("monthly");
        order.setPlanName("月卡");
        order.setPlanDays(30);
        order.setAmountCents(1800);
        order.setStatus(VipOrder.STATUS_SUCCESS);
        order.setWxTransactionId("420000WX-TX-1");
        return order;
    }

    @Test
    @DisplayName("管道闸：微信支付 enabled=false（mock/off）时发起退款直接拒绝，不迁移状态")
    void initiateRefund_rejectedWhenDisabled() {
        wxPayProperties.setEnabled(false);
        assertThrows(WxPayDisabledException.class, () -> service.initiateRefund(ORDER_NO, "客诉退款"));

        // 管道闸先行：未走到订单查询/微信调用
        verify(vipOrderRepository, never()).findByOrderNo(anyString());
        verify(wxPayJsapiService, never()).createRefund(any());
    }

    @Test
    @DisplayName("发起成功：SUCCESS 订单 → REFUNDING，createRefund 全额受理，refundId 回填落库")
    void initiateRefund_successTransitionsToRefundingAndPersistsRefundId() {
        VipOrder order = successOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(vipOrderRepository.save(any(VipOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        when(wxPayJsapiService.createRefund(any(WxPayJsapiService.RefundCommand.class)))
                .thenReturn(new WxPayJsapiService.RefundResult("50000000RN1", "RF" + ORDER_NO, "PROCESSING"));

        VipOrderService.RefundInitiatedView view = service.initiateRefund(ORDER_NO, "客诉退款");

        assertEquals(ORDER_NO, view.orderNo());
        assertEquals("50000000RN1", view.refundId());
        assertEquals("RF" + ORDER_NO, view.outRefundNo(), "商户退款单号应为 RF+orderNo（幂等重试键）");
        assertEquals(VipOrder.STATUS_REFUNDING, view.status());
        assertEquals(1800, view.refundCents());
        assertEquals(VipOrder.STATUS_REFUNDING, order.getStatus());
        assertEquals("50000000RN1", order.getRefundId());

        // 退款命令核对：原订单号 + 商户退款单号 + 全额退款
        ArgumentCaptor<WxPayJsapiService.RefundCommand> captor =
                ArgumentCaptor.forClass(WxPayJsapiService.RefundCommand.class);
        verify(wxPayJsapiService).createRefund(captor.capture());
        assertEquals(ORDER_NO, captor.getValue().outTradeNo());
        assertEquals("RF" + ORDER_NO, captor.getValue().outRefundNo());
        assertEquals(1800, captor.getValue().refundCents());
        assertEquals(1800, captor.getValue().totalCents());
    }

    @Test
    @DisplayName("非 SUCCESS 订单（PENDING）拒绝退款")
    void initiateRefund_rejectsNonSuccessOrder() {
        VipOrder order = successOrder();
        order.setStatus(VipOrder.STATUS_PENDING);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));

        assertThrows(IllegalArgumentException.class, () -> service.initiateRefund(ORDER_NO, null));
        verify(wxPayJsapiService, never()).createRefund(any());
    }

    @Test
    @DisplayName("重复发起拒绝：已 REFUNDING 的订单再次发起 → 非法状态迁移")
    void initiateRefund_rejectsDuplicateInitiation() {
        VipOrder order = successOrder();
        order.setStatus(VipOrder.STATUS_REFUNDING);
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));

        assertThrows(VipOrderService.IllegalOrderStateException.class,
                () -> service.initiateRefund(ORDER_NO, null));
        verify(wxPayJsapiService, never()).createRefund(any());
    }

    @Test
    @DisplayName("微信 API 失败：异常上抛（事务回滚后订单留 SUCCESS），不落 refundId")
    void initiateRefund_apiFailurePropagatesWithoutRefundId() {
        VipOrder order = successOrder();
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.of(order));
        when(wxPayJsapiService.createRefund(any(WxPayJsapiService.RefundCommand.class)))
                .thenThrow(new WxPayApiException(400, "NOT_ENOUGH", "余额不足"));

        assertThrows(WxPayApiException.class, () -> service.initiateRefund(ORDER_NO, null));

        assertNull(order.getRefundId(), "失败路径不得回填退款单号");
        verify(vipOrderRepository, never()).save(any(VipOrder.class));
    }

    @Test
    @DisplayName("订单不存在：IllegalArgumentException")
    void initiateRefund_rejectsUnknownOrder() {
        when(vipOrderRepository.findByOrderNo(ORDER_NO)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.initiateRefund(ORDER_NO, null));
    }
}
