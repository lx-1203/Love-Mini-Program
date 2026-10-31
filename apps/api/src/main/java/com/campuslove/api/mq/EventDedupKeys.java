package com.campuslove.api.mq;

import java.time.Instant;

/**
 * 事件幂等键的统一口径（2026-10-31 P0/P1）。
 *
 * <p>同一条业务事件会在三处被引用，三处必须算出同一个键，否则幂等形同虚设：</p>
 * <ol>
 *   <li>{@code outbox_event.dedup_key}（唯一索引，防止同一事件在补偿表里落两行）；</li>
 *   <li>消息体 {@code eventId} 字段（随 payload_json 一起重投，键因此能穿过
 *       「生产者 → broker → outbox → broker → 消费者」整条链路）；</li>
 *   <li>消费端去重（{@link ConsumerIdempotencyStore}），挡住 broker 重投递 /
 *       双 JVM 重复投递造成的第二次应用。</li>
 * </ol>
 *
 * <p>键的取值优先级：{@code eventId}（生产者侧若为空会补 UUID，见 MessageProducer）
 * &gt; 由业务字段派生的自然键（兼容滚动发版期间<b>已经在队列里、还没有 eventId</b>
 * 的旧消息）&gt; {@code null}（连时间戳都没有时<b>不做去重</b>——宁可重复，
 * 也不能因为键算不准而把真实通知判成重复丢掉）。</p>
 *
 * <p>为什么自然键带 {@code createdAt} 秒级时间戳：同一用户对同一帖「取消喜欢再喜欢」
 * 这类合法重复事件，字段完全一样、只有时间不同；不带时间戳就会把第二次折叠掉，
 * 属于丢数据。带秒级时间戳后，只有「同一事件被投递两次」（重投递的典型形态，
 * createdAt 是消息自带的同一个值）才会命中。</p>
 */
public final class EventDedupKeys {

    /** 通知事件键前缀 */
    private static final String NOTIFICATION_PREFIX = "notif";

    /** 匹配事件键前缀 */
    private static final String MATCH_PREFIX = "match";

    /** 签到事件键前缀 */
    private static final String CHECKIN_PREFIX = "checkin";

    private EventDedupKeys() {
    }

    /**
     * 计算通知消息的幂等键。
     *
     * @param message 通知消息（可为 null）
     * @return 幂等键；无法确定时返回 null（调用方跳过去重）
     */
    public static String notificationKey(NotificationMessage message) {
        if (message == null) {
            return null;
        }
        String eventId = trimToNull(message.getEventId());
        if (eventId != null) {
            return eventId;
        }
        return join(NOTIFICATION_PREFIX, message.getUserId(), message.getType(),
                message.getSourceUserId(), message.getReferenceId(), message.getReferenceType(),
                epochSecond(message.getCreatedAt()));
    }

    /**
     * 计算匹配事件的幂等键。
     *
     * <p>match/unmatch 一次事件会写<b>两条</b>通知（双方各一条），去重发生在
     * 「一次投递」这一层，所以键只描述事件本身（发起方 + 被发起方 + 类型 + 时间），
     * 不按接收方拆分。</p>
     *
     * @param message 匹配事件消息（可为 null）
     * @return 幂等键；无法确定时返回 null
     */
    public static String matchKey(MatchEventMessage message) {
        if (message == null) {
            return null;
        }
        String eventId = trimToNull(message.getEventId());
        if (eventId != null) {
            return eventId;
        }
        return join(MATCH_PREFIX, message.getUserId(), message.getTargetUserId(),
                message.getEventType(), epochSecond(message.getCreatedAt()));
    }

    /**
     * 计算签到事件的幂等键。
     *
     * <p>带 {@code consecutiveDays}：用户重复签到（异常重放）时天数会变，
     * 不带就会把「连续第 7 天」和「连续第 8 天」判成同一事件。</p>
     *
     * @param message 签到事件消息（可为 null）
     * @return 幂等键；无法确定时返回 null
     */
    public static String checkInKey(CheckInEventMessage message) {
        if (message == null) {
            return null;
        }
        String eventId = trimToNull(message.getEventId());
        if (eventId != null) {
            return eventId;
        }
        return join(CHECKIN_PREFIX, message.getUserId(), message.getConsecutiveDays(),
                message.getRewardPoints(), epochSecond(message.getCreatedAt()));
    }

    /** 拼自然键；任一关键标识缺失到「只剩前缀」时返回 null（不做去重）。 */
    private static String join(Object... parts) {
        StringBuilder sb = new StringBuilder(64);
        boolean allNullAfterPrefix = true;
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                sb.append('|');
            }
            String part = String.valueOf(parts[i]);
            sb.append(part);
            if (i > 0 && !"null".equals(part)) {
                allNullAfterPrefix = false;
            }
        }
        // 前缀之外全是 null ⇒ 没有任何可鉴别的信息，此时去重会误伤，返回 null
        return allNullAfterPrefix ? null : sb.toString();
    }

    private static Long epochSecond(Instant instant) {
        return instant == null ? null : instant.getEpochSecond();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
