package com.campuslove.api.user;

import com.campuslove.api.entity.UserOnlineStatus;
import com.campuslove.api.entity.UserOnlineStatus.OnlineStatus;
import com.campuslove.api.repository.UserOnlineStatusRepository;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 在线状态感知服务真实实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供心跳更新、在线状态查询、批量查询和离线检查等功能。
 */
@Profile("real")
@Service
public class RealOnlineStatusService implements OnlineStatusService {

    private static final Logger log = LoggerFactory.getLogger(RealOnlineStatusService.class);

    /** 心跳超时阈值（分钟），超过此时间无心跳则标记为离线 */
    private static final int HEARTBEAT_TIMEOUT_MINUTES = 5;

    private final UserOnlineStatusRepository userOnlineStatusRepository;

    public RealOnlineStatusService(UserOnlineStatusRepository userOnlineStatusRepository) {
        this.userOnlineStatusRepository = userOnlineStatusRepository;
    }

    /**
     * 更新用户心跳时间，标记为在线。
     * 如果用户无在线状态记录，则创建新记录；
     * 如果已有记录，则更新心跳时间和状态为 online。
     *
     * @param userId     用户 ID
     * @param deviceType 设备类型（如 android / ios / web）
     */
    @Override
    @Transactional
    public void updateHeartbeat(Long userId, String deviceType) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        LocalDateTime now = LocalDateTime.now();

        Optional<UserOnlineStatus> existing = userOnlineStatusRepository.findByUserId(userId);
        if (existing.isPresent()) {
            // 更新已有记录
            UserOnlineStatus status = existing.get();
            status.setLastHeartbeat(now);
            status.setStatus(OnlineStatus.online);
            status.setDeviceType(deviceType);
            status.setUpdatedAt(now);
            userOnlineStatusRepository.save(status);
        } else {
            // 创建新记录
            UserOnlineStatus status = new UserOnlineStatus();
            status.setUserId(userId);
            status.setLastHeartbeat(now);
            status.setStatus(OnlineStatus.online);
            status.setDeviceType(deviceType);
            status.setUpdatedAt(now);
            userOnlineStatusRepository.save(status);
        }

        log.debug("用户心跳更新成功, userId={}, deviceType={}", userId, deviceType);
    }

    /**
     * 查询单个用户的在线状态。
     * 如果用户无在线状态记录，返回 offline 状态。
     *
     * @param userId 用户 ID
     * @return 在线状态视图
     */
    @Override
    @Transactional(readOnly = true)
    public OnlineStatusView getOnlineStatus(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        Optional<UserOnlineStatus> statusOpt = userOnlineStatusRepository.findByUserId(userId);
        if (statusOpt.isEmpty()) {
            return new OnlineStatusView(userId, "offline", null, null);
        }

        UserOnlineStatus status = statusOpt.get();
        return new OnlineStatusView(
                status.getUserId(),
                status.getStatus().name(),
                status.getLastHeartbeat().toString(),
                status.getDeviceType()
        );
    }

    /**
     * 批量查询多个用户的在线状态。
     * 对于无在线状态记录的用户，返回 offline 状态。
     *
     * @param userIds 用户 ID 列表
     * @return 用户 ID 到在线状态视图的映射
     */
    @Override
    @Transactional(readOnly = true)
    public Map<Long, OnlineStatusView> batchGetOnlineStatus(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }

        // 批量查询已有记录
        List<UserOnlineStatus> statusList = userOnlineStatusRepository.findByUserIdIn(userIds);

        // 构建已有记录的映射
        Map<Long, OnlineStatusView> result = new HashMap<>();
        for (UserOnlineStatus status : statusList) {
            result.put(status.getUserId(), new OnlineStatusView(
                    status.getUserId(),
                    status.getStatus().name(),
                    status.getLastHeartbeat().toString(),
                    status.getDeviceType()
            ));
        }

        // 对于无记录的用户，填充 offline 状态
        for (Long userId : userIds) {
            if (!result.containsKey(userId)) {
                result.put(userId, new OnlineStatusView(userId, "offline", null, null));
            }
        }

        return result;
    }

    /**
     * 定时检查并标记超时无心跳的用户为离线。
     * 超过 HEARTBEAT_TIMEOUT_MINUTES（5分钟）无心跳的用户将被标记为 offline。
     *
     * @return 被标记为离线的用户数
     */
    @Override
    @Transactional
    public int checkAndMarkOfflineUsers() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(HEARTBEAT_TIMEOUT_MINUTES);
        int updatedCount = userOnlineStatusRepository.updateStatusByLastHeartbeatBefore(threshold);

        if (updatedCount > 0) {
            log.info("定时检查在线状态：{} 个用户被标记为离线", updatedCount);
        }

        return updatedCount;
    }
}
