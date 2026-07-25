package com.campuslove.api.growth;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 通知免打扰设置请求体（功能6）。
 *
 * <p>校验规则：
 * <ul>
 *   <li>enabled：必填，控制免打扰总开关</li>
 *   <li>startTime / endTime：必填，HH:mm 格式（24小时制）</li>
 *   <li>repeatMode：必填，仅允许 EVERYDAY / WEEKDAYS / WEEKENDS / CUSTOM</li>
 *   <li>customWeekdays：可选，CUSTOM 模式下必填，CSV 格式（如 "1,3,5"），每个值 1-7</li>
 *   <li>allowUrgent：必填，控制是否允许紧急消息穿透</li>
 * </ul>
 * </p>
 *
 * @param enabled        是否开启免打扰
 * @param startTime      免打扰开始时间（HH:mm）
 * @param endTime        免打扰结束时间（HH:mm）
 * @param repeatMode     重复方式
 * @param customWeekdays 自定义星期（CSV，1-7），仅 CUSTOM 模式有值
 * @param allowUrgent    是否允许紧急消息穿透
 */
public record DoNotDisturbRequest(
        @NotNull Boolean enabled,
        @NotNull @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$",
                message = "开始时间格式必须为 HH:mm") String startTime,
        @NotNull @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$",
                message = "结束时间格式必须为 HH:mm") String endTime,
        @NotNull @Pattern(regexp = "^(EVERYDAY|WEEKDAYS|WEEKENDS|CUSTOM)$",
                message = "重复方式必须为 EVERYDAY/WEEKDAYS/WEEKENDS/CUSTOM") String repeatMode,
        @Size(max = 16, message = "自定义星期长度不能超过 16") String customWeekdays,
        @NotNull Boolean allowUrgent
) {
}
