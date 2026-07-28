package com.campuslove.api.monitor;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 聊天业务监控指标。
 *
 * <p>指标说明：</p>
 * <ul>
 *   <li>{@code chat.message.sent}：消息发送成功计数（标签 messageType 区分消息类型）</li>
 *   <li>{@code chat.message.failed}：消息发送失败计数（标签 reason 区分失败原因）</li>
 *   <li>{@code chat.session.active}：当前活跃会话数（Gauge，由 {@link #activeSessionCount} 维护）</li>
 * </ul>
 *
 * <p>容错策略：所有指标记录方法均使用 try-catch 包裹，失败时只记录日志不抛出异常。</p>
 */
@Component
public class ChatMetrics {

    private static final Logger log = LoggerFactory.getLogger(ChatMetrics.class);

    /** 消息发送成功计数器指标名 */
    private static final String METRIC_MESSAGE_SENT = "chat.message.sent";
    /** 消息发送失败计数器指标名 */
    private static final String METRIC_MESSAGE_FAILED = "chat.message.failed";
    /** 活跃会话数 Gauge 指标名 */
    private static final String METRIC_SESSION_ACTIVE = "chat.session.active";

    private static final String TAG_MESSAGE_TYPE = "messageType";
    private static final String TAG_REASON = "reason";

    /** 活跃会话计数器（由 ChatService 在会话开始/结束时调用 increment/decrement） */
    private final AtomicLong activeSessionCount = new AtomicLong(0);

    private final MeterRegistry meterRegistry;

    public ChatMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        // 注册活跃会话数 Gauge，Prometheus 抓取时调用 activeSessionCount.doubleValue()
        try {
            Gauge.builder(METRIC_SESSION_ACTIVE, activeSessionCount, AtomicLong::doubleValue)
                    .description("当前活跃聊天会话数")
                    .register(meterRegistry);
        } catch (RuntimeException e) {
            log.warn("注册 chat.session.active Gauge 失败: {}", e.getMessage());
        }
    }

    /**
     * 记录一次消息发送成功。
     *
     * @param messageType 消息类型（如 text / image / voice / video / system 等）
     */
    public void recordMessageSent(String messageType) {
        try {
            Counter.builder(METRIC_MESSAGE_SENT)
                    .tag(TAG_MESSAGE_TYPE, messageType == null || messageType.isBlank() ? "unknown" : messageType)
                    .description("聊天消息发送成功次数（按消息类型区分）")
                    .register(meterRegistry)
                    .increment();
        } catch (RuntimeException e) {
            log.warn("记录 chat.message.sent 指标失败, messageType={}: {}", messageType, e.getMessage());
        }
    }

    /**
     * 记录一次消息发送失败。
     *
     * @param reason 失败原因（如 network_error、rate_limited、content_filtered 等）
     */
    public void recordMessageFailed(String reason) {
        try {
            Counter.builder(METRIC_MESSAGE_FAILED)
                    .tag(TAG_REASON, reason == null || reason.isBlank() ? "unknown" : reason)
                    .description("聊天消息发送失败次数（按失败原因区分）")
                    .register(meterRegistry)
                    .increment();
        } catch (RuntimeException e) {
            log.warn("记录 chat.message.failed 指标失败, reason={}: {}", reason, e.getMessage());
        }
    }

    /**
     * 增加活跃会话计数。在新建聊天会话时调用。
     */
    public void incrementActiveSession() {
        try {
            activeSessionCount.incrementAndGet();
        } catch (RuntimeException e) {
            log.warn("增加 chat.session.active 失败: {}", e.getMessage());
        }
    }

    /**
     * 减少活跃会话计数。在会话关闭/结束时调用。
     */
    public void decrementActiveSession() {
        try {
            // 使用 updateAndGet 防止减到负数
            activeSessionCount.updateAndGet(curr -> Math.max(0, curr - 1));
        } catch (RuntimeException e) {
            log.warn("减少 chat.session.active 失败: {}", e.getMessage());
        }
    }
}
