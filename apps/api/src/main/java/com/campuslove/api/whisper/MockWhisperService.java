package com.campuslove.api.whisper;

import com.campuslove.api.chat.NotificationService;
import com.campuslove.api.whisper.WhisperViews.WhisperMessageView;
import com.campuslove.api.whisper.WhisperViews.WhisperSendRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 悄悄话服务：内存实现，不扣费、不落库（走查/演示用）。
 * <p>2026-11-04 F-10：发送成功后向收件人发到达通知（与 RealWhisperService 同口径，
 * mock 档走 MockNotificationService 内存实现，演示链路完整）。</p>
 */
@Profile("mock")
@Service
public class MockWhisperService implements WhisperService {

    private final Map<Long, WhisperMessageView> store = new ConcurrentHashMap<>();
    private final AtomicLong idSeq = new AtomicLong(1000);

    /** 到达通知（required=false：单元测试直接 new 时为 null，跳过通知） */
    @Autowired(required = false)
    private NotificationService notificationService;

    @Override
    public WhisperMessageView send(Long senderId, WhisperSendRequest request) {
        long id = idSeq.incrementAndGet();
        WhisperMessageView view = new WhisperMessageView(
            id,
            senderId,
            request.receiverId(),
            request.content(),
            "SENT",
            200L,
            LocalDateTime.now().toString(),
            null,
            null,
            null
        );
        store.put(id, view);
        notifyReceiver(senderId, request.receiverId(), id);
        return view;
    }

    /** 到达通知（尽力而为，与 Real 同口径） */
    private void notifyReceiver(Long senderId, Long receiverId, Long whisperId) {
        if (notificationService == null) {
            return;
        }
        try {
            notificationService.createSystemNotification(
                    receiverId, senderId, "你收到一条新的悄悄话，点击查看", whisperId, "whisper");
        } catch (RuntimeException ex) {
            // mock 档通知失败只记日志（保持与 Real 相同的尽力而为语义）
        }
    }

    @Override
    public List<WhisperMessageView> inbox(Long receiverId) {
        return store.values().stream()
            .filter(v -> v.receiverId().equals(receiverId))
            .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
            .toList();
    }

    @Override
    public List<WhisperMessageView> sent(Long senderId) {
        return store.values().stream()
            .filter(v -> v.senderId().equals(senderId))
            .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
            .toList();
    }

    /** R9-b（2026-11-05）：mock 未读数——store 只有成功发送（SENT/DELIVERED/READ），非 READ 即未读 */
    @Override
    public long unreadCount(Long receiverId) {
        return store.values().stream()
            .filter(v -> v.receiverId().equals(receiverId))
            .filter(v -> !"READ".equals(v.status()))
            .count();
    }

    @Override
    public WhisperMessageView markRead(Long receiverId, Long whisperId) {
        WhisperMessageView v = store.get(whisperId);
        if (v == null || !v.receiverId().equals(receiverId)) {
            throw new IllegalArgumentException("悄悄话不存在");
        }
        // R6-1 同构：非送达态（假想扩展出审计行时）视同不存在，与 Real 口径一致
        if ("PAY_FAILED".equals(v.status()) || "REFUNDED".equals(v.status())) {
            throw new IllegalArgumentException("悄悄话不存在");
        }
        WhisperMessageView updated = new WhisperMessageView(
            v.id(), v.senderId(), v.receiverId(), v.content(), "READ",
            v.priceCents(), v.createdAt(), LocalDateTime.now().toString(),
            v.senderNickname(), v.senderAvatar()
        );
        store.put(whisperId, updated);
        return updated;
    }
}
