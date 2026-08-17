package com.campuslove.api.whisper;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 悄悄话真实服务（v3.1 契约 §9/§10）：
 * - 状态机 DRAFT→PAYING→SENT→DELIVERED→READ；异常 PAY_FAILED/SEND_FAILED/REFUNDED
 * - 同一对用户 A↔B 最多 1 条有效；发送者每日 ≤5 条
 * - 幂等 clientRequestId；钱包扣费与创建同事务，创建失败自动退款（REFUNDED）
 * - 文案承诺：优先送达 / 直接进入 TA 的悄悄话（不承诺“必达”）
 */
@Profile("real")
@Service
public class RealWhisperService implements WhisperService {

    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_DELIVERED = "DELIVERED";
    public static final String STATUS_READ = "READ";
    public static final String STATUS_PAY_FAILED = "PAY_FAILED";
    public static final String STATUS_REFUNDED = "REFUNDED";

    private static final int DAILY_LIMIT = 5;

    private final WhisperMessageRepository repository;
    private final WalletService walletService;

    /** 实名认证（v3 冻结：发送悄悄话需先完成实名认证；未注入时跳过校验） */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RealNameCertificationRepository realNameCertificationRepository;

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

        // 1) 扣费（幂等 orderId；失败记 PAY_FAILED 后抛错）
        WhisperMessage message = new WhisperMessage();
        message.setSenderId(senderId);
        message.setReceiverId(request.receiverId());
        message.setContent(request.content().trim());
        message.setStatus(STATUS_PAY_FAILED);
        message.setClientRequestId(clientRequestId);
        message.setPriceCents((long) whisperPriceCents);
        try {
            walletService.deduct(
                senderId,
                (long) whisperPriceCents,
                "WHISPER-" + clientRequestId,
                WalletTransactionLog.RELATED_TYPE_WHISPER_SEND,
                String.valueOf(request.receiverId())
            );
        } catch (Exception ex) {
            repository.save(message);
            throw new IllegalArgumentException("交友币余额不足，悄悄话发送失败");
        }

        // 2) 创建（同事务；失败自动退款 → REFUNDED）
        message.setStatus(STATUS_SENT);
        try {
            repository.save(message);
        } catch (Exception ex) {
            // 状态置 REFUNDED + 退款（防御式：任一失败不阻断主流程抛出）
            try {
                message.setStatus(STATUS_REFUNDED);
                message.setRefundedAt(LocalDateTime.now());
                repository.save(message);
            } catch (Exception saveEx) {
                // 保存失败忽略（事务将回滚）
            }
            try {
                walletService.recharge(
                    senderId,
                    (long) whisperPriceCents,
                    "WHISPER-REFUND-" + clientRequestId,
                    WalletTransactionLog.RELATED_TYPE_WHISPER_SEND,
                    String.valueOf(request.receiverId())
                );
            } catch (Exception refundEx) {
                // 退款失败保留（事务回滚时扣费也会回滚）
            }
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
