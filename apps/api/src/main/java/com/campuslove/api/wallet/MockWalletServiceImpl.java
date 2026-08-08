package com.campuslove.api.wallet;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Mock 钱包服务实现（@Profile("mock")）。
 *
 * <p>展示版（showcase）与本地开发在 mock profile 下运行：无数据库，本实现用内存
 * {@link ConcurrentHashMap} 模拟钱包余额与流水，使 /api/v1/wallet/* 端点可用，
 * 前端"交友币余额 / 账单 / 解锁扣费"流程在展示版中真实可演示。</p>
 *
 * <p>与 {@link WalletServiceImpl}（real）行为对齐：</p>
 * <ul>
 *   <li>幂等：同一 orderId 重复调用直接返回已处理结果（内存 orderId 集合）</li>
 *   <li>余额不足：抛 {@link InsufficientBalanceException}</li>
 *   <li>流水：每次扣减/充值记录 wallet_transaction_log 等价的内存条目</li>
 * </ul>
 */
@Profile("mock")
@Service
public class MockWalletServiceImpl implements WalletService {

    /** 用户钱包余额：userId -> balanceCents（缺省 0） */
    private final Map<Long, Long> balances = new ConcurrentHashMap<>();

    /** 已处理订单（幂等集合）：orderId -> balanceAfter */
    private final Map<String, Long> processedOrders = new ConcurrentHashMap<>();

    /** 流水（内存条目，简单模拟分页） */
    private final Map<Long, MockTx> transactions = new ConcurrentHashMap<>();

    /** 流水自增 ID */
    private final AtomicLong txIdSeq = new AtomicLong(1000);

    public MockWalletServiceImpl() {
        // 默认给 mock 用户 userId=1 一个可观的演示余额（交友币 800 = 80000 分），
        // 便于展示版直接演示解锁/扣费流程；其余用户缺省 0。
        balances.put(1L, 80000L);
    }

    @Override
    public Long deduct(Long userId, Long amountCents, String orderId, String relatedType, String relatedId) {
        validateParams(userId, amountCents, orderId, relatedType);

        Long existing = processedOrders.get(orderId);
        if (existing != null) {
            return existing;
        }

        long current = balances.getOrDefault(userId, 0L);
        if (current < amountCents) {
            throw new InsufficientBalanceException(userId, amountCents, current);
        }
        long newBalance = current - amountCents;
        balances.put(userId, newBalance);
        processedOrders.put(orderId, newBalance);
        record(userId, "DEBIT", amountCents, newBalance, orderId, relatedType, relatedId,
                "扣减：" + relatedType + " orderId=" + orderId);
        return newBalance;
    }

    @Override
    public Long recharge(Long userId, Long amountCents, String orderId, String relatedType, String relatedId) {
        validateParams(userId, amountCents, orderId, relatedType);

        Long existing = processedOrders.get(orderId);
        if (existing != null) {
            return existing;
        }

        long current = balances.getOrDefault(userId, 0L);
        long newBalance = current + amountCents;
        balances.put(userId, newBalance);
        processedOrders.put(orderId, newBalance);
        record(userId, "CREDIT", amountCents, newBalance, orderId, relatedType, relatedId,
                "充值：" + relatedType + " orderId=" + orderId);
        return newBalance;
    }

    @Override
    public Long getBalance(Long userId) {
        return balances.getOrDefault(userId, 0L);
    }

    @Override
    public Page<WalletTransactionLog> listTransactions(Long userId, Pageable pageable) {
        List<MockTx> txs = transactions.values().stream()
                .filter(tx -> tx.userId().equals(userId))
                .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
                .toList();
        int start = (int) Math.min(pageable.getOffset(), txs.size());
        int end = (int) Math.min(start + pageable.getPageSize(), txs.size());
        List<WalletTransactionLog> items = txs.subList(start, end).stream()
                .map(tx -> {
                    WalletTransactionLog log = new WalletTransactionLog();
                    log.setId(tx.id());
                    log.setUserId(tx.userId());
                    log.setType(tx.type());
                    log.setAmount(tx.amount());
                    log.setBalanceAfter(tx.balanceAfter());
                    log.setRelatedType(tx.relatedType());
                    log.setRelatedId(tx.relatedId());
                    log.setOrderId(tx.orderId());
                    log.setRemark(tx.remark());
                    log.setCreatedAt(tx.createdAt());
                    log.setUpdatedAt(tx.createdAt());
                    return log;
                })
                .toList();
        return new PageImpl<>(items, pageable, txs.size());
    }

    private void record(Long userId, String type, Long amountCents, Long balanceAfter,
                        String orderId, String relatedType, String relatedId, String remark) {
        long id = txIdSeq.incrementAndGet();
        transactions.put(id, new MockTx(id, userId, type, amountCents, balanceAfter,
                orderId, relatedType, relatedId, remark, LocalDateTime.now(TimeZones.BUSINESS)));
    }

    private void validateParams(Long userId, Long amountCents, String orderId, String relatedType) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        if (amountCents == null || amountCents <= 0) {
            throw new IllegalArgumentException(ErrorMessages.AMOUNT_POSITIVE);
        }
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.ORDER_NO_REQUIRED);
        }
        if (relatedType == null || relatedType.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.BIZ_TYPE_REQUIRED);
        }
    }

    /** 内存流水条目。 */
    private record MockTx(
            Long id,
            Long userId,
            String type,
            Long amount,
            Long balanceAfter,
            String orderId,
            String relatedType,
            String relatedId,
            String remark,
            LocalDateTime createdAt
    ) {
    }
}
