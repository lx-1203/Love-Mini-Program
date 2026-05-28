package com.campuslove.api.growth;

import com.campuslove.api.entity.PushPreference;

/**
 * 推送偏好服务接口。
 * 提供用户推送偏好的查询和更新功能。
 */
public interface PushPreferenceService {

    /**
     * 获取指定用户的推送偏好设置。
     * 如果用户尚未设置，则返回默认偏好（启用推送、每日1次、无活跃时段限制）。
     *
     * @param userId 用户 ID
     * @return 推送偏好设置
     */
    PushPreference getPreference(Long userId);

    /**
     * 更新指定用户的推送偏好设置。
     * 如果用户尚无偏好记录，则自动创建。
     *
     * @param userId         用户 ID
     * @param pushEnabled    是否启用推送
     * @param pushFrequency  每日最大推送次数
     * @param activeHours    活跃时段，如 "10-12,14-16,20-22"
     * @return 更新后的推送偏好设置
     */
    PushPreference updatePreference(Long userId, Boolean pushEnabled,
                                    Integer pushFrequency, String activeHours);
}