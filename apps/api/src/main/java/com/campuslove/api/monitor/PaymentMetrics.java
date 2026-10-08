package com.campuslove.api.monitor;

import io.micrometer.core.instrument.Counter;
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
 *   <li>{@code payment.callback.failure}：支付回调处理失败计数（标签 reason 区分失败原因，
 *       2026-10-05 补充：docker/prometheus/rules/alert-rules.yml 的 PaymentCallbackFailure
 *       告警以此指标为数据源；BillingService（vip 包）回调失败路径应调用
 *       {@link #recordCallbackFailure(String)} 记录）</li>
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
    /** 支付回调失败计数器指标名（2026-10-05 补充） */
    private static final String METRIC_CALLBACK_FAILURE = "payment.callback.failure";

    /** 失败原因标签 key */
    private static final String TAG_REASON = "reason";

    /** 支付回调耗时计时器 */
    private final Timer callbackLatencyTimer;

    private final MeterRegistry meterRegistry;

    public PaymentMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
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

    /**
     * 记录一次支付回调处理失败（2026-10-05 补充，供 PaymentCallbackFailure 告警消费）。
     *
     * <p>与 AuthMetrics.recordLoginFailure 同款动态注册模式：首次失败时按 reason 标签
     * 注册计数器（失败原因集合开放，无法预注册单例）；此前无失败则指标无序列，
     * 告警表达式不触发（语义正确：无失败即无告警）。</p>
     *
     * @param reason 失败原因（如 signature_invalid、order_not_found、duplicate_notify、persist_error 等）
     */
    public void recordCallbackFailure(String reason) {
        try {
            Counter.builder(METRIC_CALLBACK_FAILURE)
                    .tag(TAG_REASON, reason == null || reason.isBlank() ? "unknown" : reason)
                    .description("支付回调处理失败次数（按失败原因区分）")
                    .register(meterRegistry)
                    .increment();
        } catch (RuntimeException e) {
            log.warn("记录 payment.callback.failure 指标失败, reason={}: {}", reason, e.getMessage());
        }
    }
}
