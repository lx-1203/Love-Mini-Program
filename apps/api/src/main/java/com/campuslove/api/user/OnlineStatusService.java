package com.campuslove.api.user;

import java.util.List;
import java.util.Map;

/**
 * 在线状态感知服务接口。
 * 提供心跳更新、在线状态查询、批量查询和离线检查等功能。
 */
public interface OnlineStatusService {

    /**
     * 更新用户心跳时间，标记为在线。
     * 如果用户无在线状态记录，则创建新记录。
     *
     * @param userId     用户 ID
     * @param deviceType 设备类型（如 android / ios / web）
     */
    void updateHeartbeat(Long userId, String deviceType);

    /**
     * 查询单个用户的在线状态。
     *
     * @param userId 用户 ID
     * @return 在线状态视图
     */
    OnlineStatusView getOnlineStatus(Long userId);

    /**
     * 批量查询多个用户的在线状态。
     *
     * @param userIds 用户 ID 列表
     * @return 用户 ID 到在线状态视图的映射
     */
    Map<Long, OnlineStatusView> batchGetOnlineStatus(List<Long> userIds);

    /**
     * 定时检查并标记超时无心跳的用户为离线。
     * 超过 5 分钟无心跳的用户将被标记为 offline。
     *
     * @return 被标记为离线的用户数
     */
    int checkAndMarkOfflineUsers();
}
