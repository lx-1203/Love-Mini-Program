package com.campuslove.api.wallet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.wallet.WalletUnlock;
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
 * 真实商业化解锁服务单元测试（P0-17 + 2026-10-05 orderId 修复）。
 *
 * <p>重点覆盖：orderId 必须包含 userId——原格式 UNLOCK-{type}-{targetId} 缺少
 * userId，wallet_transaction_log.order_id 全局唯一约束下，其他用户解锁同一目标
 * 会命中同一 orderId 被幂等吞掉（不同用户互相冲突）。修复后格式
 * UNLOCK-{type}-{userId}-{targetId}，多用户互不冲突。</p>
 */
@ExtendWith(MockitoExtension.class)
class RealWalletUnlockServiceTest {

    @Mock
    private WalletService walletService;
    @Mock
    private WalletUnlockRepository unlockRepository;

    private RealWalletUnlockService service;

    @BeforeEach
    void setUp() {
        service = new RealWalletUnlockService(walletService, unlockRepository);
        ReflectionTestUtils.setField(service, "likedMePriceCents", 300);
        ReflectionTestUtils.setField(service, "visitorPriceCents", 300);
    }

    @Test
    @DisplayName("解锁 orderId 含 userId：UNLOCK-{type}-{userId}-{targetId}")
    void unlock_orderIdIncludesUserId() {
        when(unlockRepository.findByUserIdAndTargetTypeAndTargetId(11L, "LIKED_ME", 22L))
                .thenReturn(Optional.empty());
        when(walletService.deduct(eq(11L), eq(300L), eq("UNLOCK-LIKED_ME-11-22"),
                eq(WalletTransactionLog.RELATED_TYPE_UNLOCK_LIKED_ME), eq("22")))
                .thenReturn(700L);
        when(unlockRepository.saveAndFlush(any(WalletUnlock.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.unlock(11L, "LIKED_ME", 22L);

        verify(walletService).deduct(eq(11L), eq(300L), eq("UNLOCK-LIKED_ME-11-22"),
                eq(WalletTransactionLog.RELATED_TYPE_UNLOCK_LIKED_ME), eq("22"));
    }

    @Test
    @DisplayName("多用户解锁同一目标：orderId 各不相同（原格式会全局唯一约束冲突）")
    void unlock_differentUsersSameTarget_produceDistinctOrderIds() {
        when(unlockRepository.findByUserIdAndTargetTypeAndTargetId(anyLong(), anyString(), anyLong()))
                .thenReturn(Optional.empty());
        when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(0L);
        when(unlockRepository.saveAndFlush(any(WalletUnlock.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<String> orderIdCaptor = ArgumentCaptor.forClass(String.class);
        service.unlock(1L, "VISITOR", 99L);
        service.unlock(2L, "VISITOR", 99L);

        verify(walletService, org.mockito.Mockito.times(2)).deduct(anyLong(), anyLong(),
                orderIdCaptor.capture(), anyString(), anyString());
        var orderIds = orderIdCaptor.getAllValues();
        assertEquals("UNLOCK-VISITOR-1-99", orderIds.get(0));
        assertEquals("UNLOCK-VISITOR-2-99", orderIds.get(1));
        assertNotEquals(orderIds.get(0), orderIds.get(1),
                "不同用户解锁同一目标的 orderId 必须不同（避免 order_id 唯一约束互相冲突）");
    }

    @Test
    @DisplayName("幂等：同一 (user, type, target) 重复解锁直接放行，不重复扣费")
    void unlock_alreadyUnlocked_noDeduction() {
        WalletUnlock existing = new WalletUnlock();
        when(unlockRepository.findByUserIdAndTargetTypeAndTargetId(5L, "LIKED_ME", 6L))
                .thenReturn(Optional.of(existing));
        when(walletService.getBalance(5L)).thenReturn(1000L);

        var view = service.unlock(5L, "LIKED_ME", 6L);

        assertTrue(view.unlocked());
        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("非法目标类型拒绝（白名单校验，不扣费）")
    void unlock_invalidTargetTypeRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.unlock(1L, "PROFILE", 2L));
        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("余额不足：异常向上抛出（HTTP 409 语义），无解锁记录写入")
    void unlock_insufficientBalance_propagates() {
        when(unlockRepository.findByUserIdAndTargetTypeAndTargetId(7L, "VISITOR", 8L))
                .thenReturn(Optional.empty());
        when(walletService.deduct(eq(7L), anyLong(), anyString(), anyString(), anyString()))
                .thenThrow(new InsufficientBalanceException(7L, 300L, 100L));

        assertThrows(InsufficientBalanceException.class, () -> service.unlock(7L, "VISITOR", 8L));
    }
}
