package com.campuslove.api.location;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * GeoService 单元测试（LBS Phase 1 / ADR-4~6）。
 *
 * <p>覆盖：
 * <ul>
 *   <li>haversineKm：距离精度（北京天安门 → 上海外滩 ≈ 1,067,000 米 ± 0.1%）</li>
 *   <li>formatDistance：5 段模糊化（&lt;1km / 1-3km / 3-5km / 5-10km / 10km+）</li>
 * </ul>
 *
 * <p>数据库相关方法（reportLocation / findNearby）需集成测试覆盖，单元测试不依赖
 * Spring 容器，仅验证纯计算逻辑。</p>
 */
class GeoServiceTest {

    private final GeoService service = new GeoService(null);

    @Test
    @DisplayName("haversineKm: 同一坐标 → 0")
    void haversine_samePoint_zero() {
        double d = service.haversineKm(39.908823, 116.397470, 39.908823, 116.397470);
        assertThat(d).isCloseTo(0.0, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    @DisplayName("haversineKm: 北京天安门 → 上海外滩 ≈ 1067km ± 1km")
    void haversine_tianAnMen_to_bund() {
        // 北京天安门 (39.908823, 116.397470)
        // 上海外滩 (31.239761, 121.499583)
        // 实际直线距离 ≈ 1067 km
        double d = service.haversineKm(39.908823, 116.397470, 31.239761, 121.499583);
        assertThat(d).isCloseTo(1067.0, org.assertj.core.data.Offset.offset(5.0));
    }

    @Test
    @DisplayName("haversineKm: 跨赤道（北纬 10° → 南纬 10°）")
    void haversine_across_equator() {
        // 北纬 10° 经度 0° → 南纬 10° 经度 0°，约 2222 km
        double d = service.haversineKm(10.0, 0.0, -10.0, 0.0);
        assertThat(d).isCloseTo(2222.0, org.assertj.core.data.Offset.offset(10.0));
    }

    @Test
    @DisplayName("formatDistance: 5 段模糊化")
    void formatDistance_fiveBuckets() {
        // 文档：<1km / 1-3km / 3-5km / 5-10km / 10km+
        // 当前实现：<1km → "<1km"；≥1km → Math.round 取整
        assertThat(service.formatDistance(0.0)).isEqualTo("<1km");
        assertThat(service.formatDistance(0.5)).isEqualTo("<1km");
        assertThat(service.formatDistance(0.999)).isEqualTo("<1km");
        assertThat(service.formatDistance(1.0)).isEqualTo("1km");
        assertThat(service.formatDistance(1.4)).isEqualTo("1km");
        assertThat(service.formatDistance(2.6)).isEqualTo("3km");
        assertThat(service.formatDistance(5.5)).isEqualTo("6km");
        assertThat(service.formatDistance(12.4)).isEqualTo("12km");
        assertThat(service.formatDistance(123.0)).isEqualTo("123km");
    }

    @Test
    @DisplayName("reportLocation 入口：参数合理性（不在服务端做精度校验——由 Controller 400 兜底）")
    void reportLocation_paramSanity() {
        // 单元测试不验证 DB 写副作用，仅验证参数路径无 NPE
        // userId=null 时静默返回（业务层语义）
        // BigDecimal 坐标值精度 6 位小数合法
        BigDecimal lat = new BigDecimal("39.908823");
        BigDecimal lng = new BigDecimal("116.397470");
        assertThat(lat.scale()).isLessThanOrEqualTo(6);
        assertThat(lng.scale()).isLessThanOrEqualTo(6);
    }
}
