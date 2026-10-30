package com.campuslove.api.monitor;

import io.micrometer.core.instrument.MeterRegistry;
import java.util.List;
import java.util.Map;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 应用健康状态指标（2026-10-29 第二轮排查补齐）。
 *
 * <p>背景：{@code docker/prometheus/rules/alert-rules.yml} 里的
 * {@code ApiHealthCheckFailed} 引用了 {@code spring_boot_health_status}，
 * 但 Spring Boot 3 + micrometer 并不会自动导出这个指标 —— 规则从建立起就没有数据源，
 * 永远不触发（文件里的注释其实已经承认了这点）。也就是说"数据库/Redis 组件 DOWN"
 * 这类故障当时只能靠人肉看日志。</p>
 *
 * <p>本类显式注册 {@code app.health.status}，按 {@code status} 标签各出一条 gauge：
 * 当前命中的那个状态取 1，其余取 0。这样 {@code app_health_status\{status="DOWN"\} > 0}
 * 是一个真实可触发的表达式，且状态名固定四种、不会造成标签基数膨胀。</p>
 *
 * <p>为什么用定时刷新而不是在抓取时现算：micrometer 的 gauge 读取的是注册时绑定的
 * supplier，而 {@link HealthEndpoint} 会真正去探活（DB/Redis ping），
 * 每次抓取都同步探活会把监控流量变成对依赖的压测。这里以 15s 刷新一次，
 * 与 prometheus 的 scrape_interval 同量级。</p>
 */
@Component
@Profile("real")
public class HealthMetrics {

    /** 指标名（prometheus 侧为 app_health_status） */
    static final String METRIC_HEALTH_STATUS = "app.health.status";

    /** 状态名固定枚举，避免标签基数失控 */
    private static final List<String> KNOWN_STATUSES = List.of("UP", "UNKNOWN", "OUT_OF_SERVICE", "DOWN");

    private final HealthEndpoint healthEndpoint;
    /** status → 对应的 gauge；当前状态命中时值为 1 */
    private final Map<String, io.micrometer.core.instrument.Gauge> gaugesByStatus;
    /** 最近一次探活结果的状态名 */
    private volatile String currentStatus = "UNKNOWN";

    public HealthMetrics(HealthEndpoint healthEndpoint, MeterRegistry meterRegistry) {
        this.healthEndpoint = healthEndpoint;
        this.gaugesByStatus = new java.util.LinkedHashMap<>();
        for (String status : KNOWN_STATUSES) {
            gaugesByStatus.put(status, io.micrometer.core.instrument.Gauge
                    .builder(METRIC_HEALTH_STATUS, this, m -> status.equals(m.currentStatus) ? 1d : 0d)
                    .tag("status", status)
                    .description("应用健康状态（命中的状态为 1，其余为 0）")
                    .register(meterRegistry));
        }
        refresh();
    }

    /** 刷新探活结果。首次构造即执行一次，之后每 15s 一次。 */
    @Scheduled(fixedDelay = 15_000, initialDelay = 15_000)
    public void refresh() {
        this.currentStatus = resolveStatus();
    }

    /** 当前状态名（UP / DOWN / OUT_OF_SERVICE / UNKNOWN）。 */
    public String getCurrentStatus() {
        return currentStatus;
    }

    private String resolveStatus() {
        try {
            HealthComponent health = healthEndpoint.health();
            Status status = health == null ? null : health.getStatus();
            if (status == null) {
                return "UNKNOWN";
            }
            String code = status.getCode();
            return KNOWN_STATUSES.contains(code) ? code : "UNKNOWN";
        } catch (RuntimeException ex) {
            // 探活本身异常 ⇒ 按 UNKNOWN 计，不让监控组件把异常扩散成 500
            return "UNKNOWN";
        }
    }

    /** 仅供测试断言注册数量与名字（不产生额外行为）。 */
    int registeredGauges() {
        return gaugesByStatus.size();
    }
}
