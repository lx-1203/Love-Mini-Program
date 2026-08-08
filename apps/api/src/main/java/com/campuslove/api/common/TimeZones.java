package com.campuslove.api.common;

import java.time.ZoneId;

/** R4 审计：统一业务时区（与 DB serverTimezone=Asia/Shanghai 对齐） */
public final class TimeZones {

    public static final ZoneId BUSINESS = ZoneId.of("Asia/Shanghai");

    private TimeZones() {
    }
}
