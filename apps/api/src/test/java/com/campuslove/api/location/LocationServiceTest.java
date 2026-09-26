package com.campuslove.api.location;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * LOCATION-001 的服务端一半：/location/ip-city 必须把城市中心坐标一起交出去，
 * 否则调用方量不出"IP 城市"与"本次坐标"的距离，>100km 丢弃判据无从执行。
 *
 * <p>同时钉住反向情形：城市不在中心表里时坐标必须是 null（语义＝量不出来），
 * 不能是 0.0 —— 那会让任何坐标都"距离很近"，守卫静默失效。</p>
 */
class LocationServiceTest {

    private LocationService demo() {
        return new LocationService("南京", true);
    }

    @Test
    @DisplayName("演示网段命中的城市带出中心坐标")
    void demoNetCityCarriesCenter() {
        LocationCityView hangzhou = demo().resolveCityView("60.191.23.45");
        assertThat(hangzhou.city()).isEqualTo("杭州");
        assertThat(hangzhou.latitude()).isBetween(30.0, 30.6);
        assertThat(hangzhou.longitude()).isBetween(120.0, 120.5);
    }

    @Test
    @DisplayName("内网 IP 走默认城市，同样带中心坐标")
    void privateIpFallsBackToDefaultCityWithCenter() {
        LocationCityView view = demo().resolveCityView("127.0.0.1");
        assertThat(view.city()).isEqualTo("南京");
        assertThat(view.latitude()).isNotNull();
        assertThat(view.longitude()).isNotNull();
    }

    @Test
    @DisplayName("中心表没有这个城市时坐标是 null，不是 0")
    void unknownCityHasNoCenterRatherThanZero() {
        LocationService suzhou = new LocationService("苏州", false);
        LocationCityView view = suzhou.resolveCityView("8.8.8.8");
        assertThat(view.city()).isEqualTo("苏州");
        assertThat(view.latitude()).isNull();
        assertThat(view.longitude()).isNull();
    }
}
