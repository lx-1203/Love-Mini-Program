package com.campuslove.api.growth;

/**
 * 通知免打扰服务接口（功能6）。
 *
 * <p>提供用户免打扰偏好的查询和更新功能。
 * 实现方需保证：
 * <ul>
 *   <li>用户首次访问时返回默认偏好（关闭免打扰、22:00-08:00、每天重复、允许紧急穿透）</li>
 *   <li>更新时若用户尚无记录则自动创建，已有记录则覆盖更新</li>
 *   <li>对 startTime/endTime/repeatMode 进行业务校验（如时间格式、枚举值合法性）</li>
 * </ul>
 * </p>
 */
public interface DoNotDisturbService {

    /**
     * 获取指定用户的免打扰设置。
     * 如果用户尚未设置，则返回默认偏好。
     *
     * @param userId 用户 ID
     * @return 免打扰设置视图（永不返回 null）
     */
    DoNotDisturbView getSetting(Long userId);

    /**
     * 更新指定用户的免打扰设置。
     * 如果用户尚无记录，则自动创建。
     *
     * @param userId  用户 ID
     * @param request 免打扰设置请求
     * @return 更新后的免打扰设置视图
     */
    DoNotDisturbView updateSetting(Long userId, DoNotDisturbRequest request);
}
