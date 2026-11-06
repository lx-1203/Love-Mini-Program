package com.campuslove.api.whisper;

import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.WhisperMessage;
import com.campuslove.api.verification.RealNameCertificationRepository;
import com.campuslove.api.repository.WhisperMessageRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import com.campuslove.api.whisper.WhisperViews.WhisperMessageView;
import com.campuslove.api.whisper.WhisperViews.WhisperSendRequest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import com.campuslove.api.common.TimeZones;

/**
 * 悄悄话真实服务（v3.1 契约 §9/§10）：
 * - 状态机 DRAFT→PAYING→SENT→DELIVERED→READ；异常 PAY_FAILED/SEND_FAILED/REFUNDED
 * - 同一对用户 A↔B 最多 1 条有效；发送者每日 ≤5 条
 * - 幂等 clientRequestId；钱包扣费与创建同事务，创建失败自动退款（REFUNDED）
 * - 文案承诺：优先送达 / 直接进入 TA 的悄悄话（不承诺"必达"）
 *
 * <p><b>2026-10-05 账务与内容安全修复</b>：</p>
 * <ol>
 *   <li><b>账务可落库</b>：原实现扣费/退款/状态写入与主流程同事务——余额不足时
 *       PAY_FAILED 记录、创建失败时 REFUNDED 状态与退款 CREDIT 流水均随主事务回滚，
 *       「退款事实」无法从 wallet_transaction_log 对账。现把扣费、PAY_FAILED 落库、
 *       退款（REFUNDED 状态 + CREDIT 流水）放到独立事务（REQUIRES_NEW，
 *       经 TransactionTemplate），主流程回滚不影响退款事实；</li>
 *   <li><b>退款 orderId 可对账</b>：退款 CREDIT 流水 orderId 取
 *       {@code WHISPER-REFUND-{原扣费orderId}}（原扣费 orderId =
 *       {@code WHISPER-{clientRequestId}}），对账时可由扣费流水直接关联退款流水；</li>
 *   <li><b>内容过滤</b>：发送文本接入 {@link SensitiveWordFilter}（仿
 *       chat/RealPrivateMessageService 现有用法），命中敏感词直接拒绝且<b>不扣费</b>
 *       （校验前置，无「已扣未退」窗口）。</li>
 * </ol>
 */
@Profile("real")
@Service
public class RealWhisperService implements WhisperService {

    private static final Logger log = LoggerFactory.getLogger(RealWhisperService.class);

    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_DELIVERED = "DELIVERED";
    public static final String STATUS_READ = "READ";
    public static final String STATUS_PAY_FAILED = "PAY_FAILED";
    public static final String STATUS_REFUNDED = "REFUNDED";

    /**
     * 发送者每日上限（配置 app.whisper.daily-limit，默认 5；原硬编码常量收敛为可配置项）。
     * 字段声明即赋默认值 5：单测直连构造（不走 Spring 注入）时保持与原常量同语义，
     * Spring 装配时由配置覆盖。
     */
    @Value("${app.whisper.daily-limit:5}")
    private int dailyLimit = 5;

    /**
     * R5-1（2026-11-05）：收件人可见状态——PAY_FAILED/REFUNDED 是发送侧审计行
     * （扣费失败/退款的事实落库，含未付费的留言内容），进入收件箱即构成
     * 付费墙旁路（余额不足也能把内容送到收件人眼前），必须排除。
     */
    private static final List<String> INBOX_VISIBLE_STATUSES =
            List.of(STATUS_SENT, STATUS_DELIVERED, STATUS_READ);

    /** R9-b（2026-11-05）：未读口径——送达中/已送达均计未读，与收件箱徽标一致 */
    private static final List<String> UNREAD_STATUSES = List.of(STATUS_SENT, STATUS_DELIVERED);

    private final WhisperMessageRepository repository;
    private final WalletService walletService;

    /**
     * 通知服务（2026-11-04 第三辑 F-10：悄悄话到达通知）。
     * required=false 兼容既有单测构造器（两参构造器不注入时跳过通知），
     * 与 realNameCertificationRepository/sensitiveWordFilter 同款可空依赖模式。
     */
    @Autowired(required = false)
    private com.campuslove.api.chat.NotificationService notificationService;

    /**
     * 用户资料仓库（R8 2026-11-04：收件箱发送者昵称/头像）。
     * required=false 兼容既有单测构造器；为 null 时视图相应字段为 null，
     * 客户端兜底「神秘访客」文案与默认头像。
     */
    @Autowired(required = false)
    private com.campuslove.api.repository.UserRepository userRepository;

