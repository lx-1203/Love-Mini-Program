package com.campuslove.api.mq;

import java.time.Duration;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 消费端幂等登记表（2026-10-31 P0：消费不幂等）。
 *
 * <p><b>要解决的问题</b>：broker 至少一次投递 + 滚动重启期间两个 JVM 的补偿任务
 * 各投一次 ⇒ 同一事件被消费两次 ⇒ {@code NotificationConsumer} 无条件
 * {@code new Notification() + save} 双插、微信订阅消息重复发送（烧掉一次性配额）。
 * 行认领（{@code MessageProducer#compensatePendingEvents}）已经让「重复投递」在源头
 * 变得不可能，本类是<b>最后一道</b>防线：即使消息真的到达两次，第二次也不允许再落地。</p>
 *
 * <p><b>登记介质与保证级别（诚实口径）</b>：Redis（Redisson {@code SETNX + TTL}）。
 * 它<b>不是</b>数据库级的强一致约束——Redis 被清空/主从切换丢数据时，登记表会失忆，
 * 此时退化为「可能重复」而不是「必然重复」（行认领与 {@code outbox_event.dedup_key}
 * 唯一索引仍在源头去重）。选它而不选数据库表的原因：消费端去重键需要覆盖
 * <b>所有</b>入站消息（含从未走过 outbox 的正常投递），而本仓可为此复用的表只有
 * {@code outbox_event}（语义是「待发补偿」，不是「已处理台账」），notifications 表
 * 加唯一列不在本次授权改动范围内（需要另开迁移，见交付说明）。fail-open 的取舍写明：
 * <b>宁可重复一条通知，也不能因为 Redis 抖动丢一条通知</b>。</p>
 *
 * <p>用法契约（消费者必须遵守，否则会把重试一起挡掉）：
 * {@link #claim} 成功 → 干活 → 干活<b>抛异常</b>时必须 {@link #release}，
 * 让 broker 重试/死信后的人工重放仍能生效。</p>
 *
 * @see EventDedupKeys 键的口径
 */
@Component
@Profile("real")
public class ConsumerIdempotencyStore {

    private static final Logger log = LoggerFactory.getLogger(ConsumerIdempotencyStore.class);

    /** Redis 键前缀（与仓内其它 Redisson 键一致的命名空间风格） */
    private static final String KEY_PREFIX = "mq:consumed:";

    /**
     * 登记保留时长：7 天。
     *
     * <p>必须显著大于「重投递可能发生的最大时间窗」——outbox 补偿的重投最长发生在
     * 事件创建后的 5 次重试内（分钟级），DLQ 人工重放可能在几天后——
     * 同时必须有限，否则 Redis 只增不减。</p>
     */
    private static final Duration TTL = Duration.ofDays(7);

    /** 标记值（无业务含义，只用「键是否存在」） */
    private static final String MARKER = "1";

    /**
     * Redisson 客户端。
     *
     * <p>{@code required = false}：mock profile 排除了 Redisson（见 RedisConfig 的
     * profile 口径），此时本类退化为「不登记、不判重」，行为与改造前一致。</p>
     */
    @Autowired(required = false)
    private RedissonClient redissonClient;

    /**
     * 抢占登记：首次见到该键返回 true（调用方可以干活），已登记返回 false（重投递，跳过）。
     *
     * @param dedupKey 事件幂等键（{@link EventDedupKeys} 计算；为 null 表示算不出键）
     * @return true = 允许处理本次投递；false = 该事件已处理过，必须跳过
     */
    public boolean claim(String dedupKey) {
        if (dedupKey == null || dedupKey.isBlank()) {
            // 算不出键：不做去重（fail-open）。丢通知比重复通知严重得多。
            log.warn("事件幂等键为空，跳过消费去重（可能出现重复）");
            return true;
        }
        if (redissonClient == null) {
            log.debug("Redisson 未装配（mock profile），消费去重跳过：key={}", dedupKey);
            return true;
        }
        try {
            // SETNX + TTL：单命令原子，两个消费者并发时只有一个拿到 true
            return bucket(dedupKey).setIfAbsent(MARKER, TTL);
        } catch (RuntimeException e) {
            // Redis 故障：放行（fail-open），重复风险由源头（行认领 + 唯一索引）兜底
            log.warn("消费幂等登记失败，放行本次投递（宁可重复不可丢失）：key={}, error={}",
                    dedupKey, e.getMessage());
            return true;
        }
    }

    /**
     * 撤销登记：处理失败时调用，让重试/人工重放仍能执行。
     *
     * @param dedupKey 事件幂等键
     */
    public void release(String dedupKey) {
        if (dedupKey == null || dedupKey.isBlank() || redissonClient == null) {
            return;
        }
        try {
            bucket(dedupKey).delete();
        } catch (RuntimeException e) {
            // 撤销失败只意味着「该事件在 TTL 内被视为已处理」，不影响本次已发出的重试
            log.warn("消费幂等登记撤销失败：key={}, error={}", dedupKey, e.getMessage());
        }
    }

    private RBucket<String> bucket(String dedupKey) {
        return redissonClient.getBucket(KEY_PREFIX + dedupKey);
    }
}
