package com.campuslove.api.whisper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
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
    void markRead_rejectsAuditRows_idEnumerationClosed() {
        // R6-1（2026-11-05）：按-id 端点是 R5-1 的残留泄漏面——收件人枚举 id 命中
        // PAY_FAILED/REFUNDED 审计行时必须「视同不存在」：不返回 content、不改状态。
        for (String auditStatus : List.of("PAY_FAILED", "REFUNDED")) {
            WhisperMessage m = new WhisperMessage();
            m.setId(9L);
            m.setSenderId(2L);
            m.setReceiverId(1L);
            m.setContent("未付费的内容");
            m.setStatus(auditStatus);
            m.setClientRequestId("req-audit-" + auditStatus);
            m.setPriceCents(200L);
            when(repository.findById(9L)).thenReturn(Optional.of(m));

            assertThrows(IllegalArgumentException.class, () -> service.markRead(1L, 9L),
                    "审计行标读必须拒绝: " + auditStatus);
            verify(repository, never()).save(any(WhisperMessage.class));
        }
    }

    @Test
    void markRead_readIsIdempotent() {
        WhisperMessage m = new WhisperMessage();
        m.setId(7L);
        m.setSenderId(2L);
        m.setReceiverId(1L);
        m.setContent("已读的悄悄话");
        m.setStatus("READ");
        m.setClientRequestId("req-read");
        m.setPriceCents(200L);
        when(repository.findById(7L)).thenReturn(Optional.of(m));

        WhisperMessageView view = service.markRead(1L, 7L);
        assertEquals("READ", view.status());
        verify(repository, never()).save(any(WhisperMessage.class));
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
    void send_notifiesReceiverOnSuccess() {
        com.campuslove.api.chat.NotificationService notificationService =
                mock(com.campuslove.api.chat.NotificationService.class);
        ReflectionTestUtils.setField(service, "notificationService", notificationService);
        when(repository.findByClientRequestId("req-notify")).thenReturn(Optional.empty());
        when(repository.countActiveBetween(1L, 2L)).thenReturn(0L);
        when(repository.countBySenderIdAndCreatedAtBetween(eq(1L), any(), any())).thenReturn(0L);

        service.send(1L, new WhisperSendRequest(2L, "你好呀", "req-notify"));

        verify(notificationService, times(1)).createSystemNotification(
                eq(2L), eq(1L), contains("悄悄话"), isNull(), eq("whisper"));
    }

    @Test
    void send_notificationFailureDoesNotBreakSend() {
        com.campuslove.api.chat.NotificationService notificationService =
                mock(com.campuslove.api.chat.NotificationService.class);
        ReflectionTestUtils.setField(service, "notificationService", notificationService);
        doThrow(new RuntimeException("ws down"))
                .when(notificationService).createSystemNotification(any(), any(), any(), any(), any());
        when(repository.findByClientRequestId("req-notify-fail")).thenReturn(Optional.empty());
        when(repository.countActiveBetween(1L, 2L)).thenReturn(0L);
        when(repository.countBySenderIdAndCreatedAtBetween(eq(1L), any(), any())).thenReturn(0L);

        WhisperMessageView view = service.send(1L, new WhisperSendRequest(2L, "你好呀", "req-notify-fail"));

        assertEquals("SENT", view.status());
        verify(notificationService, times(1)).createSystemNotification(any(), any(), any(), any(), any());
    }

    @Test
    void inbox_marksDeliveredViaBulkUpdate() {
        // R5-b（2026-11-05）：SENT→DELIVERED 改为一次批量 UPDATE——service 必须先置位再取列表，
        // 且不再逐行 save（N+1 写已消除）。stub 返回置位后的 DB 状态（DELIVERED）。
        WhisperMessage m = new WhisperMessage();
        m.setId(1L);
        m.setSenderId(2L);
        m.setReceiverId(1L);
        m.setContent("你好呀");
        m.setStatus("DELIVERED");
        m.setClientRequestId("req-in");
        m.setPriceCents(200L);
        when(repository.findByReceiverIdAndStatusInOrderByCreatedAtDesc(eq(1L), any()))
                .thenReturn(List.of(m));

        List<WhisperMessageView> list = service.inbox(1L);
        assertEquals(1, list.size());
        assertTrue(list.get(0).status().equals("DELIVERED"));
        verify(repository, times(1)).markInboxDelivered(1L);
        verify(repository, never()).save(any(WhisperMessage.class));
    }

    @Test
    void inbox_excludesAuditRows_paywallBypassClosed() {
        // R5-1（2026-11-05）判点：PAY_FAILED/REFUNDED 审计行含未付费内容，
        // 泄入收件人收件箱=「余额不足」旁路付费墙。收件查询的状态集合必须排除之。
        when(repository.findByReceiverIdAndStatusInOrderByCreatedAtDesc(eq(1L), any()))
                .thenReturn(List.of());

        service.inbox(1L);

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<java.util.Collection<String>> captor =
                org.mockito.ArgumentCaptor.forClass((Class<java.util.Collection<String>>) (Class<?>) java.util.Collection.class);
        verify(repository).findByReceiverIdAndStatusInOrderByCreatedAtDesc(eq(1L), captor.capture());
        java.util.Collection<String> statuses = captor.getValue();
        assertTrue(statuses.containsAll(List.of("SENT", "DELIVERED", "READ")),
                "收件箱必须覆盖全部送达态: " + statuses);
        assertFalse(statuses.contains("PAY_FAILED"), "PAY_FAILED 审计行不得进入收件箱（付费墙旁路）");
        assertFalse(statuses.contains("REFUNDED"), "REFUNDED 审计行不得进入收件箱（付费墙旁路）");
    }

    @Test
    void unreadCount_usesUnreadStatusesOnly() {
        // R9-b（2026-11-05）：未读口径=SENT/DELIVERED（READ 不计、审计行不计）
        when(repository.countByReceiverIdAndStatusIn(eq(1L), any())).thenReturn(3L);

        long n = service.unreadCount(1L);

        assertEquals(3L, n);
        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<java.util.Collection<String>> captor =
                org.mockito.ArgumentCaptor.forClass((Class<java.util.Collection<String>>) (Class<?>) java.util.Collection.class);
        verify(repository).countByReceiverIdAndStatusIn(eq(1L), captor.capture());
        java.util.Collection<String> statuses = captor.getValue();
        assertTrue(statuses.containsAll(List.of("SENT", "DELIVERED")), "未读必须含送达中/已送达: " + statuses);
        assertFalse(statuses.contains("READ"));
        assertFalse(statuses.contains("PAY_FAILED"));
    }

    @Test
    void inbox_fillsSenderProfileInBulk() {
        // R8（2026-11-04）：收件箱视图带发送者昵称/头像；资料缺失保持 null（客户端兜底「神秘访客」）
        com.campuslove.api.repository.UserRepository userRepository =
                mock(com.campuslove.api.repository.UserRepository.class);
        com.campuslove.api.entity.User sender = new com.campuslove.api.entity.User();
        sender.setId(2L);
        sender.setNickname("胶片摄影师小林");
        sender.setAvatarUrl("https://cdn.example/avatar-2.png");
        when(userRepository.findAllById(any())).thenReturn(List.of(sender));
        ReflectionTestUtils.setField(service, "userRepository", userRepository);

        WhisperMessage m = new WhisperMessage();
        m.setId(1L);
        m.setSenderId(2L);
        m.setReceiverId(1L);
        m.setContent("晚安，想听听你最喜欢的一道菜。");
        m.setStatus("DELIVERED");
        m.setClientRequestId("req-profile");
        m.setPriceCents(200L);
        when(repository.findByReceiverIdAndStatusInOrderByCreatedAtDesc(eq(1L), any()))
                .thenReturn(List.of(m));

        List<WhisperMessageView> list = service.inbox(1L);
        assertEquals("胶片摄影师小林", list.get(0).senderNickname(), "收件箱应填充发送者昵称");
        assertEquals("https://cdn.example/avatar-2.png", list.get(0).senderAvatar(), "收件箱应填充发送者头像");
    }

    @Test
    void inbox_senderMissing_keepsNullProfile() {
        // 发送者注销/资料缺失：字段保持 null，不阻断收件箱
        com.campuslove.api.repository.UserRepository userRepository =
                mock(com.campuslove.api.repository.UserRepository.class);
        when(userRepository.findAllById(any())).thenReturn(List.of());
        ReflectionTestUtils.setField(service, "userRepository", userRepository);

        WhisperMessage m = new WhisperMessage();
        m.setId(1L);
        m.setSenderId(2L);
        m.setReceiverId(1L);
        m.setContent("你好呀");
        m.setStatus("DELIVERED");
        m.setClientRequestId("req-missing");
        m.setPriceCents(200L);
        when(repository.findByReceiverIdAndStatusInOrderByCreatedAtDesc(eq(1L), any()))
                .thenReturn(List.of(m));

        List<WhisperMessageView> list = service.inbox(1L);
        assertNull(list.get(0).senderNickname());
        assertNull(list.get(0).senderAvatar());
    }

    @Test
    void inbox_paged_over100ClampedAndSorted() {
        // R8 分页：size clamp 到 [1,100]，page 从 0 起；分页路径同样带状态过滤（R5-1）
        WhisperMessage m = new WhisperMessage();
        m.setId(1L);
        m.setSenderId(2L);
        m.setReceiverId(1L);
        m.setContent("分页探针");
        m.setStatus("DELIVERED");
        m.setClientRequestId("req-page");
        m.setPriceCents(200L);
        when(repository.queryByReceiverIdAndStatusInOrderByCreatedAtDesc(eq(1L), any(), any()))
                .thenReturn(List.of(m));

        List<WhisperMessageView> list = service.inbox(1L, 1, 500);
        assertEquals(1, list.size());
        verify(repository, times(1)).queryByReceiverIdAndStatusInOrderByCreatedAtDesc(eq(1L), any(), any());
        verify(repository, times(1)).markInboxDelivered(1L);
    }
}
