package com.campuslove.api.common;

import java.time.LocalDate;
import java.time.Period;

/**
 * 年龄校验工具（3-N 未成年人保护）。
 *
 * <p>成年判定：以业务时区（{@link TimeZones#BUSINESS}）当天为基准，
 * 年龄 = 出生日期到今天的完整年数（Period），大于等于 {@link #ADULT_AGE} 视为成年。</p>
 */
public final class AgePolicy {

    private AgePolicy() {
        // 工具类，禁止实例化
    }

    /** 成年年龄阈值：未满 18 周岁禁止注册/使用 */
    public static final int ADULT_AGE = 18;

    /**
     * 判断出生日期对应的用户是否已成年（年龄 >= 18）。
     *
     * @param birthDate 出生日期（null 视为未成年——资料缺失时从严拒绝注册）
     * @return true 表示已成年
     */
    public static boolean isAdult(LocalDate birthDate) {
        if (birthDate == null) {
            return false;
        }
        LocalDate today = LocalDate.now(TimeZones.BUSINESS);
        return Period.between(birthDate, today).getYears() >= ADULT_AGE;
    }

    /**
     * 计算出生日期对应的年龄（完整年数）。
     *
     * @param birthDate 出生日期（null 返回 -1）
     * @return 年龄；birthDate 为 null 时返回 -1
     */
    public static int ageOf(LocalDate birthDate) {
        if (birthDate == null) {
            return -1;
        }
        return Period.between(birthDate, LocalDate.now(TimeZones.BUSINESS)).getYears();
    }
}
