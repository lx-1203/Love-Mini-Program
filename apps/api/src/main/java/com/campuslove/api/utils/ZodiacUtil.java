package com.campuslove.api.utils;

import java.time.LocalDate;

/** 星座推导工具（按公历生日，12 星座）。 */
public final class ZodiacUtil {
    private ZodiacUtil() {}

    public static String from(LocalDate birthDate) {
        if (birthDate == null) return null;
        return from(birthDate.getMonthValue(), birthDate.getDayOfMonth());
    }

    public static String from(int month, int day) {
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return switch (month) {
            case 1 -> day <= 19 ? "摩羯座" : "水瓶座";
            case 2 -> day <= 18 ? "水瓶座" : "双鱼座";
            case 3 -> day <= 20 ? "双鱼座" : "白羊座";
            case 4 -> day <= 19 ? "白羊座" : "金牛座";
            case 5 -> day <= 20 ? "金牛座" : "双子座";
            case 6 -> day <= 21 ? "双子座" : "巨蟹座";
            case 7 -> day <= 22 ? "巨蟹座" : "狮子座";
            case 8 -> day <= 22 ? "狮子座" : "处女座";
            case 9 -> day <= 22 ? "处女座" : "天秤座";
            case 10 -> day <= 23 ? "天秤座" : "天蝎座";
            case 11 -> day <= 22 ? "天蝎座" : "射手座";
            case 12 -> day <= 21 ? "射手座" : "摩羯座";
            default -> null;
        };
    }
}