    /** 实名认证（v3 冻结：发送悄悄话需先完成实名认证；未注入时跳过校验） */
    @Autowired(required = false)
    private RealNameCertificationRepository realNameCertificationRepository;

    /**
     * 敏感词过滤器（2026-10-05 内容安全接线；仿 chat/RealPrivateMessageService 用法）。
     * required=false 兼容既有单测构造器；为 null 时跳过过滤（与原行为一致）。
     */
    @Autowired(required = false)
    private SensitiveWordFilter sensitiveWordFilter;

    /**
     * 平台事务管理器（2026-10-05 账务修复）：用于构造 REQUIRES_NEW 的
     * TransactionTemplate，保证扣费失败/退款事实在独立事务落库。
     * required=false 兼容既有单测构造器；为 null 时降级为同事务写入（原行为）。
     */
    @Autowired(required = false)
    private PlatformTransactionManager transactionManager;

    @Value("${app.unlock-price.whisper:200}")
    private int whisperPriceCents;

    public RealWhisperService(WhisperMessageRepository repository, WalletService walletService) {
        this.repository = repository;
        this.walletService = walletService;
    }

    @Override
    @Transactional
    public WhisperMessageView send(Long senderId, WhisperSendRequest request) {
        if (senderId.equals(request.receiverId())) {
            throw new IllegalArgumentException("不能给自己发悄悄话");
        }
        String clientRequestId = request.clientRequestId().trim();
        if (clientRequestId.isEmpty()) {
            throw new IllegalArgumentException("clientRequestId 不能为空");
        }

        // 幂等：同一 clientRequestId 只处理一次
        WhisperMessage existing = repository.findByClientRequestId(clientRequestId).orElse(null);
        if (existing != null) {
            return toView(existing);
        }

        // 同一对用户 A↔B 最多 1 条有效
        if (repository.countActiveBetween(senderId, request.receiverId()) > 0) {
            throw new IllegalArgumentException("你们之间已有一条悄悄话，先等 TA 回复吧");
        }

        // 发送者每日 ≤5 条
        LocalDateTime dayStart = LocalDateTime.of(LocalDate.now(TimeZones.BUSINESS), LocalTime.MIN);
        if (repository.countBySenderIdAndCreatedAtBetween(senderId, dayStart, dayStart.plusDays(1)) >= dailyLimit) {
            throw new IllegalArgumentException("今日悄悄话已达上限（" + dailyLimit + " 条）");
        }

        // v3 冻结：发送悄悄话需先完成实名认证（未认证不扣费）
        if (realNameCertificationRepository != null) {
            boolean realNameVerified = realNameCertificationRepository.findByUserId(senderId)
                    .map(c -> "APPROVED".equals(c.getStatus()))
                    .orElse(false);
            if (!realNameVerified) {
                throw new IllegalArgumentException("发送悄悄话需先完成实名认证");
            }
        }

        // 0) 内容过滤（2026-10-05）：命中敏感词直接拒绝且不扣费（校验前置，无「已扣未退」窗口）
        String content = request.content().trim();
        if (sensitiveWordFilter != null && sensitiveWordFilter.containsSensitive(content)) {
            log.warn("悄悄话内容命中敏感词，拒绝发送：senderId={}, receiverId={}", senderId, request.receiverId());
            throw new IllegalArgumentException("悄悄话包含违规内容，无法发送");
        }

        // 1) 扣费（独立事务 REQUIRES_NEW）：失败不污染主事务，且 PAY_FAILED 事实可落库
        String deductOrderId = "WHISPER-" + clientRequestId;
        WhisperMessage message = new WhisperMessage();
        message.setSenderId(senderId);
        message.setReceiverId(request.receiverId());
        message.setContent(content);
        message.setStatus(STATUS_PAY_FAILED);
        message.setClientRequestId(clientRequestId);
        message.setPriceCents((long) whisperPriceCents);
        try {
            runInNewTransaction(() -> walletService.deduct(
                    senderId,
                    (long) whisperPriceCents,
                    deductOrderId,
                    WalletTransactionLog.RELATED_TYPE_WHISPER_SEND,
                    String.valueOf(request.receiverId())
            ));
        } catch (Exception ex) {
            // 扣费失败事实落库（独立事务，主事务回滚不影响）：status=PAY_FAILED
            persistStatusInNewTransaction(message, STATUS_PAY_FAILED, null,
                    "扣费失败（余额不足），orderId=" + deductOrderId);
            throw new IllegalArgumentException("交友币余额不足，悄悄话发送失败");
        }

        // 2) 创建（主事务；失败走退款路径 → REFUNDED）
        message.setStatus(STATUS_SENT);
        try {
            repository.save(message);
        } catch (Exception ex) {
            // 退款（独立事务 REQUIRES_NEW）：REFUNDED 状态 + 退款 CREDIT 流水可对账、可落库。
            // 退款 orderId 用 WHISPER-REFUND-{原扣费orderId}，与扣费流水直接关联。
            String refundOrderId = "WHISPER-REFUND-" + deductOrderId;
            runInNewTransaction(() -> {
                walletService.recharge(
                        senderId,
                        (long) whisperPriceCents,
                        refundOrderId,
                        WalletTransactionLog.RELATED_TYPE_WHISPER_SEND,
                        String.valueOf(request.receiverId())
                );
            });
            persistStatusInNewTransaction(message, STATUS_REFUNDED, LocalDateTime.now(TimeZones.BUSINESS),
                    "创建失败已退款，发送者钱包已回款");
            throw new IllegalArgumentException("悄悄话创建失败，已自动退款");
        }

        // 3) 到达通知（2026-11-04 第三辑 F-10：收件侧闭环的第一环）。
        // 尽力而为：通知失败不回滚发送主流程——消息已 SENT，收件人可在收件箱看到；
        // type=system + referenceType=whisper，客户端通知中心落点=悄悄话收件箱
        // （utils/notification-target.ts）。sourceUserId=发送者：收件人看到发送者头像，
        // 与私信消息语义一致。
        if (notificationService != null) {
            try {
                notificationService.createSystemNotification(
                        request.receiverId(), senderId,
                        "你收到一条新的悄悄话，点击查看",
                        message.getId(), "whisper");
            } catch (RuntimeException ex) {
                log.warn("悄悄话到达通知失败（不影响发送主流程）: whisperId={}, receiverId={}, cause={}",
                        message.getId(), request.receiverId(), ex.getMessage());
            }
        }
        return toView(message);
    }

