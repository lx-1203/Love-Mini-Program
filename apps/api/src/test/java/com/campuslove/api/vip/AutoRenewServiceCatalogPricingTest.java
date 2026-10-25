package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.User;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.entity.VipBillingLog;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

/**
 * P0-3 A：自动续费必须以 {@link VipPlanCatalog} 为定价与时长唯一真相源。
 *
 * <p><b>漏洞基线（修复前）</b>：{@code AutoRenewService} 硬编码
 * {@code DEFAULT_RENEW_AMOUNT_CENTS = 1990} 与 {@code RENEW_PERIOD_DAYS = 30}，
 * 与目录（月 1800 / 季 4800 / 年 15800）无任何关联：</p>
 * <ul>
 *   <li>月卡订阅被按 19.90 元扣款（目录价 18.00 元），季卡/年卡订阅也只按 19.90 元扣款、
 *       只顺延 30 天——用户花年卡的 158 元下单后，续费扣 19.9 元却只拿 30 天权益，
 *       定价与权益时长两处同时失真；</li>
 *   <li>{@code enable(userId, planId)} 只校验「非空白」，任何客户端 planId
 *       （含目录外 ID）都能开启自动续费；</li>
 *   <li>订阅套餐无法按目录定价时（历史脏数据 / 已下架套餐）仍照常扣款。</li>
 * </ul>
 *
 * <p><b>修复后契约</b>：续费金额与授予天数按「订阅的 planId」查目录得出
 * （订阅身份 = 最近一笔 SUCCESS 账单的 {@code plan_id} 快照，项目无订阅表且本次不加迁移）；
 * 空白/目录外/已下架一律 fail-closed——写 FAILED 流水、不产生任何钱包交易、不动账单；
 * 历史账单/订单的金额快照只读不写（仅顺延 {@code period_end}）；
 * 续费订单号仍走 {@code RENW-<uuid>} 唯一键幂等。</p>
 *
 * <p>RED 证据（对修复前代码执行同一组断言）：月卡扣款 1990≠1800、
 * 季卡/年卡只顺延 30 天、目录外套餐照旧扣款 1990、目录外 planId 也能开启自动续费。</p>
 */
class AutoRenewServiceCatalogPricingTest {

    private static final long USER_ID = 7001L;

    private VipBillRepository vipBillRepository;
    private VipBillingLogRepository vipBillingLogRepository;
    private UserRepository userRepository;
    private WalletService walletService;
    private RedissonClient redissonClient;
    private RLock rLock;
    private VipPlanCatalog catalog;

