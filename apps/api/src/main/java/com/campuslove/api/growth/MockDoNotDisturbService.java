package com.campuslove.api.growth;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 通知免打扰服务实现（功能6）。
 *
 * <p>在 mock profile 下激活，使用内存存储返回模拟数据，便于本地联调。</p>
 */
@Profile("mock")
@Service
public class MockDoNotDisturbService implements DoNotDisturbService {

    /** 模拟偏好缓存：userId -> DoNotDisturbSetting 内部表示 */
    private final ConcurrentHashMap<Long, DoNotDisturbView> cache = new ConcurrentHashMap<>();

    /**
     * 获取指定用户的免打扰设置。
     * 用户首次访问时返回默认偏好并缓存。
     *
     * @param userId 用户 ID
     * @return 免打扰设置视图
     */
    @Override
    public DoNotDisturbView getSetting(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return cache.computeIfAbsent(userId, uid -> new DoNotDisturbView(
                false, "22:00", "08:00", "EVERYDAY", null, true
        ));
    }

    /**
     * 更新指定用户的免打扰设置。
     * 校验逻辑与 Real 实现保持一致。
     *
     * @param userId  用户 ID
     * @param request 免打扰设置请求
     * @return 更新后的免打扰设置视图
     */
    @Override
    public DoNotDisturbView updateSetting(Long userId, DoNotDisturbRequest request) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (request == null) {
            throw new IllegalArgumentException("request is required");
        }

        // 业务校验：CUSTOM 模式下 customWeekdays 必填
        if ("CUSTOM".equals(request.repeatMode())) {
            if (request.customWeekdays() == null || request.customWeekdays().isBlank()) {
                throw new IllegalArgumentException("CUSTOM 模式下必须指定 customWeekdays");
            }
        }

        // 业务校验：startTime 与 endTime 不能相同
        if (request.startTime().equals(request.endTime())) {
            throw new IllegalArgumentException("开始时间与结束时间不能相同");
        }

        DoNotDisturbView view = new DoNotDisturbView(
                request.enabled(),
                request.startTime(),
                request.endTime(),
                request.repeatMode(),
                "CUSTOM".equals(request.repeatMode()) ? request.customWeekdays() : null,
                request.allowUrgent()
        );
        cache.put(userId, view);
        return view;
    }
}
