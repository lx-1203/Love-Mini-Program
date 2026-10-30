package com.campuslove.api.monitor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthEndpoint;

/**
 * {@link HealthMetrics} 单元测试。
 *
 * <p>它证明的是"告警规则有数据源"这件事：alert-rules.yml 里的
 * {@code app_health_status\{status="DOWN"\} > 0} 只有在 DOWN 那条 gauge 真的存在、
 * 且状态切换时会翻到 1 的前提下才可能触发。之前的
 * {@code spring_boot_health_status} 之所以是死规则，就是因为没人注册过它。</p>
 */
@DisplayName("HealthMetrics - 健康状态指标注册与翻转")
class HealthMetricsTest {

    private static Map<String, Double> valuesByStatus(SimpleMeterRegistry registry) {
        Map<String, Double> out = new java.util.LinkedHashMap<>();
        for (Gauge gauge : registry.find(HealthMetrics.METRIC_HEALTH_STATUS).gauges()) {
            out.put(gauge.getId().getTag("status"), gauge.value());
        }
        return out;
    }

    @Test
    @DisplayName("四种状态各注册一条 gauge，当前状态为 1、其余为 0")
    void registersOneGaugePerKnownStatus() {
        HealthEndpoint endpoint = mock(HealthEndpoint.class);
        when(endpoint.health()).thenReturn(Health.down().build());
        SimpleMeterRegistry registry = new SimpleMeterRegistry();

        HealthMetrics metrics = new HealthMetrics(endpoint, registry);

        assertEquals(4, metrics.registeredGauges(), "状态标签基数必须固定，否则指标会无界膨胀");
        assertEquals(
                Map.of("UP", 0d, "UNKNOWN", 0d, "OUT_OF_SERVICE", 0d, "DOWN", 1d),
                valuesByStatus(registry));
        assertEquals("DOWN", metrics.getCurrentStatus());
    }

    @Test
    @DisplayName("探活恢复后刷新，gauge 值随之翻转（规则要能自动消警）")
    void refreshFlipsGaugesWhenStatusChanges() {
        HealthEndpoint endpoint = mock(HealthEndpoint.class);
        when(endpoint.health()).thenReturn(Health.down().build());
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        HealthMetrics metrics = new HealthMetrics(endpoint, registry);

        when(endpoint.health()).thenReturn(Health.up().build());
        metrics.refresh();

        assertEquals(
                Map.of("UP", 1d, "UNKNOWN", 0d, "OUT_OF_SERVICE", 0d, "DOWN", 0d),
                valuesByStatus(registry));
    }

    @Test
    @DisplayName("未知状态与探活异常一律计入 UNKNOWN，不给第四个标签造值")
    void unknownAndFailureCollapseToUnknown() {
        HealthEndpoint endpoint = mock(HealthEndpoint.class);
        when(endpoint.health()).thenThrow(new IllegalStateException("探活组件炸了"));
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        HealthMetrics metrics = new HealthMetrics(endpoint, registry);

        assertEquals("UNKNOWN", metrics.getCurrentStatus());
        assertEquals(0d, valuesByStatus(registry).get("DOWN"));

        // 已有的 stub 是"抛异常"，改用 doReturn 形式重新打桩
        // （when(mock.method()) 会真的调用一次，直接把上一个 stub 的异常抛出来）
        org.mockito.Mockito.doReturn(Health.status("SOMETHING_ELSE").build()).when(endpoint).health();
        metrics.refresh();
        assertEquals("UNKNOWN", metrics.getCurrentStatus(), "未登记的状态码不得变成新标签");
    }
}
