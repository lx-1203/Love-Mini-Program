package com.campuslove.api.mock;

import com.campuslove.api.auth.DeviceSessionService;
import com.campuslove.api.auth.UserDeviceSessionView;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 设备会话服务实现（3-D 设备管理）。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 *
 * <p>语义与 real 对齐：</p>
 * <ul>
 *   <li>recordLogin：UPSERT（同用户同设备更新平台/活跃时间并复活）</li>
 *   <li>listDevices：返回内存记录（含已吊销）</li>
 *   <li>revokeDevice：属主校验 + 置 revoked（mock 无真实 token 黑名单，仅置位）</li>
 *   <li>revokeAllUserTokens：全部置 revoked</li>
 * </ul>
 */
@Profile("mock")
@Service
public class MockDeviceSessionService implements DeviceSessionService {

    private static final Logger log = LoggerFactory.getLogger(MockDeviceSessionService.class);

    private final AtomicLong idSeq = new AtomicLong(1);
    /** key: userId，value: 设备记录列表（内存存储） */
    private final Map<Long, List<UserDeviceSessionView>> store = new LinkedHashMap<>();

    @Override
    public void recordLogin(Long userId, String deviceId, String platform, String jti) {
        if (userId == null) {
            return;
        }
        String effectiveDeviceId = deviceId == null || deviceId.isBlank() ? "unknown" : deviceId.trim();
        List<UserDeviceSessionView> devices = store.computeIfAbsent(userId, k -> new ArrayList<>());
        LocalDateTime now = LocalDateTime.now(com.campuslove.api.common.TimeZones.BUSINESS);

        for (int i = 0; i < devices.size(); i++) {
            if (effectiveDeviceId.equals(devices.get(i).deviceId())) {
                UserDeviceSessionView old = devices.get(i);
                devices.set(i, new UserDeviceSessionView(
                        old.id(), old.deviceId(), platform != null ? platform : "unknown",
                        now, false, old.createdAt()));
                return;
            }
        }
        devices.add(new UserDeviceSessionView(
                idSeq.getAndIncrement(), effectiveDeviceId, platform != null ? platform : "unknown",
                now, false, now));
        log.info("mock 记录登录设备: userId={}, deviceId={}", userId, effectiveDeviceId);
    }

    @Override
    public List<UserDeviceSessionView> listDevices(Long userId) {
        return store.getOrDefault(userId, List.of());
    }

    @Override
    public void revokeDevice(Long userId, Long deviceId) {
        List<UserDeviceSessionView> devices = store.getOrDefault(userId, List.of());
        for (int i = 0; i < devices.size(); i++) {
            UserDeviceSessionView d = devices.get(i);
            if (d.id().equals(deviceId)) {
                if (d.revoked()) {
                    return; // 幂等
                }
                devices.set(i, new UserDeviceSessionView(
                        d.id(), d.deviceId(), d.platform(), d.lastActiveAt(), true, d.createdAt()));
                log.info("mock 吊销设备: userId={}, deviceId={}", userId, d.deviceId());
                return;
            }
        }
        log.warn("mock 吊销设备未找到: userId={}, deviceId={}", userId, deviceId);
    }

    @Override
    public void revokeAllUserTokens(Long userId) {
        List<UserDeviceSessionView> devices = store.getOrDefault(userId, List.of());
        for (int i = 0; i < devices.size(); i++) {
            UserDeviceSessionView d = devices.get(i);
            if (!d.revoked()) {
                devices.set(i, new UserDeviceSessionView(
                        d.id(), d.deviceId(), d.platform(), d.lastActiveAt(), true, d.createdAt()));
            }
        }
        log.info("mock 吊销用户全部设备 token: userId={}", userId);
    }
}
