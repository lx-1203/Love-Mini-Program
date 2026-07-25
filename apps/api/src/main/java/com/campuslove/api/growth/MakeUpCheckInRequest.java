package com.campuslove.api.growth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 签到补签请求体（功能7）。
 *
 * 对应 POST /api/check-in/make-up 端点。
 * date 字段必须为 yyyy-MM-dd 格式，且只能补签昨日及之前 7 天内的日期。
 */
public record MakeUpCheckInRequest(

    /** 补签日期（yyyy-MM-dd），必填 */
    @NotBlank(message = "补签日期不能为空")
    @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "日期格式必须为 yyyy-MM-dd")
    String date
) {
}
