package com.campuslove.api.user;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * 在线状态感知服务 Mock 实现。
 * 在 mock profile 下激活，返回模拟的在线状态数据。
 */
@Profile("mock")
@Service
public class MockOnlineStatusService implements OnlineStatusService {

    @Override
    public void updateHeartbeat(Long userId, String deviceType) {
        // Mock 实现：不做任何操作
    }

    @Override
    public OnlineStatusView getOnlineStatus(Long userId) {
        return new OnlineStatusView(userId, "offline", null, null);
    }

    @Override
    public Map<Long, OnlineStatusView> batchGetOnlineStatus(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, OnlineStatusView> result = new java.util.HashMap<>();
        for (Long userId : userIds) {
            result.put(userId, new OnlineStatusView(userId, "offline", null, null));
        }
        return result;
    }

    @Override
    public int checkAndMarkOfflineUsers() {
        return 0;
    }
}
