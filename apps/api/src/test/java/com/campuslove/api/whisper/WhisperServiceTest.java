package com.campuslove.api.whisper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.WhisperMessage;
import com.campuslove.api.repository.WhisperMessageRepository;
import com.campuslove.api.verification.RealNameCertificationRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.whisper.WhisperViews.WhisperMessageView;
import com.campuslove.api.whisper.WhisperViews.WhisperSendRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * 悄悄话（v3.1）单元测试：mock 收件箱 / 幂等 / 每日上限 / 同对上限 / 扣费失败退款。
 */
@ExtendWith(MockitoExtension.class)
class WhisperServiceTest {

    @Mock
    private WhisperMessageRepository repository;
    @Mock
    private WalletService walletService;

    private RealWhisperService service;

    @BeforeEach
    void setUp() {
        service = new RealWhisperService(repository, walletService);
        ReflectionTestUtils.setField(service, "whisperPriceCents", 200);
    }

    @Test
    void mockService_roundTrip() {
        MockWhisperService mock = new MockWhisperService();
        WhisperMessageView view = mock.send(1L, new WhisperSendRequest(2L, "你好呀", "req-1"));
        assertEquals("SENT", view.status());
        assertEquals(1, mock.inbox(2L).size());
        mock.markRead(2L, view.id());
        assertEquals("READ", mock.inbox(2L).get(0).status());
    }

    @Test
    void send_isIdempotentByClientRequestId() {
        WhisperMessage existing = new WhisperMessage();
        existing.setId(1L);
        existing.setSenderId(1L);
        existing.setReceiverId(2L);
        existing.setContent("你好呀");
        existing.setStatus("SENT");
        existing.setClientRequestId("req-idem");
        existing.setPriceCents(200L);
        when(repository.findByClientRequestId("req-idem")).thenReturn(Optional.of(existing));

        WhisperMessageView view = service.send(1L, new WhisperSendRequest(2L, "你好呀", "req-idem"));

        assertEquals(1L, view.id());
        verify(walletService, never()).deduct(any(), any(), any(), any(), any());
    }

    @Test
    void send_rejectsPairLimit() {
        when(repository.findByClientRequestId("req-pair")).thenReturn(Optional.empty());
        when(repository.countActiveBetween(1L, 2L)).thenReturn(1L);
        assertThrows(IllegalArgumentException.class,
            () -> service.send(1L, new WhisperSendRequest(2L, "你好呀", "req-pair")));
    }

    @Test
    void send_rejectsDailyLimit() {
        when(repository.findByClientRequestId("req-day")).thenReturn(Optional.empty());
        when(repository.countActiveBetween(1L, 2L)).thenReturn(0L);
        when(repository.countBySenderIdAndCreatedAtBetween(eq(1L), any(), any())).thenReturn(5L);
        assertThrows(IllegalArgumentException.class,
            () -> service.send(1L, new WhisperSendRequest(2L, "你好呀", "req-day")));
    }

    @Test
    void send_refundsWhenCreateFails() {
        when(repository.findByClientRequestId("req-fail")).thenReturn(Optional.empty());
        when(repository.countActiveBetween(1L, 2L)).thenReturn(0L);
        when(repository.countBySenderIdAndCreatedAtBetween(eq(1L), any(), any())).thenReturn(0L);
        when(repository.save(any(WhisperMessage.class))).thenThrow(new RuntimeException("db down"));

        assertThrows(IllegalArgumentException.class,
            () -> service.send(1L, new WhisperSendRequest(2L, "你好呀", "req-fail")));
        verify(walletService, times(1)).deduct(any(), any(), any(), any(), any());
        verify(walletService, times(1)).recharge(any(), any(), any(), any(), any());
    }

    @Test
    void send_requiresRealNameVerified() {
        RealNameCertificationRepository realNameRepo = mock(RealNameCertificationRepository.class);
        when(realNameRepo.findByUserId(1L)).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(service, "realNameCertificationRepository", realNameRepo);
        when(repository.findByClientRequestId("req-rn")).thenReturn(Optional.empty());
        when(repository.countActiveBetween(1L, 2L)).thenReturn(0L);
        when(repository.countBySenderIdAndCreatedAtBetween(eq(1L), any(), any())).thenReturn(0L);

        assertThrows(IllegalArgumentException.class,
            () -> service.send(1L, new WhisperSendRequest(2L, "你好呀", "req-rn")));
        verify(walletService, never()).deduct(any(), any(), any(), any(), any());
    }

    @Test
    void send_rejectsSelf() {
        assertThrows(IllegalArgumentException.class,
            () -> service.send(1L, new WhisperSendRequest(1L, "自己", "req-self")));
    }

    @Test
    void inbox_marksDelivered() {
        WhisperMessage m = new WhisperMessage();
        m.setId(1L);
        m.setSenderId(2L);
        m.setReceiverId(1L);
        m.setContent("你好呀");
        m.setStatus("SENT");
        m.setClientRequestId("req-in");
        m.setPriceCents(200L);
        when(repository.findByReceiverIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(m));

        List<WhisperMessageView> list = service.inbox(1L);
        assertEquals(1, list.size());
        assertTrue(list.get(0).status().equals("DELIVERED"));
        verify(repository, times(1)).save(any(WhisperMessage.class));
    }
}
