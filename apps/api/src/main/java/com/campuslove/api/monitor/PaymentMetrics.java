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
 *   <li>{@code payment.vip.purchased}：VIP 套餐购买计数（标签 planId 标识套餐）</li>
 *   <li>{@code payment.vip.cancelled}：VIP 取消计数</li>
 *   <li>{@code payment.callback.latency}：支付回调耗时（Timer，支持百分位统计）</li>
 * </ul>
 *
 * <p>容错策略：所有指标记录方法均使用 try-catch 包裹，失败时只记录日志不抛出异常。</p>
 */
@Component
public class PaymentMetrics {

    private static final Logger log = LoggerFactory.getLogger(PaymentMetrics.class);

    /** VIP 购买计数器指标名 */
    private static final String METRIC_VIP_PURCHASED = "payment.vip.purchased";
    /** VIP 取消计数器指标名 */
    private static final String METRIC_VIP_CANCELLED = "payment.vip.cancelled";
    /** 支付回调耗时计时器指标名 */
    private static final String METRIC_CALLBACK_LATENCY = "payment.callback.latency";

    private static final String TAG_PLAN_ID = "planId";

    private final MeterRegistry meterRegistry;

    /** VIP 取消计数器（无标签，单例） */
    private final Counter vipCancelledCounter;
    /** 支付回调耗时计时器 */
    private final Timer callbackLatencyTimer;

    public PaymentMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        // 无标签计数器预先注册单例
        this.vipCancelledCounter = Counter.builder(METRIC_VIP_CANCELLED)
                .description("VIP 套餐取消次数")
                .register(meterRegistry);
        // 回调耗时计时器，发布 p50/p95/p99 百分位
        this.callbackLatencyTimer = Timer.builder(METRIC_CALLBACK_LATENCY)
                .description("支付回调处理耗时")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry);
    }

    /**
     * 记录一次 VIP 套餐购买。
     *
     * @param planId 套餐 ID（作为标签，便于按套餐聚合）
     */
    public void recordVipPurchased(String planId) {
        try {
            Counter.builder(METRIC_VIP_PURCHASED)
                    .tag(TAG_PLAN_ID, planId == null || planId.isBlank() ? "unknown" : planId)
                    .description("VIP 套餐购买次数（按套餐区分）")
                    .register(meterRegistry)
                    .increment();
        } catch (RuntimeException e) {
            log.warn("记录 payment.vip.purchased 指标失败, planId={}: {}", planId, e.getMessage());
        }
    }

    /**
     * 记录一次 VIP 取消。
     */
    public void recordVipCancelled() {
        try {
            vipCancelledCounter.increment();
        } catch (RuntimeException e) {
            log.warn("记录 payment.vip.cancelled 指标失败: {}", e.getMessage());
        }
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
