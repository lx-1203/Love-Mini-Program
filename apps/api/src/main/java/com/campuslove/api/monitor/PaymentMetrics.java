package com.campuslove.api.monitor;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 支付业务监控指标。
 *
 * <p>指标说明：</p>
 * <ul>
 *   <li>{@code payment.callback.latency}：支付回调耗时（Timer，支持百分位统计）</li>
 * </ul>
 *
 * <p>R4-00434：VIP 已下线，原 {@code payment.vip.purchased} / {@code payment.vip.cancelled}
 * 指标及对应方法已清理（无任何调用方，避免下线功能残留埋点误导指标统计）。
 * 后续接入微信支付/支付宝后，可在本类按需补充支付相关指标。</p>
 *
 * <p>容错策略：所有指标记录方法均使用 try-catch 包裹，失败时只记录日志不抛出异常。</p>
 */
@Component
public class PaymentMetrics {

    private static final Logger log = LoggerFactory.getLogger(PaymentMetrics.class);

    /** 支付回调耗时计时器指标名 */
    private static final String METRIC_CALLBACK_LATENCY = "payment.callback.latency";

    /** 支付回调耗时计时器 */
    private final Timer callbackLatencyTimer;

    public PaymentMetrics(MeterRegistry meterRegistry) {
        // 回调耗时计时器，发布 p50/p95/p99 百分位
        this.callbackLatencyTimer = Timer.builder(METRIC_CALLBACK_LATENCY)
                .description("支付回调处理耗时")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry);
    }

    /**
     * 记录一次支付回调处理耗时。
     *
     * @param durationMs 耗时（毫秒）
     */
    public void recordCallbackLatency(long durationMs) {
        try {
            // 使用 Duration 包装毫秒值，避免负数或溢出问题
            callbackLatencyTimer.record(Duration.ofMillis(Math.max(0, durationMs)));
        } catch (RuntimeException e) {
            log.warn("记录 payment.callback.latency 指标失败, durationMs={}: {}", durationMs, e.getMessage());
        }
    }
}
