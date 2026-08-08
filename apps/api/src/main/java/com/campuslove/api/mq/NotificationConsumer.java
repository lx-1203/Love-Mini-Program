package com.campuslove.api.mq;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.growth.WeChatPushService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 通知消息消费者。
 *
 * <p>监听 {@code notification.queue} 队列，处理通知消息：</p>
 * <ol>
 *   <li>调用 {@link WeChatPushService} 推送微信订阅消息（仅在 real profile 且配置可用时）</li>
 *   <li>持久化到 {@code notifications} 表（通过 {@link NotificationRepository}）</li>
 * </ol>
 *
 * <p>消费失败时不抛出异常（避免消息无限重投），仅记录错误日志。
 * 微信推送失败不影响数据库持久化，数据库持久化失败不影响微信推送。</p>
 */
@Component
@Profile("real")
public class NotificationConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    /** 系统通知的虚拟源用户 ID（NotificationMessage 未携带 sourceUserId 时使用） */
    private static final long SYSTEM_SOURCE_USER_ID = 0L;

    /** 微信订阅消息跳转页面（通知中心） */
    private static final String DEFAULT_PUSH_PAGE = "/pages/notifications/index";

    /**
     * 微信推送服务。
     *
     * <p>仅在 real profile 下注入；mock 模式下为 null，跳过微信推送。</p>
     */
    @Autowired(required = false)
    private WeChatPushService weChatPushService;

    /** 通知持久化 Repository */
    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    /** 用户 Repository，用于查询 openid 进行微信推送 */
    @Autowired(required = false)
    private UserRepository userRepository;

    /**
     * 处理通知消息。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>记录接收日志</li>
     *   <li>尝试推送微信订阅消息（best effort，失败不影响后续）</li>
     *   <li>尝试持久化到 notifications 表（best effort，失败不抛出）</li>
     * </ol>
     *
     * @param message 通知消息体
     */
    @RabbitListener(queues = "notification.queue")
    @Transactional
    public void handleNotification(NotificationMessage message) {
        if (message == null) {
            log.warn("收到空通知消息，跳过处理");
            return;
        }

        log.info("收到通知消息：userId={}, type={}, title={}",
                message.getUserId(), message.getType(), message.getTitle());

        // 1. 尝试推送微信订阅消息（best effort）
        tryPushWeChatMessage(message);

        // 2. 持久化到 notifications 表（best effort）
        tryPersistNotification(message);
    }

    /**
     * 尝试通过微信订阅消息推送通知。
     *
     * <p>仅在 WeChatPushService 可用、用户 openid 存在时执行。
     * 任何异常均被捕获并记录，不影响后续持久化流程。</p>
     *
     * @param message 通知消息体
     */
    private void tryPushWeChatMessage(NotificationMessage message) {
        if (weChatPushService == null) {
            log.debug("WeChatPushService 不可用，跳过微信推送：userId={}", message.getUserId());
            return;
        }

        if (userRepository == null) {
            log.debug("UserRepository 不可用，跳过微信推送：userId={}", message.getUserId());
            return;
        }

        try {
            // 查询用户 openid
            String openId = userRepository.findById(message.getUserId())
                    .map(user -> user.getOpenid())
                    .orElse(null);

            if (openId == null || openId.isBlank()) {
                log.debug("用户 openid 为空，跳过微信推送：userId={}", message.getUserId());
                return;
            }

            // 构造模板数据（使用通用字段：thing1=标题, thing2=内容, time3=时间）
            Map<String, WeChatPushService.TemplateDataItem> data = new HashMap<>();
            data.put("thing1", new WeChatPushService.TemplateDataItem(
                    truncate(message.getTitle(), 20)));
            data.put("thing2", new WeChatPushService.TemplateDataItem(
                    truncate(message.getContent(), 20)));
            data.put("time3", new WeChatPushService.TemplateDataItem(
                    LocalDateTime.now(TimeZones.BUSINESS).format(
                            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))));

            // 调用微信订阅消息接口（使用 socialDigestTemplateId 作为通用通知模板）
            // 注意：实际生产应配置专门的通知模板 ID，此处复用现有配置以避免引入新配置项
            // FIN-00048 修复：空 templateId 时显式跳过并告警——sendSubscribeMessage 内部
            // 对空 templateId 是静默跳过，调用方无法感知，链路「永不发送」且无任何日志；
            // 现在在调用前显式判断，保证运维可见。
            String templateId = weChatPushService.getSocialDigestTemplateId();
            if (templateId == null || templateId.isBlank()) {
                log.warn("微信订阅消息 templateId 未配置，跳过推送（通知将仅持久化到站内）："
                        + "userId={}, type={}", message.getUserId(), message.getType());
                return;
            }

            boolean sent = weChatPushService.sendSubscribeMessage(
                    openId,
                    templateId,
                    DEFAULT_PUSH_PAGE,
                    data);

            if (sent) {
                log.info("微信通知推送成功：userId={}, type={}", message.getUserId(), message.getType());
            }
        } catch (RuntimeException e) {
            log.warn("微信通知推送失败，不影响后续处理：userId={}, error={}",
                    message.getUserId(), e.getMessage());
        }
    }

    /**
     * 尝试持久化通知到 notifications 表。
     *
     * <p>NotificationMessage.type 为字符串（like/match/comment/system），
     * 需映射为 {@link NotificationType} 枚举。system 类型无对应枚举，
     * 默认映射为 match。</p>
     *
     * @param message 通知消息体
     */
    private void tryPersistNotification(NotificationMessage message) {
        if (notificationRepository == null) {
            log.debug("NotificationRepository 不可用，跳过持久化：userId={}", message.getUserId());
            return;
        }

        try {
            Notification entity = new Notification();
            entity.setUserId(message.getUserId());
            entity.setType(mapType(message.getType()));
            // R4-00371（FIN-00047 收尾）：sourceUserId 由生产者（点赞/评论/关注等业务侧）
            // 经 NotificationMessage.sourceUserId 填充，站内通知「谁互动了我」语义恢复、
            // 前端可跳转来源用户主页；null/缺省时回退系统虚拟用户。
            entity.setSourceUserId(message.getSourceUserId() != null
                    ? message.getSourceUserId() : SYSTEM_SOURCE_USER_ID);
            // R4-00371：关联业务实体（如被点赞的帖子 ID）与关联类型（user/post/comment）
            // 随消息透传持久化；referenceType 非法/缺省时回退 user
            entity.setReferenceId(message.getReferenceId());
            String refType = message.getReferenceType();
            if (refType != null && !refType.isBlank()) {
                try {
                    entity.setReferenceType(ReferenceType.valueOf(refType));
                } catch (IllegalArgumentException e) {
                    log.warn("通知 referenceType 非法，回退 user：userId={}, referenceType={}",
                            message.getUserId(), refType);
                    entity.setReferenceType(ReferenceType.user);
                }
            } else {
                entity.setReferenceType(ReferenceType.user);
            }
            entity.setIsRead(false);
            entity.setCreatedAt(toLocalDateTime(message.getCreatedAt()));

            notificationRepository.save(entity);
            log.debug("通知已持久化：userId={}, type={}, sourceUserId={}, referenceId={}, referenceType={}",
                    message.getUserId(), message.getType(), entity.getSourceUserId(),
                    entity.getReferenceId(), entity.getReferenceType());
        } catch (org.springframework.dao.DataAccessException e) {
            log.warn("通知持久化失败，不抛出异常以避免消息重投：userId={}, error={}",
                    message.getUserId(), e.getMessage());
        }
    }

    /**
     * 将字符串类型映射为 NotificationType 枚举。
     *
     * @param type 字符串类型（like/match/comment/system）
     * @return NotificationType 枚举值，无法识别时默认返回 match
     */
    private NotificationType mapType(String type) {
        if (type == null) {
            return NotificationType.match;
        }
        return switch (type) {
            case "like" -> NotificationType.like;
            case "match" -> NotificationType.match;
            case "comment" -> NotificationType.comment;
            case "follow" -> NotificationType.follow;
            case "visitor" -> NotificationType.visitor;
            default -> NotificationType.match;
        };
    }

    /**
     * 将 Instant 转换为 LocalDateTime（系统默认时区）。
     *
     * @param instant Instant 实例，为 null 时返回当前时间
     * @return LocalDateTime
     */
    private LocalDateTime toLocalDateTime(java.time.Instant instant) {
        if (instant == null) {
            return LocalDateTime.now(TimeZones.BUSINESS);
        }
        return LocalDateTime.ofInstant(instant, TimeZones.BUSINESS);
    }

    /**
     * 截断字符串到指定最大长度，超出部分以省略号结尾。
     *
     * @param value   原始字符串
     * @param maxLen  最大长度
     * @return 截断后的字符串
     */
    private String truncate(String value, int maxLen) {
        if (value == null) {
            return "";
        }
        return value.length() > maxLen ? value.substring(0, maxLen) + "..." : value;
    }
}
