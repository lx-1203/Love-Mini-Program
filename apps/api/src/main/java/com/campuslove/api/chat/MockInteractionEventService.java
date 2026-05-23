package com.campuslove.api.chat;

import java.util.Collections;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 互动事件服务 Mock 实现。
 * 在 mock profile 下激活，返回模拟的互动事件数据。
 */
@Profile("mock")
@Service
public class MockInteractionEventService implements InteractionEventService {

    @Override
    public void recordEvent(Long userId, Long triggerUserId, String eventType,
                            Long referenceId, String referenceType, String summary) {
        // Mock 实现：不做任何操作
    }

    @Override
    public List<InteractionEventView> getInteractionEvents(Long userId, int page, int size) {
        return Collections.emptyList();
    }

    @Override
    public long getUnreadCount(Long userId) {
        return 0;
    }

    @Override
    public void markAsRead(Long eventId, Long userId) {
        // Mock 实现：不做任何操作
    }

    @Override
    public void markAllAsRead(Long userId) {
        // Mock 实现：不做任何操作
    }
}