    @BeforeEach
    void setUp() throws InterruptedException {
        vipBillRepository = mock(VipBillRepository.class);
        vipBillingLogRepository = mock(VipBillingLogRepository.class);
        userRepository = mock(UserRepository.class);
        walletService = mock(WalletService.class);
        redissonClient = mock(RedissonClient.class);
        rLock = mock(RLock.class);
        catalog = new VipPlanCatalog();

        when(redissonClient.getLock("auto-renew:" + USER_ID)).thenReturn(rLock);
        when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(rLock.isHeldByCurrentThread()).thenReturn(true);
        // 续费流程要求「用户存在且已开启自动续费」，与目录口径无关，统一给正控桩
        when(userRepository.findById(USER_ID)).thenReturn(java.util.Optional.of(autoRenewUser()));
        when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(9999L);
        when(vipBillingLogRepository.save(any(VipBillingLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(vipBillRepository.save(any(VipBill.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    /**
     * 被测服务构造点。
     *
     * <p>目录经构造器注入（与钱包购买/微信下单链路同一颗容器 bean）：
     * 续费不得存在第二套定价，也不得在目录缺失时静默回退。</p>
     */
    private AutoRenewService newService() {
        return newServiceWithCatalog(catalog);
    }

    private AutoRenewService newServiceWithCatalog(VipPlanCatalog planCatalog) {
        return new AutoRenewService(userRepository, vipBillingLogRepository, vipBillRepository,
                redissonClient, walletService, planCatalog);
    }

    /** 开启自动续费的用户 */
    private User autoRenewUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setAutoRenewEnabled(true);
        return user;
    }

    /**
     * 订阅快照：一笔 SUCCESS 账单（续费套餐身份的唯一来源）。
     *
     * @param planId    订阅套餐 ID
     * @param amount    历史成交金额（分，续费不得改写）
     * @param daysLater 当前权益到期时间相对今天的天数
     */
    private VipBill subscriptionBill(String planId, int amount, int daysLater) {
        VipBill bill = new VipBill();
        bill.setId(500L);
        bill.setUserId(USER_ID);
        bill.setPlanId(planId);
        bill.setPlanName("历史套餐名");
        bill.setAmount(amount);
        bill.setOriginalAmount(amount);
        bill.setType("SUBSCRIBE");
        bill.setStatus("SUCCESS");
        bill.setPaymentMethod("WALLET");
        bill.setPeriodStart(LocalDateTime.now().minusDays(1));
        bill.setPeriodEnd(LocalDateTime.now().plusDays(daysLater));
        bill.setCreatedAt(LocalDateTime.now().minusDays(1));
        return bill;
    }

    private void givenSubscription(VipBill bill) {
        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(List.of(bill));
    }

    private VipBillingLog savedBillingLog() {
        ArgumentCaptor<VipBillingLog> captor = ArgumentCaptor.forClass(VipBillingLog.class);
        verify(vipBillingLogRepository).save(captor.capture());
        return captor.getValue();
    }

    private long deductedCents() {
        ArgumentCaptor<Long> captor = ArgumentCaptor.forClass(Long.class);
        verify(walletService).deduct(eq(USER_ID), captor.capture(), anyString(),
                eq(WalletTransactionLog.RELATED_TYPE_VIP_RENEW), anyString());
        return captor.getValue();
    }

    /* ==================== 1. 续费金额与时长取目录，不再是 1990/30 硬编码 ==================== */

    @Test
    @DisplayName("月卡订阅续费扣目录价 1800 分（不是硬编码 1990），顺延 30 天")
    void monthlySubscriptionRenewsAtCatalogPriceAndDuration() {
        VipBill bill = subscriptionBill("monthly", 1990, 3);
        givenSubscription(bill);
        LocalDateTime originalEnd = bill.getPeriodEnd();

        AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

        assertEquals("SUCCESS", result.status(), "续费应成功，实际: " + result.message());
        assertEquals(1800, deductedCents(), "月卡续费必须按服务端目录价 1800 分扣款，不得沿用 1990 硬编码");
        assertEquals(1800, result.amount());
        assertEquals(30, ChronoUnit.DAYS.between(originalEnd, savedTargetBill().getPeriodEnd()),
                "月卡续费应顺延 30 天");
    }

    @Test
    @DisplayName("季卡订阅续费扣 4800 分并顺延 90 天（不得按 30 天月度口径）")
    void quarterlySubscriptionRenewsAtCatalogPriceAnd90Days() {
        VipBill bill = subscriptionBill("quarterly", 4800, 1);
        givenSubscription(bill);
        LocalDateTime originalEnd = bill.getPeriodEnd();

        AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

        assertEquals("SUCCESS", result.status(), "续费应成功，实际: " + result.message());
        assertEquals(4800, deductedCents(), "季卡续费必须按目录价 4800 分扣款");
        assertEquals(90, ChronoUnit.DAYS.between(originalEnd, savedTargetBill().getPeriodEnd()),
                "季卡续费应顺延 90 天");
    }

    @Test
    @DisplayName("年卡订阅续费扣 15800 分并顺延 365 天")
    void yearlySubscriptionRenewsAtCatalogPriceAnd365Days() {
        VipBill bill = subscriptionBill("yearly", 15800, 1);
        givenSubscription(bill);
        LocalDateTime originalEnd = bill.getPeriodEnd();

        AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

        assertEquals("SUCCESS", result.status(), "续费应成功，实际: " + result.message());
        assertEquals(15800, deductedCents(), "年卡续费必须按目录价 15800 分扣款");
        assertEquals(365, ChronoUnit.DAYS.between(originalEnd, savedTargetBill().getPeriodEnd()),
                "年卡续费应顺延 365 天");
    }

    /** 取续费后被保存的订阅账单（权益顺延的目标行）。 */
    private VipBill savedTargetBill() {
        ArgumentCaptor<VipBill> captor = ArgumentCaptor.forClass(VipBill.class);
        verify(vipBillRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("续费流水金额与钱包扣款同为目录价（对账口径一致）")
    void billingLogAmountMatchesCatalogCharge() {
        givenSubscription(subscriptionBill("yearly", 15800, 2));

        newService().renewVip(USER_ID);

        VipBillingLog logEntry = savedBillingLog();
        assertEquals("SUCCESS", logEntry.getStatus());
        assertEquals(15800, logEntry.getAmount(), "续费流水金额必须是目录价，与钱包扣款同源");
    }

    @Test
    @DisplayName("续费不改写历史账单金额快照，仅顺延 period_end（历史订单只读）")
    void renewalDoesNotOverwriteHistoricalBillSnapshot() {
        VipBill bill = subscriptionBill("quarterly", 4300, 1);
        bill.setPlanName("历史活动价季卡");
        givenSubscription(bill);

        newService().renewVip(USER_ID);

        VipBill saved = savedTargetBill();
        assertEquals(4300, saved.getAmount(), "历史成交金额不得被续费改写");
        assertEquals(4300, saved.getOriginalAmount(), "历史原价不得被续费改写");
        assertEquals("quarterly", saved.getPlanId(), "订阅套餐身份不得被改写");
        assertEquals("历史活动价季卡", saved.getPlanName(), "历史套餐名不得被改写");
        assertNotNull(saved.getPeriodEnd());
    }

    /* ==================== 2. fail-closed：目录外/已下架/空白套餐不产生钱包交易 ==================== */

    @Test
    @DisplayName("订阅套餐不在服务端目录：拒绝续费，零钱包交易，流水记 FAILED")
    void unknownSubscriptionPlanIsRejectedWithoutWalletTransaction() {
        givenSubscription(subscriptionBill("lifetime", 1, 1));

        AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

        assertEquals("FAILED", result.status(), "目录外套餐必须 fail-closed");
        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
        assertEquals("FAILED", savedBillingLog().getStatus());
    }

    @Test
    @DisplayName("订阅套餐已下架（active=false）：拒绝续费，零钱包交易")
    void inactiveSubscriptionPlanIsRejectedWithoutWalletTransaction() {
        givenSubscription(subscriptionBill("monthly", 1800, 1));
        catalog = new VipPlanCatalog(Map.of(
                "monthly", new VipPlanCatalog.VipPlanDef("monthly", "月卡", 1800, 30, false)));

        AutoRenewService.RenewResultView result = newServiceWithCatalog(catalog).renewVip(USER_ID);

        assertEquals("FAILED", result.status(), "已下架套餐必须 fail-closed，不得继续按旧价扣款");
        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("订阅账单 planId 空白：拒绝续费，零钱包交易")
    void blankSubscriptionPlanIdIsRejectedWithoutWalletTransaction() {
        givenSubscription(subscriptionBill("   ", 1800, 1));

        AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

        assertEquals("FAILED", result.status());
        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("无 SUCCESS 订阅账单：不扣款、不凭空按月度口径建单")
    void missingActiveSubscriptionIsRejectedWithoutCharge() {
        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(List.of());

        AutoRenewService.RenewResultView result = newService().renewVip(USER_ID);

        assertEquals("FAILED", result.status());
        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    /* ==================== 3. 开启自动续费不得接受目录外 planId ==================== */

    @Test
    @DisplayName("开启自动续费：目录外 planId 被拒绝，不写库、不置为已开启")
    void enableRejectsPlanIdOutsideCatalog() {
        User user = new User();
        user.setId(USER_ID);
        user.setAutoRenewEnabled(false);
        when(userRepository.findById(USER_ID)).thenReturn(java.util.Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> newService().enable(USER_ID, "not-a-plan"));

        verify(userRepository, never()).save(any(User.class));
        assertTrue(Boolean.FALSE.equals(user.getAutoRenewEnabled()), "非法套餐不得开启自动续费");
    }

    @Test
    @DisplayName("开启自动续费：已下架 planId 被拒绝")
    void enableRejectsInactivePlanId() {
        User user = new User();
        user.setId(USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(java.util.Optional.of(user));
        VipPlanCatalog offline = new VipPlanCatalog(Map.of(
                "yearly", new VipPlanCatalog.VipPlanDef("yearly", "年卡", 15800, 365, false)));

        assertThrows(IllegalArgumentException.class, () -> newServiceWithCatalog(offline).enable(USER_ID, "yearly"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("正控：目录内在售 planId 可开启自动续费")
    void enableAcceptsPurchasablePlanId() {
        User user = new User();
        user.setId(USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(java.util.Optional.of(user));

        AutoRenewService.AutoRenewStatusView view = newService().enable(USER_ID, "quarterly");

        assertTrue(view.enabled());
        verify(userRepository).save(user);
    }

    /* ==================== 4. 幂等键与锁语义保持不变 ==================== */

    @Test
    @DisplayName("续费订单号 RENW- 前缀唯一，且作为钱包 orderId 与流水 orderNo 同值（幂等键不变）")
    void renewOrderIdIsUniqueAndSharedBetweenWalletAndLedger() {
        givenSubscription(subscriptionBill("monthly", 1800, 1));

        AutoRenewService.RenewResultView first = newService().renewVip(USER_ID);
        AutoRenewService.RenewResultView second = newService().renewVip(USER_ID);

        ArgumentCaptor<String> orderIdCaptor = ArgumentCaptor.forClass(String.class);
        verify(walletService, org.mockito.Mockito.times(2))
                .deduct(eq(USER_ID), anyLong(), orderIdCaptor.capture(), anyString(), anyString());
        List<String> orderIds = orderIdCaptor.getAllValues();
        assertTrue(orderIds.get(0).startsWith("RENW-"), "续费订单号前缀保持 RENW-，实际: " + orderIds.get(0));
        assertTrue(!orderIds.get(0).equals(orderIds.get(1)), "两次续费必须使用不同订单号");

        ArgumentCaptor<VipBillingLog> logCaptor = ArgumentCaptor.forClass(VipBillingLog.class);
        verify(vipBillingLogRepository, org.mockito.Mockito.times(2)).save(logCaptor.capture());
        List<VipBillingLog> logs = logCaptor.getAllValues();
        assertEquals(orderIds.get(0), logs.get(0).getOrderNo(), "流水 orderNo 必须等于钱包 orderId");
        assertEquals(orderIds.get(1), logs.get(1).getOrderNo(), "流水 orderNo 必须等于钱包 orderId");
        assertEquals(first.orderNo(), orderIds.get(0));
        assertEquals(second.orderNo(), orderIds.get(1));
    }
}
