package com.campuslove.api.whisper;

import com.campuslove.api.whisper.WhisperViews.WhisperMessageView;
import com.campuslove.api.whisper.WhisperViews.WhisperSendRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 悄悄话服务：内存实现，不扣费、不落库（走查/演示用）。
 */
@Profile("mock")
@Service
public class MockWhisperService implements WhisperService {

    private final Map<Long, WhisperMessageView> store = new ConcurrentHashMap<>();
    private final AtomicLong idSeq = new AtomicLong(1000);

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
            null
        );
        store.put(id, view);
        return view;
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

    @Override
    public WhisperMessageView markRead(Long receiverId, Long whisperId) {
        WhisperMessageView v = store.get(whisperId);
        if (v == null || !v.receiverId().equals(receiverId)) {
            throw new IllegalArgumentException("悄悄话不存在");
        }
        WhisperMessageView updated = new WhisperMessageView(
            v.id(), v.senderId(), v.receiverId(), v.content(), "READ",
            v.priceCents(), v.createdAt(), LocalDateTime.now().toString()
        );
        store.put(whisperId, updated);
        return updated;
    }
}
