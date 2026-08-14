package com.campuslove.api.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/**
 * 年龄校验工具单元测试（3-N 未成年人保护）。
 *
 * <p>覆盖 {@link AgePolicy#isAdult} 的边界：恰好 18 岁（成年）、17 岁（未成年）、
 * 当天生日、未来日期、null（视为未成年）。</p>
 */
class AgePolicyTest {

    @Test
    void isAdult_exactly18_returnsTrue() {
        LocalDate birthDate = LocalDate.now(TimeZones.BUSINESS).minusYears(18);
        assertTrue(AgePolicy.isAdult(birthDate), "恰好 18 岁应视为成年");
    }

    @Test
    void isAdult_17YearsOld_returnsFalse() {
        LocalDate birthDate = LocalDate.now(TimeZones.BUSINESS).minusYears(17);
        assertFalse(AgePolicy.isAdult(birthDate), "17 岁应视为未成年");
    }

    @Test
    void isAdult_justBelow18ByOneDay_returnsFalse() {
        // 距 18 岁生日仅差 1 天：Period.getYears() = 17
        LocalDate birthDate = LocalDate.now(TimeZones.BUSINESS).minusYears(18).plusDays(1);
        assertFalse(AgePolicy.isAdult(birthDate), "差 1 天才满 18 岁应视为未成年");
    }

    @Test
    void isAdult_30YearsOld_returnsTrue() {
        LocalDate birthDate = LocalDate.now(TimeZones.BUSINESS).minusYears(30);
        assertTrue(AgePolicy.isAdult(birthDate));
    }

    @Test
    void isAdult_nullBirthDate_returnsFalse() {
        assertFalse(AgePolicy.isAdult(null), "出生日期缺失应从严视为未成年");
    }

    @Test
    void isAdult_futureBirthDate_returnsFalse() {
        assertFalse(AgePolicy.isAdult(LocalDate.now(TimeZones.BUSINESS).plusDays(1)), "未来日期应视为未成年");
    }

    @Test
    void ageOf_computesFullYears() {
        assertEquals(18, AgePolicy.ageOf(LocalDate.now(TimeZones.BUSINESS).minusYears(18)));
        assertEquals(20, AgePolicy.ageOf(LocalDate.now(TimeZones.BUSINESS).minusYears(20).minusMonths(6)));
        assertEquals(-1, AgePolicy.ageOf(null));
    }
}