    @Override
    @Transactional
    public List<WhisperMessageView> inbox(Long receiverId) {
        // R5-b：SENT→DELIVERED 一次批量置位（替代逐行 save 的 N+1 写）。
        // R5-1：查询限定送达态——PAY_FAILED/REFUNDED 审计行（含未付费内容）不进收件箱。
        repository.markInboxDelivered(receiverId);
        List<WhisperMessage> list = repository
                .findByReceiverIdAndStatusInOrderByCreatedAtDesc(receiverId, INBOX_VISIBLE_STATUSES);
        return withSenderProfiles(list.stream().map(this::toView).toList());
    }

    @Override
    public List<WhisperMessageView> sent(Long senderId) {
        return withSenderProfiles(repository.findBySenderIdOrderByCreatedAtDesc(senderId).stream()
            .map(this::toView).toList());
    }

    /** R8 分页收件箱：size 有值时真分页；送达置位在全量口径下完成（先置位后取页，语义一致） */
    @Override
    @Transactional
    public List<WhisperMessageView> inbox(Long receiverId, Integer page, Integer size) {
        if (size == null) {
            return inbox(receiverId);
        }
        repository.markInboxDelivered(receiverId);
        List<WhisperMessage> list = repository.queryByReceiverIdAndStatusInOrderByCreatedAtDesc(
                receiverId, INBOX_VISIBLE_STATUSES,
                PageRequest.of(normalizePage(page), normalizeSize(size)));
        return withSenderProfiles(list.stream().map(this::toView).toList());
    }

    /** R8 分页已发送：size 有值时真分页，其余同全量口径 */
    @Override
    public List<WhisperMessageView> sent(Long senderId, Integer page, Integer size) {
        if (size == null) {
            return sent(senderId);
        }
        return withSenderProfiles(repository.queryBySenderIdOrderByCreatedAtDesc(
                senderId, PageRequest.of(normalizePage(page), normalizeSize(size))).stream()
            .map(this::toView).toList());
    }

    /** R9-b（2026-11-05）：收件人未读数（SENT/DELIVERED；与收件箱可见口径一致，排除审计行） */
    @Override
    public long unreadCount(Long receiverId) {
        return repository.countByReceiverIdAndStatusIn(receiverId, UNREAD_STATUSES);
    }

    private int normalizePage(Integer page) {
        return page == null || page < 0 ? 0 : page;
    }

    private int normalizeSize(Integer size) {
        return Math.max(1, Math.min(100, size));
    }

