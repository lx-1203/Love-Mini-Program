package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.entity.VipBillingLog;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.wallet.WalletService;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * S1-2（2026-10-30）：自动续费的资金幂等与失败流水落库。
 *
 * <p><b>漏洞基线（修复前）</b></p>
 * <ol>
 *   <li>{@code renewVip} 的订单号是每次进方法新生成的 UUID，于是本类文档一直声称的
 *       「重复调用同一 orderNo 会直接返回已处理结果，不会重复扣减」在续费链路上从未成立：
 *       分布式锁 30 秒持锁超时自动释放、Redis 重启、扫描被重复触发——任一发生后，
 *       同一续费周期就会二次扣款并二次顺延 VIP。锁是唯一的防线，而锁会失效。</li>
 *   <li>FAILED 流水写在 {@code renewVip} 的事务内，而该方法的失败分支大多 rethrow
 *       （用户不存在、数据访问异常、中断），主事务回滚把「这一轮续费失败过」的证据
 *       一起抹掉，对账与告警都看不到失败轨迹。</li>
 * </ol>
 *
 * <p><b>修复后契约</b>：订单号 = {@code RENW-<userId>-<planId>-<当前到期日>}，
 * 一个续费周期只有一个键；扣款前用 SUCCESS 流水短路（重放绝不只靠唯一索引兜底，
 * 因为 {@code WalletService.deduct} 命中旧单时静默返回旧余额，调用方无从分辨，
 * 继续往下走就是白送一个周期权益）；FAILED 流水经代理走 {@code REQUIRES_NEW}。</p>
 *
 * <p>RED 证据（对修复前代码执行同一组断言）：确定性键用例会拿到两个不同 UUID 订单号；
 * 短路用例会出现第二次 deduct 与账单顺延；FAILED 代理用例验证不到
 * {@code writeFailedBillingLog} 调用，且方法根本不存在（反射取方法即失败）。</p>
 */
class AutoRenewOrderIdempotencyTest {

    private static final long USER_ID = 8801L;
    /** order_no 列宽（V2026.07.27.0002__vip_billing_log.sql）：幂等键不得超出。 */
    private static final int ORDER_NO_COLUMN_WIDTH = 64;

    private VipBillRepository vipBillRepository;
    private VipBillingLogRepository vipBillingLogRepository;
    private UserRepository userRepository;
    private WalletService walletService;
    private RedissonClient redissonClient;
    private RLock rLock;

