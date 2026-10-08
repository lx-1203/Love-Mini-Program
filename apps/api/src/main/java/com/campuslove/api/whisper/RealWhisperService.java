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

    private static final int DAILY_LIMIT = 5;

    private final WhisperMessageRepository repository;
    private final WalletService walletService;

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
        LocalDateTime dayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        if (repository.countBySenderIdAndCreatedAtBetween(senderId, dayStart, dayStart.plusDays(1)) >= DAILY_LIMIT) {
            throw new IllegalArgumentException("今日悄悄话已达上限（5 条）");
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
            persistStatusInNewTransaction(message, STATUS_REFUNDED, LocalDateTime.now(),
                    "创建失败已退款，退款orderId=" + refundOrderId);
            throw new IllegalArgumentException("悄悄话创建失败，已自动退款");
        }
        return toView(message);
    }

    @Override
    @Transactional
    public List<WhisperMessageView> inbox(Long receiverId) {
        List<WhisperMessage> list = repository.findByReceiverIdOrderByCreatedAtDesc(receiverId);
        // SENT → DELIVERED：进入收件箱即视为送达（优先送达语义）
        for (WhisperMessage m : list) {
            if (STATUS_SENT.equals(m.getStatus())) {
                m.setStatus(STATUS_DELIVERED);
                repository.save(m);
            }
        }
        return list.stream().map(this::toView).toList();
    }

    @Override
    public List<WhisperMessageView> sent(Long senderId) {
        return repository.findBySenderIdOrderByCreatedAtDesc(senderId).stream().map(this::toView).toList();
    }

    @Override
    @Transactional
    public WhisperMessageView markRead(Long receiverId, Long whisperId) {
        WhisperMessage message = repository.findById(whisperId).orElse(null);
        if (message == null || !message.getReceiverId().equals(receiverId)) {
            throw new IllegalArgumentException("悄悄话不存在");
        }
        if (!STATUS_READ.equals(message.getStatus())) {
            message.setStatus(STATUS_READ);
            message.setReadAt(LocalDateTime.now());
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
            m.getReadAt() != null ? m.getReadAt().toString() : null
        );
    }
}
