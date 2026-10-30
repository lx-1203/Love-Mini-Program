package com.campuslove.api.wallet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.SecurityUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 扣费幂等键的归属与确定性测试（2026-10-30 跨用户碰撞缺陷）。
 *
 * <p>缺陷本体：{@code wallet_transaction_log.order_id} 是全局唯一索引，而
 * apps/client 的 {@code buildUnlockOrderId} 生成的是不含 userId 的
 * {@code UNLOCK-{scene}-{targetId}}，{@code WalletController.deduct} 又直接采信客户端
 * orderId ⇒ 用户 A 解锁过 T 之后，用户 B 解锁同一 T 会命中 A 的流水，被
 * {@code WalletServiceImpl} 以"orderId 已存在但归属用户不一致"拒绝（400）。
 * 也就是说同一目标只有第一个人能付费解锁。</p>
 *
 * <p>因此本类钉两条不可退让的性质：键里必须有 userId（不同用户互不占位）、
 * 同一用户同一目标必须确定性相同（重试不双扣）。任何把"客户端传什么就用什么"
 * 改回去的做法，这里的控制器用例会立刻变红。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Wallet 扣费幂等键 - 必须含 userId 且服务端派生")
class WalletDeductOrderIdTest {

    @Mock
    private WalletService walletService;

    private WalletController controller;
    private MockedStatic<SecurityUtils> securityUtils;

    @BeforeEach
    void setUp() {
        controller = new WalletController(walletService, null);
        securityUtils = mockStatic(SecurityUtils.class);
    }

    @AfterEach
    void tearDown() {
        securityUtils.close();
    }

    private void loginAs(long userId) {
        securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
    }

    /** 捕获传给 walletService.deduct 的 orderId */
    private String deductAndCaptureOrderId(DeductRequest request) {
        when(walletService.deduct(anyLong(), anyLong(), any(), any(), any())).thenReturn(1234L);
        controller.deduct(request);
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(walletService)
                .deduct(anyLong(), anyLong(), captor.capture(), any(), any());
        return captor.getValue();
    }

    @Test
    @DisplayName("派生键格式为 UNLOCK-{relatedType}-{userId}-{relatedId} 且确定性")
    void derivedKeyFormatIsDeterministic() {
        String first = WalletController.deriveOrderId(1001L, "MESSAGE_UNLOCK", "2003");
        String second = WalletController.deriveOrderId(1001L, "MESSAGE_UNLOCK", "2003");

        assertEquals("UNLOCK-MESSAGE_UNLOCK-1001-2003", first);
        assertEquals(first, second, "同一用户重复提交必须得到同一个键，否则重试会双扣");
    }

    @Test
    @DisplayName("两个用户解锁同一目标 ⇒ 键不同（原缺陷正是这里相撞）")
    void twoUsersOnSameTargetGetDistinctKeys() {
        assertNotEquals(
                WalletController.deriveOrderId(1001L, "LIKES_UNLOCK", "2003"),
                WalletController.deriveOrderId(1002L, "LIKES_UNLOCK", "2003"));
    }

    @Test
    @DisplayName("无 relatedId 时退化为一次性随机键，但仍含 userId")
    void randomFallbackStillScopedByUser() {
        String a = WalletController.deriveOrderId(1001L, "MESSAGE_UNLOCK", null);
        String b = WalletController.deriveOrderId(1001L, "MESSAGE_UNLOCK", "");
        String c = WalletController.deriveOrderId(1002L, "MESSAGE_UNLOCK", null);

        assertTrue(a.startsWith("DEDUCT-1001-"), "实际=" + a);
        assertNotEquals(a, b, "空 relatedId 无法构造确定性键，必须互不碰撞");
        assertNotEquals(a, c);
    }

    @Test
    @DisplayName("控制器不再使用客户端传来的 orderId")
    void controllerIgnoresClientSuppliedOrderId() {
        loginAs(1001L);
        String captured = deductAndCaptureOrderId(
                new DeductRequest(100L, "SHARED-KEY-FROM-CLIENT", "MESSAGE_UNLOCK", "2003"));

        assertEquals("UNLOCK-MESSAGE_UNLOCK-1001-2003", captured);
        assertTrue(!captured.contains("SHARED-KEY"), "客户端键不得进入扣费路径");
    }

    @Test
    @DisplayName("跨用户回归用例：A 解锁 T 后 B 解锁 T，两次扣费用的是两个键")
    void secondUserUnlockingSameTargetIsNotBlockedByFirst() {
        loginAs(1001L);
        String keyOfA = deductAndCaptureOrderId(
                new DeductRequest(100L, "UNLOCK-MESSAGE-2003", "MESSAGE_UNLOCK", "2003"));

        org.mockito.Mockito.reset(walletService);
        loginAs(1002L);
        String keyOfB = deductAndCaptureOrderId(
                new DeductRequest(100L, "UNLOCK-MESSAGE-2003", "MESSAGE_UNLOCK", "2003"));

        assertNotEquals(keyOfA, keyOfB,
                "旧实现里两个用户共用 UNLOCK-MESSAGE-2003 ⇒ 第二个人命中唯一索引被拒");
    }

    @Test
    @DisplayName("返回视图里的 orderId 与实际扣费键一致（客户端可据此对账）")
    void responseEchoesDerivedKey() {
        loginAs(1001L);
        when(walletService.deduct(eq(1001L), anyLong(), any(), eq("WHISPER_UNLOCK"), eq("777")))
                .thenReturn(8800L);

        WalletDeductView view =
                controller.deduct(new DeductRequest(200L, "whatever", "WHISPER_UNLOCK", "777"));

        assertEquals("UNLOCK-WHISPER_UNLOCK-1001-777", view.orderId());
        assertEquals(8800L, view.balanceAfterCents());
    }
}
