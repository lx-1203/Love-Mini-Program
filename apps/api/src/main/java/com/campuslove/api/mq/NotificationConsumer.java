package com.campuslove.api.mq;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.growth.WeChatPushService;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 通知消息消费者。
 *
 * <p>监听 {@code notification.queue} 队列，处理通知消息：</p>
 * <ol>
 *   <li>持久化到 {@code notifications} 表（通过 {@link NotificationRepository}）——
 *       <b>短事务内</b>完成，且发生在任何外部调用之前</li>
 *   <li>调用 {@link WeChatPushService} 推送微信订阅消息（仅在 real profile 且配置可用时）——
 *       <b>在事务之外</b>完成</li>
 * </ol>
 *
 * <p><b>P1 修复（2026-10-31）之一：外部 HTTP 调用不得待在事务里。</b>
 * 本方法原先带方法级 {@code @Transactional}，而 {@link WeChatPushService#sendSubscribeMessage}
 * 是一次打到微信的 HTTP 调用。后果有两层：①微信侧一慢，消费者线程就长时间占着
 * 一条 Hikari 连接（并发消息把连接池抽干，表现为「通知很慢」实为全服务退化）；
 * ②更要命的是<b>推送失败会把已经写好的通知行一起回滚</b>——站内通知凭空消失，
 * 而用户本来就只因为「推送失败」这一件无关紧要的事受影响。这与本仓今天对五个
 * UGC 服务做过的修正是同一个缺陷、同一个口径（见
 * {@code village/VillagePostService} 的 {@code transactionTemplate} /
 * {@code suspendingTemplate} 写法）：读校验在事务外、DB 写入用短事务、
 * 外呼在事务外，且用 {@code PROPAGATION_NOT_SUPPORTED} <b>挂起</b>调用方可能带来的
 * 外层事务——只把本方法改成编程式事务是不够的，只要调用方（或未来的
 * {@code @Transactional} 委托层）已经开着事务，内层 {@code REQUIRED} 会「加入」它，
 * 微信调用照样在事务内。</p>
 *
 * <p><b>先落库、后推送</b>的顺序也是这个修复的一部分：微信订阅消息是<b>一次性配额</b>，
 * 若先推送、后落库，落库失败会触发重投，重投再推一次 ⇒ 同一事件烧掉两次配额
 * （用户仅有的一次推送机会被消耗两次，第二次还会被微信判为「未订阅/重复」而失败）。
 * 现在落库失败时一次推送都没发生；落库成功后的推送失败只记日志，
 * <b>不回滚已提交的通知行</b>（见下方 tryPushWeChatMessage 的 catch 说明）。</p>
 *
 * <p><b>P1 修复之二：消费失败不再「catch 掉以免重投」。</b> 原实现对
 * {@code DataAccessException} 只打 warn 就返回，消息被 ack，事件从此消失，
 * {@code retry.max-attempts: 3} 与刚补上的死信链路全部无从生效。现在持久化异常
 * <b>原样抛出</b>：容器按 yml 重试，耗尽后由
 * {@code RabbitConfig#deadLetteringMessageRecoverer()} 拒绝并转 {@code notification.dlq}，
 * {@link DeadLetterListener} 打 ERROR。保留的 catch 只有一处（推送），且是
 * 不可重试场景，理由写在方法注释里。</p>
 *
 * <p><b>P0 修复：幂等。</b> broker 至少一次投递 + 历史上的跨 JVM 重复补偿，
 * 使同一条消息可能被投两次；原实现无条件 {@code new Notification() + save}，
 * 第二次就再插一行、再推一次。现在每次投递先向 {@link ConsumerIdempotencyStore}
 * 抢登记（键口径见 {@link EventDedupKeys}），抢不到就是重投递，直接跳过；
 * 处理失败时<b>撤销登记</b>，好让重试/死信人工重放仍能干活。</p>
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

    /** P0（2026-10-31）：消费幂等登记（mock/无 Redisson 时为 null，退化为不判重） */
    @Autowired(required = false)
    private ConsumerIdempotencyStore idempotencyStore;

    /**
     * 通知落库段的显式事务边界（P1，2026-10-31）。
     *
     * <p>用编程式而不是声明式：同类自调用不经过代理，注解本来就不生效；
     * 而且只有把边界写成代码，测试才能证伪「外呼发生在事务内」。
     * 口径与 {@code VillagePostService.transactionTemplate} 完全一致。</p>
     */
    private final TransactionTemplate transactionTemplate;

    /**
     * 「挂起一切事务」模板（P1，2026-10-31）——微信订阅消息外呼专用。
     *
     * <p>{@code PROPAGATION_NOT_SUPPORTED} 会让 Spring 挂起当前事务（含其
     * EntityManager 与连接），外呼返回后再恢复，因此「推送不在事务内」由本类自己保证，
     * 不依赖任何调用方的注解写法。</p>
     */
    private final TransactionTemplate suspendingTemplate;

    /**
     * Spring 注入构造器。
     *
     * <p>注入 {@link PlatformTransactionManager} 而不是 {@code TransactionTemplate} bean：
     * 前者只要开了事务管理就一定存在，后者依赖 Boot 的 TransactionAutoConfiguration，
     * 手工装配的容器里没有，会让 bean 创建直接失败（口径同 VillagePostService）。</p>
     */
    @Autowired
    public NotificationConsumer(PlatformTransactionManager transactionManager) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate = new TransactionTemplate(transactionManager);
        this.suspendingTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
    }

    /**
     * 无事务管理器的直连构造（单测/手工装配用）。
     *
     * <p>显式承认「此时没有事务」，不用 {@code @Transactional} 假装边界存在。</p>
     */
    public NotificationConsumer() {
        this(noOpTxManager());
    }

    /**
     * 处理通知消息。
     *
     * <p>处理流程（顺序即修复内容，勿调整）：</p>
     * <ol>
     *   <li>幂等抢占：{@link ConsumerIdempotencyStore#claim}；抢不到 = 本事件已处理过，
     *       直接 ack 跳过（重投递不再双插）</li>
     *   <li>类型识别（不可识别 ⇒ 拒绝，见 {@link #toNotificationType}）</li>
     *   <li>事务外读校验：查 openid（只读，不必进事务）</li>
     *   <li>短事务内落库 notifications</li>
     *   <li>事务外推送微信订阅消息（失败只记日志，不回滚第 4 步已提交的行）</li>
     *   <li>4~5 步抛出异常时撤销幂等登记，让重试/重放仍可执行</li>
     * </ol>
     *
     * <p>本方法<b>不加</b> {@code @Transactional}（有测试钉住这一点）：一旦加回去，
     * 微信外呼就又回到事务里。</p>
     *
     * @param message 通知消息体
     */
    @RabbitListener(queues = "notification.queue")
    public void handleNotification(NotificationMessage message) {
        if (message == null) {
            // 非可重试：一条空消息重试一万次也还是空的。记录后 ack，不进重试/死信。
            log.warn("收到空通知消息，跳过处理（非可重试：空消息重投也仍是空消息）");
            return;
        }

        log.info("收到通知消息：userId={}, type={}, title={}, eventId={}",
                message.getUserId(), message.getType(), message.getTitle(), message.getEventId());

        String dedupKey = EventDedupKeys.notificationKey(message);
        if (idempotencyStore != null && !idempotencyStore.claim(dedupKey)) {
            log.info("通知事件已处理过，跳过本次投递（幂等）：dedupKey={}, userId={}, type={}",
                    dedupKey, message.getUserId(), message.getType());
            return;
        }

        try {
            // 1. 落库前先做类型判定：未知类型重试永远不会变好，直接拒绝进 DLQ 留证据
            NotificationType type = toNotificationType(message);

            // 2. 事务外读校验：openid 只读查询（放事务里只是白白延长连接占用时间）
            String openId = resolveOpenIdQuietly(message);

            // 3. 短事务落库（异常外抛 → 重试 → 死信），落库成功是推送的前置条件
            persistInTransaction(message, type, LocalDateTime.now(TimeZones.BUSINESS));

            // 4. 事务外推送：失败不回滚已提交的通知行（见方法注释）
            tryPushWeChatMessage(message, openId);
        } catch (RuntimeException e) {
            // 撤销幂等登记：本次没真正做成，必须允许 broker 重试与 DLQ 人工重放再走一遍
            if (idempotencyStore != null) {
                idempotencyStore.release(dedupKey);
            }
            throw e;
        }
    }

    /**
     * 识别通知类型（事务外的纯计算，失败即不可重试）。
     *
     * <p>R4-00372 原本对未知类型「warn + 跳过持久化」，消息被静默 ack。改成
     * <b>拒绝</b>：类型不认识说明生产端有 bug 或消息被污染，静默跳过会让人以为
     * 「通知已发」而实际什么都没落。抛 {@code AmqpRejectAndDontRequeueException}
     * 让它带 {@code x-death} 进 {@code notification.dlq}，由
     * {@link DeadLetterListener} 打 ERROR 留案发现场。</p>
     *
     * @param message 通知消息
     * @return 通知类型（非 null）
     */
    private NotificationType toNotificationType(NotificationMessage message) {
        NotificationType type = mapType(message.getType());
        if (type == null) {
            log.warn("通知类型无法识别，拒绝并转死信：userId={}, type={}, dedupKey={}",
                    message.getUserId(), message.getType(), message.getEventId());
            throw new org.springframework.amqp.AmqpRejectAndDontRequeueException(
                    "未知通知类型，不可重试：type=" + message.getType());
        }
        return type;
    }

    /**
     * 查询接收者 openid（事务外的只读操作）。
     *
     * <p>openid 只服务于微信推送，查不到就跳过推送，不影响通知落库；
     * 这里的 DB 异常（例如用户表抖动）同样不应阻断站内通知，故按
     * 「推送前置条件不满足」处理并继续落库。</p>
     *
     * @param message 通知消息
     * @return openid；不可用时为 null
     */
    private String resolveOpenIdQuietly(NotificationMessage message) {
        if (weChatPushService == null || userRepository == null) {
            return null;
        }
        try {
            return userRepository.findById(message.getUserId())
                    .map(user -> user.getOpenid())
                    .orElse(null);
        } catch (RuntimeException e) {
            log.warn("查询 openid 失败，跳过微信推送（不影响通知落库）：userId={}, error={}",
                    message.getUserId(), e.getMessage());
            return null;
        }
    }

    /**
     * 短事务落库 notifications。
     *
     * <p><b>不 catch</b>：持久化失败必须冒到容器，让它按 yml 重试、耗尽后转 DLQ。
     * 原实现 {@code catch (DataAccessException) → 只打 warn} 会把消息 ack 掉，
     * 事件从此消失，重试与死信都无从谈起（这正是 P1 要修的「静默丢弃」）。</p>
     *
     * @param message 通知消息
     * @param type    已识别的通知类型
     * @param now     兜底创建时间（消息未带 createdAt 时使用）
     */
    private void persistInTransaction(NotificationMessage message, NotificationType type,
                                      LocalDateTime now) {
        if (notificationRepository == null) {
            // 非可重试：仓库都没装配（mock/无 JPA），重试也不会有；记录后跳过。
            log.debug("NotificationRepository 不可用，跳过持久化：userId={}", message.getUserId());
            return;
        }
        transactionTemplate.executeWithoutResult(status -> {
            Notification entity = new Notification();
            entity.setUserId(message.getUserId());
            entity.setType(type);
            // R4-00371（FIN-00047 收尾）：sourceUserId 由生产者（点赞/评论/关注等业务侧）
            // 经 NotificationMessage.sourceUserId 填充，站内通知「谁互动了我」语义恢复、
            // 前端可跳转来源用户主页；null/缺省时回退系统虚拟用户。
            entity.setSourceUserId(message.getSourceUserId() != null
                    ? message.getSourceUserId() : SYSTEM_SOURCE_USER_ID);
            // R4-00371：关联业务实体（如被点赞的帖子 ID）与关联类型（user/post/comment）
            // 随消息透传持久化；referenceType 非法/缺省时回退 user
            entity.setReferenceId(message.getReferenceId());
            entity.setReferenceType(toReferenceType(message));
            entity.setIsRead(false);
            entity.setCreatedAt(toLocalDateTime(message.getCreatedAt(), now));

            notificationRepository.save(entity);
            log.debug("通知已持久化：userId={}, type={}, sourceUserId={}, referenceId={}, "
                            + "referenceType={}, dedupKey={}",
                    message.getUserId(), message.getType(), entity.getSourceUserId(),
                    entity.getReferenceId(), entity.getReferenceType(), message.getEventId());
        });
    }

    /** referenceType 解析：非法值回退 user（非可重试的取值问题，不值得为它重投一条消息）。 */
    private ReferenceType toReferenceType(NotificationMessage message) {
        String refType = message.getReferenceType();
        if (refType == null || refType.isBlank()) {
            return ReferenceType.user;
        }
        try {
            return ReferenceType.valueOf(refType);
        } catch (IllegalArgumentException e) {
            // 非可重试：这个字符串不会因重试变成合法值；回退 user 保证通知仍然可见。
            log.warn("通知 referenceType 非法，回退 user：userId={}, referenceType={}",
                    message.getUserId(), refType);
            return ReferenceType.user;
        }
    }

    /**
     * 尝试通过微信订阅消息推送通知（<b>在事务之外</b>）。
     *
     * <p>整个外呼被 {@link #suspendingTemplate}（PROPAGATION_NOT_SUPPORTED）包住：
     * 调用方若已持有事务，Spring 会先挂起它，HTTP 调用返回后再恢复。这样
     * 「等微信」这段时间不占任何数据库连接，也不会把推送失败与数据库回滚耦合起来。</p>
     *
     * <p><b>这里是本类唯一保留的 catch（不可重试场景，理由如下）</b>：
     * 订阅消息失败的主流原因是「用户未订阅 / 一次性配额已用 / 模板参数不合规」，
     * 重试不会让它变成功，反而可能重复消耗配额；而通知本身已经在上一步<b>提交</b>了，
     * <b>推送失败绝不回滚那条已落库的通知行</b>——站内通知是产品承诺的送达渠道，
     * 微信推送只是附加提醒。因此这里只记日志（templateId 未配置时按 FIN-00048
     * 显式告警，避免「永不发送」无人可见）。</p>
     *
     * @param message 通知消息
     * @param openId  接收者 openid（null 表示不满足推送前置条件）
     */
    private void tryPushWeChatMessage(NotificationMessage message, String openId) {
        if (weChatPushService == null) {
            log.debug("WeChatPushService 不可用，跳过微信推送：userId={}", message.getUserId());
            return;
        }
        if (openId == null || openId.isBlank()) {
            log.debug("用户 openid 为空，跳过微信推送：userId={}", message.getUserId());
            return;
        }

        try {
            suspendingTemplate.executeWithoutResult(status -> pushSubscribeMessage(message, openId));
        } catch (RuntimeException e) {
            // 见方法注释：不可重试 + 绝不回滚已提交的通知行
            log.warn("微信通知推送失败，不影响已落库的通知（不回滚、不重投）：userId={}, type={}, error={}",
                    message.getUserId(), message.getType(), e.getMessage());
        }
    }

    /** 组装模板数据并调用微信订阅消息接口（由 {@link #tryPushWeChatMessage} 在事务外调用）。 */
    private void pushSubscribeMessage(NotificationMessage message, String openId) {
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
                openId, templateId, DEFAULT_PUSH_PAGE, data);

        if (sent) {
            log.info("微信通知推送成功：userId={}, type={}, eventId={}",
                    message.getUserId(), message.getType(), message.getEventId());
        } else {
            // sendSubscribeMessage 内部已吞掉微信侧错误码，这里补一条可检索的 WARN
            log.warn("微信通知推送未成功（详见 WeChatPushService 日志），通知已落库：userId={}, type={}",
                    message.getUserId(), message.getType());
        }
    }

    /**
     * 将字符串类型映射为 NotificationType 枚举。
     *
     * <p>R4-00372：system 类型映射为独立的 {@link NotificationType#system} 枚举
     * （签到奖励等系统通知不再归入 match）；无法识别的类型返回 null 由调用方
     * 显式拒绝（转死信 + warn 日志），避免静默映射为 match 造成
     * 「系统通知被展示为匹配通知」的语义错误。</p>
     *
     * @param type 字符串类型（like/match/comment/system 等）
     * @return NotificationType 枚举值；无法识别返回 null（调用方拒绝持久化）
     */
    private NotificationType mapType(String type) {
        if (type == null) {
            return null;
        }
        return switch (type) {
            case "like" -> NotificationType.like;
            case "match" -> NotificationType.match;
            case "comment" -> NotificationType.comment;
            case "follow" -> NotificationType.follow;
            case "visitor" -> NotificationType.visitor;
            case "system" -> NotificationType.system;
            default -> null;
        };
    }

    /**
     * 将 Instant 转换为业务时区的 LocalDateTime。
     *
     * @param instant  Instant 实例，为 null 时返回 fallback
     * @param fallback 兜底时间
     * @return LocalDateTime
     */
    private LocalDateTime toLocalDateTime(java.time.Instant instant, LocalDateTime fallback) {
        if (instant == null) {
            return fallback;
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

    /**
     * 「不开事务」的事务管理器（直连构造时使用，口径同 VillagePostService.noOpTxManager）。
     *
     * <p>让 {@code TransactionSynchronizationManager.isActualTransactionActive()}
     * 如实保持 false，避免测试里「外呼在事务外」这类判点假绿。</p>
     */
    private static PlatformTransactionManager noOpTxManager() {
        return new PlatformTransactionManager() {
            @Override
            public org.springframework.transaction.TransactionStatus getTransaction(
                    org.springframework.transaction.TransactionDefinition definition) {
                return new SimpleTransactionStatus();
            }

            @Override
            public void commit(org.springframework.transaction.TransactionStatus status) {
                // 无事务可提交
            }

            @Override
            public void rollback(org.springframework.transaction.TransactionStatus status) {
                // 无事务可回滚
            }
        };
    }
}
