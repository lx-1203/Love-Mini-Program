package com.campuslove.api.whisper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.WhisperMessage;
import com.campuslove.api.repository.WhisperMessageRepository;
import com.campuslove.api.wallet.UserWallet;
import com.campuslove.api.wallet.UserWalletRepository;
import com.campuslove.api.wallet.WalletServiceImpl;
import com.campuslove.api.wallet.WalletTransactionLog;
import com.campuslove.api.wallet.WalletTransactionLogRepository;
import com.campuslove.api.whisper.WhisperViews.WhisperSendRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * 悄悄话退款账务可对账测试（2026-10-05 账务修复回归）。
 *
 * <p>核心断言：消息创建失败触发退款时，退款路径经 REQUIRES_NEW 独立事务在
 * wallet_transaction_log 写入<b>可见的 CREDIT 流水行</b>（orderId =
 * {@code WHISPER-REFUND-WHISPER-{clientRequestId}}，与扣费流水可直接关联），
 * 即使主事务回滚该事实行也已提交——用真实 {@link WalletServiceImpl} +
 * 记录型事务管理器验证（REQUIRES_NEW 传播行为 + 提交次数 + 流水内容）。</p>
 */
@ExtendWith(MockitoExtension.class)
class WhisperRefundLedgerTest {

    private static final Long SENDER_ID = 1L;
    private static final Long RECEIVER_ID = 2L;
    private static final String CLIENT_REQUEST_ID = "req-ledger";

    @Mock
    private WhisperMessageRepository whisperMessageRepository;
    @Mock
    private UserWalletRepository userWalletRepository;
    @Mock
    private WalletTransactionLogRepository walletTransactionLogRepository;

    /** 记录型事务管理器：捕获传播行为与提交/回滚次数（等价验证 REQUIRES_NEW）。 */
    private RecordingTransactionManager transactionManager;

    private RealWhisperService whisperService;
    private WalletServiceImpl walletService;

    /** 捕获到的钱包流水（wallet_transaction_log 行）。 */
    private final List<WalletTransactionLog> savedLogs = new ArrayList<>();

    @BeforeEach
    void setUp() {
        transactionManager = new RecordingTransactionManager();

        // 真实钱包服务（只 mock 仓储层）：deduct/recharge 真实写流水
        walletService = new WalletServiceImpl(userWalletRepository, walletTransactionLogRepository);
        lenient().when(walletTransactionLogRepository.findByOrderId(anyString()))
                .thenReturn(Optional.empty());
        lenient().when(walletTransactionLogRepository.save(any(WalletTransactionLog.class)))
                .thenAnswer(inv -> {
                    savedLogs.add(inv.getArgument(0));
                    return inv.getArgument(0);
                });
        UserWallet wallet = new UserWallet();
        wallet.setUserId(SENDER_ID);
        wallet.setBalanceCents(10_000L);
        lenient().when(userWalletRepository.findByUserIdForUpdate(SENDER_ID))
                .thenReturn(Optional.of(wallet));
        lenient().when(userWalletRepository.save(any(UserWallet.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // 真实悄悄话服务（只 mock 消息仓储层）：注入事务管理器启用 REQUIRES_NEW 路径
        whisperService = new RealWhisperService(whisperMessageRepository, walletService);
        ReflectionTestUtils.setField(whisperService, "whisperPriceCents", 200);
        ReflectionTestUtils.setField(whisperService, "transactionManager", transactionManager);

        // 前置校验放行
        lenient().when(whisperMessageRepository.findByClientRequestId(CLIENT_REQUEST_ID))
                .thenReturn(Optional.empty());
        lenient().when(whisperMessageRepository.countActiveBetween(SENDER_ID, RECEIVER_ID))
                .thenReturn(0L);
        lenient().when(whisperMessageRepository.countBySenderIdAndCreatedAtBetween(
                eq(SENDER_ID), any(), any())).thenReturn(0L);
    }

    @Test
    @DisplayName("退款路径：创建失败 → REQUIRES_NEW 独立事务留下可见 CREDIT 流水行（主事务回滚不影响）")
    void refundPathWritesVisibleCreditRowInIndependentTransaction() {
        // 消息落库失败 → 触发退款路径（主事务将回滚）
        when(whisperMessageRepository.save(any(WhisperMessage.class)))
                .thenThrow(new RuntimeException("db down"));

        assertThrows(IllegalArgumentException.class, () -> whisperService.send(
                SENDER_ID, new WhisperSendRequest(RECEIVER_ID, "你好呀", CLIENT_REQUEST_ID)));

        // 1. wallet_transaction_log 存在可见 CREDIT 行：退款金额、关联类型、可对账 orderId
        ArgumentCaptor<WalletTransactionLog> logCaptor =
                ArgumentCaptor.forClass(WalletTransactionLog.class);
        List<WalletTransactionLog> refundCredits = savedLogs.stream()
                .filter(l -> "CREDIT".equals(l.getType()))
                .toList();
        assertEquals(1, refundCredits.size(), "退款路径应恰好写入一条 CREDIT 流水行");
        WalletTransactionLog credit = refundCredits.get(0);
        assertEquals(200L, credit.getAmount());
        assertEquals(10_000L, credit.getBalanceAfter(), "退款后余额应回到扣费前水平");
        assertEquals("WHISPER-REFUND-WHISPER-" + CLIENT_REQUEST_ID, credit.getOrderId(),
                "退款 orderId 应可与扣费流水（WHISPER-{clientRequestId}）直接关联");
        assertEquals(WalletTransactionLog.RELATED_TYPE_WHISPER_SEND, credit.getRelatedType());
        assertEquals(SENDER_ID, credit.getUserId());

        // 2. 等价机制验证：扣费与退款各自运行在 REQUIRES_NEW 独立事务中且均已提交
        //    （即使主事务回滚，扣费/退款事实行也可见——本用例主流程以异常结束）
        assertTrue(transactionManager.propagations.contains(TransactionDefinition.PROPAGATION_REQUIRES_NEW),
                "账务操作应经 REQUIRES_NEW 独立事务执行");
        assertTrue(transactionManager.commits.get() >= 2,
                "扣费事务与退款事务均应独立提交，实际提交次数=" + transactionManager.commits.get());
    }

    /** 记录型事务管理器：无真实资源，仅捕获传播行为与提交/回滚调用。 */
    private static final class RecordingTransactionManager implements PlatformTransactionManager {
        private final List<Integer> propagations = new ArrayList<>();
        private final java.util.concurrent.atomic.AtomicInteger commits = new java.util.concurrent.atomic.AtomicInteger();
        private final java.util.concurrent.atomic.AtomicInteger rollbacks = new java.util.concurrent.atomic.AtomicInteger();

        @Override
        public TransactionStatus getTransaction(TransactionDefinition definition) {
            propagations.add(definition.getPropagationBehavior());
            return new SimpleTransactionStatus();
        }

        @Override
        public void commit(TransactionStatus status) {
            commits.incrementAndGet();
        }

        @Override
        public void rollback(TransactionStatus status) {
            rollbacks.incrementAndGet();
        }
    }
}
