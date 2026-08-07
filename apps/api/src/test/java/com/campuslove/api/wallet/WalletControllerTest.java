package com.campuslove.api.wallet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.SecurityUtils;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * 钱包控制器单元测试（走查补齐：钱包 HTTP 端点化）。
 *
 * <p>覆盖 {@link WalletController} 核心场景：</p>
 * <ul>
 *   <li>GET  /api/v1/wallet/balance      - 委托 WalletService.getBalance</li>
 *   <li>GET  /api/v1/wallet/transactions - 委托 WalletService.listTransactions 并映射分页视图</li>
 *   <li>POST /api/v1/wallet/recharge     - 委托 WalletService.recharge（演示充值，服务端生成 orderId）</li>
 *   <li>未认证 - SecurityUtils 抛出 401 时向上传播</li>
 * </ul>
 */
@DisplayName("钱包控制器单元测试")
class WalletControllerTest {

    @Mock
    private WalletService walletService;

    private WalletController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new WalletController(walletService, null);
    }

    @Test
    @DisplayName("getBalance 从认证上下文取 userId 并委托服务查询余额")
    void getBalance_shouldDelegateWithUserIdFromSecurityContext() {
        Long userId = 1001L;
        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(walletService.getBalance(userId)).thenReturn(1500L);

            WalletBalanceView view = controller.getBalance();

            assertNotNull(view);
            assertEquals(Long.valueOf(1500L), view.balanceCents(), "应返回服务查询到的余额（分）");
            verify(walletService).getBalance(userId);
        }
    }

    @Test
    @DisplayName("getBalance 钱包不存在时余额为 0")
    void getBalance_whenWalletMissing_returnsZero() {
        Long userId = 1002L;
        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(walletService.getBalance(userId)).thenReturn(0L);

            WalletBalanceView view = controller.getBalance();

            assertEquals(Long.valueOf(0L), view.balanceCents(), "钱包不存在时余额应为 0");
        }
    }

    @Test
    @DisplayName("listTransactions 委托服务并映射为分页视图（items/total/page/size/totalPages）")
    void listTransactions_shouldDelegateAndMapPageView() {
        Long userId = 2001L;
        WalletTransactionLog log = new WalletTransactionLog();
        log.setId(1L);
        log.setUserId(userId);
        log.setType(WalletTransactionLog.TransactionType.CREDIT.name());
        log.setAmount(1000L);
        log.setBalanceAfter(1000L);
        log.setRelatedType(WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE);
        log.setOrderId("WALLET-RECHARGE-abc");
        log.setRemark("充值");
        log.setCreatedAt(LocalDateTime.of(2026, 8, 6, 12, 0));

        Page<WalletTransactionLog> page = new PageImpl<>(
                List.of(log), PageRequest.of(0, 20), 1L);

        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(walletService.listTransactions(eq(userId), any(Pageable.class))).thenReturn(page);

            WalletTransactionListView view = controller.listTransactions(0, 20);

            assertNotNull(view);
            assertEquals(1L, view.total(), "总数应为 1");
            assertEquals(0, view.page(), "页码从 0 开始");
            assertEquals(20, view.size(), "每页大小 20");
            assertEquals(1, view.totalPages(), "总页数应为 1");
            assertEquals(1, view.items().size(), "应映射 1 条流水项");
            WalletTransactionItemView item = view.items().get(0);
            assertEquals(Long.valueOf(1L), item.id());
            assertEquals(WalletTransactionLog.TransactionType.CREDIT.name(), item.type());
            assertEquals(Long.valueOf(1000L), item.amount(), "金额字段原样透传（分）");
            assertEquals(Long.valueOf(1000L), item.balanceAfter());
            assertEquals(WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE, item.relatedType());
            assertEquals("WALLET-RECHARGE-abc", item.orderId());
            assertNotNull(item.createdAt(), "创建时间应透传");
            verify(walletService).listTransactions(eq(userId), any(Pageable.class));
        }
    }

    @Test
    @DisplayName("recharge 服务端生成 orderId 并委托充值，返回充值后余额")
    void recharge_shouldGenerateOrderIdAndDelegate() {
        Long userId = 3001L;
        RechargeRequest request = new RechargeRequest(5000L);

        try (MockedStatic<SecurityUtils> mocked = Mockito.mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(walletService.recharge(eq(userId), eq(5000L), anyString(),
                    eq(WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE), any()))
                    .thenReturn(5000L);

            WalletRechargeView view = controller.recharge(request);

            assertNotNull(view);
            assertEquals(Long.valueOf(5000L), view.balanceAfterCents(), "充值后余额应为 5000");
            assertEquals(Long.valueOf(5000L), view.amountCents(), "充值金额应为 5000 分");
            assertEquals(WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE, view.relatedType());
            assertNotNull(view.orderId(), "服务端应生成订单号");
            assertTrue(view.orderId().startsWith("WALLET-RECHARGE-"), "订单号应有业务前缀");
            verify(walletService).recharge(eq(userId), eq(5000L), anyString(),
                    eq(WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE), any());
        }
    }

    @Test
    @DisplayName("recharge 演示充值与红包链路兼容：relatedType 使用 WALLET_RECHARGE，可查流水")
    void recharge_relatedTypeMatchesWalletRechargeConstant() {
        assertEquals("WALLET_RECHARGE", WalletTransactionLog.RELATED_TYPE_WALLET_RECHARGE,
                "演示充值相关业务类型常量应存在");
    }

    @Test
    @DisplayName("未认证时 SecurityUtils 抛出 401，控制器向上传播")
    void endpoints_whenUnauthenticated_shouldPropagateUnauthorized() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        org.springframework.web.client.HttpClientErrorException.Unauthorized ex =
                assertThrows(org.springframework.web.client.HttpClientErrorException.Unauthorized.class,
                        () -> controller.getBalance());
        assertEquals(401, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("构造函数注入校验")
    void constructor_shouldAcceptService() {
        assertNotNull(new WalletController(walletService, null));
    }
}
