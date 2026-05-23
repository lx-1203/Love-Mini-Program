package com.campuslove.api.user;

/**
 * 用户在线状态视图。
 * 用于返回用户的在线状态信息。
 *
 * @param userId        用户 ID
 * @param status        在线状态（online / away / offline）
 * @param lastHeartbeat 最后心跳时间（ISO 格式字符串），无记录时为 null
 * @param deviceType    设备类型，无记录时为 null
 */
public record OnlineStatusView(
    Long userId,
    String status,
    String lastHeartbeat,
    String deviceType
) {}
