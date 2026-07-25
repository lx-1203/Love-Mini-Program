package com.campuslove.api.growth;

/**
 * 通知免打扰设置视图（功能6）。
 *
 * <p>仅返回前端展示所需字段，不暴露实体内部状态。</p>
 *
 * @param enabled        是否开启免打扰
 * @param startTime      免打扰开始时间（HH:mm）
 * @param endTime        免打扰结束时间（HH:mm）
 * @param repeatMode     重复方式：EVERYDAY / WEEKDAYS / WEEKENDS / CUSTOM
 * @param customWeekdays 自定义星期（CSV，1-7），仅 CUSTOM 模式有值
 * @param allowUrgent    是否允许紧急消息穿透免打扰
 */
public record DoNotDisturbView(
        boolean enabled,
        String startTime,
        String endTime,
        String repeatMode,
        String customWeekdays,
        boolean allowUrgent
) {
}
