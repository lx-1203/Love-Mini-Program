package com.campuslove.api.growth;

import com.campuslove.api.entity.PushPreference;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 推送偏好服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 */
@Profile("mock")
@Service
public class MockPushPreferenceService implements PushPreferenceService {

    /** 模拟偏好缓存：userId -> PushPreference */
    private final ConcurrentHashMap<Long, PushPreference> preferenceCache = new ConcurrentHashMap<>();

    @Override
    public PushPreference getPreference(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        return preferenceCache.computeIfAbsent(userId, uid -> {
            PushPreference pref = new PushPreference();
            pref.setId(uid);
            pref.setUserId(uid);
            pref.setPushEnabled(true);
            pref.setPushFrequency(1);
            pref.setActiveHours("10-12,14-16,20-22");
            return pref;
        });
    }

    @Override
    public PushPreference updatePreference(Long userId, Boolean pushEnabled,
                                           Integer pushFrequency, String activeHours) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        PushPreference pref = getPreference(userId);
        if (pushEnabled != null) {
            pref.setPushEnabled(pushEnabled);
        }
        if (pushFrequency != null) {
            pref.setPushFrequency(pushFrequency);
        }
        if (activeHours != null) {
            pref.setActiveHours(activeHours);
        }
        preferenceCache.put(userId, pref);
        return pref;
    }
}