    @BeforeEach
    void setUp() throws InterruptedException {
        vipBillRepository = mock(VipBillRepository.class);
        vipBillingLogRepository = mock(VipBillingLogRepository.class);
        userRepository = mock(UserRepository.class);
        walletService = mock(WalletService.class);
        redissonClient = mock(RedissonClient.class);
        rLock = mock(RLock.class);

        when(redissonClient.getLock("auto-renew:" + USER_ID)).thenReturn(rLock);
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(rLock.isHeldByCurrentThread()).thenReturn(true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(autoRenewUser()));
        when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(9999L);
        when(vipBillingLogRepository.save(any(VipBillingLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(vipBillRepository.save(any(VipBill.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private AutoRenewService newService() {
        return new AutoRenewService(userRepository, vipBillingLogRepository, vipBillRepository,
                redissonClient, walletService, new VipPlanCatalog());
    }

    private User autoRenewUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setAutoRenewEnabled(true);
        return user;
    }

    /** 订阅快照：一笔 SUCCESS 月卡账单，当前到期日为 {@code periodEnd}。 */
    private void givenSubscriptionEndingAt(LocalDateTime periodEnd) {
        VipBill bill = new VipBill();
        bill.setId(900L);
        bill.setUserId(USER_ID);
        bill.setPlanId("monthly");
        bill.setPlanName("月卡");
        bill.setAmount(1800);
        bill.setOriginalAmount(1800);
        bill.setType("SUBSCRIBE");
        bill.setStatus("SUCCESS");
        bill.setPaymentMethod("WALLET");
        bill.setPeriodStart(periodEnd.minusDays(30));
        bill.setPeriodEnd(periodEnd);
        bill.setCreatedAt(periodEnd.minusDays(30));
        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(List.of(bill));
    }

    @Nested
    @DisplayName("确定性幂等键")
    class OrderKey {

        @Test
        @DisplayName("同用户同套餐同到期日必得同一键；到期日或套餐推进则换键")
        void keyIsDeterministicPerPeriod() {
            LocalDateTime periodEnd = LocalDateTime.of(2026, 11, 1, 0, 0, 0);

            String first = AutoRenewService.renewalOrderNo(USER_ID, "monthly", periodEnd);
            String same = AutoRenewService.renewalOrderNo(USER_ID, "monthly", periodEnd);
            String nextPeriod = AutoRenewService.renewalOrderNo(USER_ID, "monthly", periodEnd.plusDays(30));
            String otherPlan = AutoRenewService.renewalOrderNo(USER_ID, "quarterly", periodEnd);
            String otherUser = AutoRenewService.renewalOrderNo(USER_ID + 1, "monthly", periodEnd);

            assertEquals(first, same, "同一续费周期的键必须逐字相同");
            assertNotEquals(first, nextPeriod, "周期推进后必须换键，否则下一轮续费会被误拦");
            assertNotEquals(first, otherPlan, "换套餐必须换键");
            assertNotEquals(first, otherUser, "不同用户必须不同键，否则会串号扣款");
            assertTrue(first.startsWith("RENW-"), "前缀保持 RENW-，实际: " + first);
            assertTrue(first.length() <= ORDER_NO_COLUMN_WIDTH,
                    "幂等键不得超过 order_no 列宽，实际长度 " + first.length() + "：" + first);
        }

        @Test
        @DisplayName("扣款 orderId 采用确定性键：可被 wallet_transaction_log 唯一索引拦住")
        void deductUsesDeterministicKey() {
            LocalDateTime periodEnd = LocalDateTime.of(2026, 11, 1, 0, 0, 0);
            givenSubscriptionEndingAt(periodEnd);

            AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

            ArgumentCaptor<String> orderId = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<String> relatedId = ArgumentCaptor.forClass(String.class);
            verify(walletService).deduct(eq(USER_ID), eq(1800L), orderId.capture(),
                    anyString(), relatedId.capture());
            assertEquals(AutoRenewService.renewalOrderNo(USER_ID, "monthly", periodEnd),
                    orderId.getValue(), "钱包 orderId 必须是确定性周期键，而不是随机 UUID");
            assertEquals(orderId.getValue(), relatedId.getValue(),
                    "relatedId 与 orderId 同值，保证对账两侧指向同一笔周期续费");
            assertEquals(orderId.getValue(), result.orderNo(), "返回订单号与实际扣款键一致");
        }
    }

    @Nested
    @DisplayName("重放短路")
    class Replay {

        @Test
        @DisplayName("本周期已有 SUCCESS 流水：不再扣款、不再顺延权益、不重复写流水")
        void alreadyRenewedThisPeriodSkipsEverything() {
            givenSubscriptionEndingAt(LocalDateTime.of(2026, 11, 1, 0, 0, 0));
            when(vipBillingLogRepository.existsByOrderNoAndStatus(anyString(), eq("SUCCESS")))
                    .thenReturn(true);

            AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

            assertEquals("SKIPPED", result.status(), "重放必须给出独立状态，避免被扫描统计算成续费成功");
            assertEquals(Integer.valueOf(0), result.amount(), "重放不产生任何扣款");
            verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
            verify(vipBillRepository, never()).save(any(VipBill.class));
            verify(vipBillingLogRepository, never()).save(any(VipBillingLog.class));
            assertTrue(result.message() != null && !result.message().isBlank(),
                    "短路必须带回可读原因：" + result.message());
        }

        @Test
        @DisplayName("无 SUCCESS 流水时正常续费一次（短路不得吃掉合法续费）")
        void freshPeriodStillRenews() {
            givenSubscriptionEndingAt(LocalDateTime.of(2026, 11, 1, 0, 0, 0));
            when(vipBillingLogRepository.existsByOrderNoAndStatus(anyString(), eq("SUCCESS")))
                    .thenReturn(false);

            AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

            assertEquals("SUCCESS", result.status());
            verify(walletService).deduct(eq(USER_ID), eq(1800L), anyString(), anyString(), anyString());
            verify(vipBillRepository).save(any(VipBill.class));
        }
    }

    @Nested
    @DisplayName("失败流水独立事务")
    class FailedLedger {

        @Test
        @DisplayName("FAILED 经代理写入：主事务回滚不能抹掉失败证据")
        void failedLedgerGoesThroughProxy() throws Exception {
            AutoRenewService service = newService();
            AutoRenewService proxy = mock(AutoRenewService.class);
            injectSelf(service, proxy);

            // 用户不存在：原分支写 FAILED 流水后 rethrow，主事务回滚
            when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());
            assertThrows(IllegalArgumentException.class, () -> service.renewVip(USER_ID));

            verify(proxy).writeFailedBillingLog(eq(USER_ID),
                    argThat(s -> s != null && s.startsWith("RENW-")), eq(0));
            verify(vipBillingLogRepository, never()).save(any(VipBillingLog.class));
        }

        @Test
        @DisplayName("SUCCESS 流水留在主事务内：顺延失败不得留下成功假账")
        void successLedgerStaysInMainTransaction() throws Exception {
            AutoRenewService service = newService();
            AutoRenewService proxy = mock(AutoRenewService.class);
            injectSelf(service, proxy);
            givenSubscriptionEndingAt(LocalDateTime.of(2026, 11, 1, 0, 0, 0));

            assertEquals("SUCCESS", service.renewVip(USER_ID).status());

            verify(proxy, never()).writeFailedBillingLog(any(), anyString(), anyInt());
            ArgumentCaptor<VipBillingLog> saved = ArgumentCaptor.forClass(VipBillingLog.class);
            verify(vipBillingLogRepository).save(saved.capture());
            assertEquals("SUCCESS", saved.getValue().getStatus());
        }

        @Test
        @DisplayName("失败流水方法必须是 public + REQUIRES_NEW 才能被代理应用")
        void failedLedgerMethodIsProxyable() throws Exception {
            Method method = AutoRenewService.class.getMethod(
                    "writeFailedBillingLog", Long.class, String.class, int.class);
            Transactional tx = method.getAnnotation(Transactional.class);
            assertNotNull(tx, "失败流水方法必须带 @Transactional，否则 REQUIRES_NEW 无从谈起");
            assertEquals(Propagation.REQUIRES_NEW, tx.propagation(),
                    "必须独立提交，否则外层 rethrow 回滚会连带抹掉失败流水");
        }

        private void injectSelf(AutoRenewService service, AutoRenewService proxy) throws Exception {
            Field field = AutoRenewService.class.getDeclaredField("self");
            field.setAccessible(true);
            field.set(service, proxy);
        }
    }

    @Nested
    @DisplayName("扫描级互斥（2026-10-31 P2）")
    class SweepLock {

        /** 扫描锁与逐用户锁是两把不同的锁：这里只关心 scheduled:autoRenewScan:* 那把。 */
        private final RLock sweepLock = mock(RLock.class);

        private void stubSweepLock(boolean acquirable) throws InterruptedException {
            when(redissonClient.getLock(startsWith("scheduled:autoRenewScan:"))).thenReturn(sweepLock);
            when(sweepLock.tryLock(anyLong(), any(TimeUnit.class))).thenReturn(acquirable);
            when(sweepLock.isHeldByCurrentThread()).thenReturn(acquirable);
        }

        /** 单测里 self 注入实现本体，等价于「扫描真的会去逐个调用 renewVip」。 */
        private AutoRenewService serviceWithSelf() throws Exception {
            AutoRenewService service = newService();
            Field field = AutoRenewService.class.getDeclaredField("self");
            field.setAccessible(true);
            field.set(service, service);
            return service;
        }

        @Test
        @DisplayName("行为变更：另一副本正在扫描时，本轮整轮跳过，一条 FAILED 流水都不写")
        void secondSweepWritesNoFailedLedger() throws Exception {
            stubSweepLock(false);
            // 修复前的复现条件：扫描没有互斥 ⇒ 本副本照旧逐用户 renewVip，
            // 而逐用户锁被第一个副本占着 ⇒ 等满 5 秒后走「未获取到锁」分支写 FAILED。
            // FAILED 流水自今天起 REQUIRES_NEW 独立提交、不随主事务回滚，于是这些
            // 纯并发造出来的假失败会真的留在账上，污染对账与 FAILED 计数告警。
            when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(false);
            givenSubscriptionEndingAt(LocalDateTime.now().minusDays(1));
            when(userRepository.findByAutoRenewEnabledTrue()).thenReturn(List.of(autoRenewUser()));

            AutoRenewService.RenewScanResult result = serviceWithSelf().runRenewScan();

            assertEquals(0, result.scanned(), "未抢到扫描锁 ⇒ 一个用户都不该被扫描");
            assertEquals(0, result.failed());
            verify(userRepository, never()).findByAutoRenewEnabledTrue();
            verify(vipBillingLogRepository, never()).save(any(VipBillingLog.class));
            verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
            // 没拿到锁却去解锁 = 解掉别人的锁，绝对不允许
            verify(sweepLock, never()).unlock();
        }

        @Test
        @DisplayName("扫描锁取得后：正常完成一轮并把锁释放（不传固定租期，交看门狗续期）")
        void sweepRunsAndReleasesLock() throws Exception {
            stubSweepLock(true);
            givenSubscriptionEndingAt(LocalDateTime.now().minusDays(1));
            when(userRepository.findByAutoRenewEnabledTrue()).thenReturn(List.of(autoRenewUser()));

            AutoRenewService.RenewScanResult result = serviceWithSelf().runRenewScan();

            assertEquals(1, result.scanned());
            assertEquals(1, result.renewed());
            verify(sweepLock).tryLock(0L, TimeUnit.SECONDS);
            verify(sweepLock, never()).tryLock(anyLong(), anyLong(), any(TimeUnit.class));
            verify(sweepLock).unlock();
        }

        @Test
        @DisplayName("逐用户锁仍是资金闸门：真并发竞争照样留下 FAILED 证据（未被扫描锁削弱）")
        void perUserLockContentionStillWritesFailedLedger() throws Exception {
            stubSweepLock(true);
            when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(false);
            givenSubscriptionEndingAt(LocalDateTime.now().minusDays(1));
            when(userRepository.findByAutoRenewEnabledTrue()).thenReturn(List.of(autoRenewUser()));

            AutoRenewService.RenewScanResult result = serviceWithSelf().runRenewScan();

            assertEquals(1, result.failed(), "同用户真实竞争（手动续费/重放）仍必须计入失败");
            ArgumentCaptor<VipBillingLog> saved = ArgumentCaptor.forClass(VipBillingLog.class);
            verify(vipBillingLogRepository).save(saved.capture());
            assertEquals("FAILED", saved.getValue().getStatus());
            assertEquals(Integer.valueOf(0), saved.getValue().getAmount(), "未扣款则流水金额为 0");
        }
    }
}