    /**
     * R8（2026-11-04）：按视图内 senderId 一次 findAllById 批量补发送者昵称/头像（无 N+1）。
     * userRepository 未注入（单测）或资料缺失时保持 null，客户端按「神秘访客」兜底渲染。
     */
    private List<WhisperMessageView> withSenderProfiles(List<WhisperMessageView> views) {
        if (userRepository == null || views.isEmpty()) {
            return views;
        }
        Set<Long> senderIds = views.stream().map(WhisperMessageView::senderId)
                .collect(Collectors.toSet());
        Map<Long, com.campuslove.api.entity.User> senders = userRepository
                .findAllById(senderIds).stream()
                .collect(Collectors.toMap(com.campuslove.api.entity.User::getId, u -> u));
        return views.stream().map(view -> {
            com.campuslove.api.entity.User sender = senders.get(view.senderId());
            if (sender == null) {
                return view;
            }
            return new WhisperMessageView(view.id(), view.senderId(), view.receiverId(), view.content(),
                    view.status(), view.priceCents(), view.createdAt(), view.readAt(),
                    sender.getNickname(), sender.getAvatarUrl());
        }).toList();
    }

    @Override
    @Transactional
    public WhisperMessageView markRead(Long receiverId, Long whisperId) {
        WhisperMessage message = repository.findById(whisperId).orElse(null);
        if (message == null || !message.getReceiverId().equals(receiverId)) {
            throw new IllegalArgumentException("悄悄话不存在");
        }
        // R6-1（2026-11-05）：按-id 端点同样执行 R5-1 口径——PAY_FAILED/REFUNDED 审计行
        // 对收件人视同不存在（id 枚举既取不到内容，也不得把审计行改成 READ 污染对账/有效对计数）。
        String status = message.getStatus();
        if (STATUS_PAY_FAILED.equals(status) || STATUS_REFUNDED.equals(status)) {
            throw new IllegalArgumentException("悄悄话不存在");
        }
        if (!STATUS_READ.equals(status)) {
            message.setStatus(STATUS_READ);
            message.setReadAt(LocalDateTime.now(TimeZones.BUSINESS));
            repository.save(message);
        }
        return toView(message);
    }

    /**
     * 在独立事务（REQUIRES_NEW）中执行账务操作（扣费/退款）。
     *
     * <p>主事务（如后续创建失败）回滚不影响本事务已提交的账务事实，
     * 保证「退款事实可从 wallet_transaction_log 对账」。
     * transactionManager 未注入（单元测试）时降级为当前事务内直接执行。</p>
     */
    private void runInNewTransaction(Runnable action) {
        PlatformTransactionManager tm = this.transactionManager;
        if (tm == null) {
            action.run();
            return;
        }
        TransactionTemplate template = new TransactionTemplate(tm);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        template.executeWithoutResult(status -> action.run());
    }

    /**
     * 在独立事务（REQUIRES_NEW）中落库消息异常状态（PAY_FAILED / REFUNDED）。
     *
     * <p>用全新实体实例写入（主事务尚未提交/将回滚，原实例在独立事务的
     * EntityManager 中为游离态，直接复用会触发 merge 语义混乱）。
     * transactionManager 未注入时降级为当前事务内直接写入（原行为）。</p>
     *
     * @param source   源消息（字段快照来源）
     * @param status   目标状态（PAY_FAILED / REFUNDED）
     * @param refundedAt 退款时间（仅 REFUNDED 场景）
     * @param note     备注日志
     */
    private void persistStatusInNewTransaction(WhisperMessage source, String status,
                                               LocalDateTime refundedAt, String note) {
        Runnable action = () -> {
            try {
                WhisperMessage record = new WhisperMessage();
                record.setSenderId(source.getSenderId());
                record.setReceiverId(source.getReceiverId());
                record.setContent(source.getContent());
                record.setClientRequestId(source.getClientRequestId());
                record.setPriceCents(source.getPriceCents());
                record.setStatus(status);
                if (refundedAt != null) {
                    record.setRefundedAt(refundedAt);
                }
                repository.save(record);
                log.info("悄悄话异常状态已独立事务落库：clientRequestId={}, status={}, note={}",
                        source.getClientRequestId(), status, note);
            } catch (Exception persistEx) {
                // 状态落库失败不阻断退款/抛错主路径（仅记录，账务流水 wallet_transaction_log 仍可对账）
                log.error("悄悄话异常状态落库失败：clientRequestId={}, status={}",
                        source.getClientRequestId(), status, persistEx);
            }
        };
        PlatformTransactionManager tm = this.transactionManager;
        if (tm == null) {
            action.run();
            return;
        }
        TransactionTemplate template = new TransactionTemplate(tm);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        template.executeWithoutResult(s -> action.run());
    }

    private WhisperMessageView toView(WhisperMessage m) {
        return new WhisperMessageView(
            m.getId(),
            m.getSenderId(),
            m.getReceiverId(),
            m.getContent(),
            m.getStatus(),
            m.getPriceCents(),
            m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
            m.getReadAt() != null ? m.getReadAt().toString() : null,
            null,
            null
        );
    }
}
