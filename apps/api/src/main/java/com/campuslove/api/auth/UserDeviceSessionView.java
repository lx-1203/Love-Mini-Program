package com.campuslove.api.auth;

import java.time.LocalDateTime;

/**
 * 用户设备会话视图（GET /api/v1/auth/devices 响应项）。
 *
 * @param id           设备记录 ID（吊销时使用）
 * @param deviceId     设备标识
 * @param platform     登录平台（wechat/phone/apple/guest/unknown）
 * @param lastActiveAt 最近活跃时间
 * @param revoked      是否已被吊销（前端置灰展示）
 * @param createdAt    首次登录时间
 */
public record UserDeviceSessionView(
        Long id,
        String deviceId,
        String platform,
        LocalDateTime lastActiveAt,
        boolean revoked,
        LocalDateTime createdAt
) {

    /**
     * 从实体构造视图。
     *
     * @param entity 设备实体
     * @return 视图
     */
    public static UserDeviceSessionView from(UserDeviceSession entity) {
        return new UserDeviceSessionView(
                entity.getId(),
                entity.getDeviceId(),
                entity.getPlatform(),
                entity.getLastActiveAt(),
                Boolean.TRUE.equals(entity.getRevoked()),
                entity.getCreatedAt()
        );
    }
}
