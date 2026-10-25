package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.wallet.InsufficientBalanceException;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * P0-3：VIP 钱包购买必须使用服务端套餐权威定价与时长（不接受客户端金额）。
 *
 * <p>漏洞基线（修复前）：{@code POST /api/v1/vip/bills/purchase} 接受客户端上送的
 * {@code baseAmount} 与 {@code planName}，{@code BillingService#purchaseVip} 直接以
 * 该金额计算优惠、扣钱包，并固定授予 30 天——「1 分买走 18 元月卡」「负数/巨额金额」
 * 均可绕过定价，年卡/季卡也只给 30 天。</p>
 *
 * <p>修复后契约：客户端仅被信任传 {@code planId}（+ 可选 {@code promoCode}），
 * 套餐名称、价格（分）、授予天数一律取服务端 {@link VipPlanCatalog}——
 * 与微信支付下单链路（{@code VipOrderService}）同一份目录，不存在第二套定价。</p>
 *
 * <p>RED 证据（对修复前代码执行同一组断言）：
 * 1 分月卡按 1 分扣款、季卡/年卡只授予 30 天（expected 90/365 but was 30）、
 * 目录外套餐成交、优惠码以客户端 1 分为基数——均失败，见提交历史。</p>
 */
class BillingServicePurchaseServerPricingTest {

    private static final long USER_ID = 100L;
    /** 攻击者试图用 1 分买走月卡 */
    private static final int ATTACKER_CENTS = 1;

    private VipBillRepository vipBillRepository;
    private WalletService walletService;
    private PromoCodeService promoCodeService;
    private BillingService service;
    /** 被测服务共用的目录实例（生产由容器注入同一颗 bean，这里显式传入同一实例） */
    private VipPlanCatalog catalog;

    @BeforeEach
    void setUp() {
        vipBillRepository = mock(VipBillRepository.class);
        PaymentCallbackLogRepository callbackLogRepository = mock(PaymentCallbackLogRepository.class);
        walletService = mock(WalletService.class);
        promoCodeService = mock(PromoCodeService.class);
        catalog = new VipPlanCatalog();

        service = new BillingService(vipBillRepository, callbackLogRepository, catalog);
        ReflectionTestUtils.setField(service, "walletService", walletService);
        ReflectionTestUtils.setField(service, "promoCodeService", promoCodeService);

        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());
        when(vipBillRepository.save(any(VipBill.class))).thenAnswer(inv -> {
            VipBill bill = inv.getArgument(0);
            bill.setId(9001L);
            return bill;
        });
        when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(5000L);
    }

    private VipBill savedBill() {
        ArgumentCaptor<VipBill> captor = ArgumentCaptor.forClass(VipBill.class);
        verify(vipBillRepository).save(captor.capture());
        return captor.getValue();
    }

    /** 取最近一次落库账单（多档套餐连续购买场景）。 */
    private VipBill lastSavedBill() {
        ArgumentCaptor<VipBill> captor = ArgumentCaptor.forClass(VipBill.class);
        verify(vipBillRepository, atLeastOnce()).save(captor.capture());
        List<VipBill> all = captor.getAllValues();
        return all.get(all.size() - 1);
    }

    private long deductedCents() {
        ArgumentCaptor<Long> captor = ArgumentCaptor.forClass(Long.class);
        verify(walletService).deduct(eq(USER_ID), captor.capture(), anyString(), anyString(), anyString());
        return captor.getValue();
    }

    /* ==================== 1. 客户端金额不再决定价格 ==================== */

    @Test
    @DisplayName("购买入参不含金额：1 分买月卡的请求体无法再表达，扣款取服务端目录价 1800 分")
    void oneCentClientAmountCannotBuyMonthlyPlan() {
        service.purchaseVip(USER_ID, "monthly", null);

        verify(walletService).deduct(eq(USER_ID), eq(1800L), anyString(),
                eq(WalletTransactionLog.RELATED_TYPE_VIP_PURCHASE), anyString());
    }

    @Test
    @DisplayName("账单原价与实付均由服务端目录价推导，且套餐名取目录名")
    void billAmountAndPlanNameComeFromServerCatalog() {
        service.purchaseVip(USER_ID, "monthly", null);

        VipBill bill = savedBill();
        assertEquals(1800, bill.getOriginalAmount(), "原价必须取服务端目录价");
        assertEquals(1800, bill.getAmount(), "实付必须由服务端目录价推导");
        assertEquals("月卡", bill.getPlanName(), "套餐名必须取服务端目录名，不接受客户端伪造");
        assertEquals("monthly", bill.getPlanId());
    }

    @Test
    @DisplayName("旧契约调用方（仍上送 planName/baseAmount）：字段被忽略，仍按服务端目录价成交")
    void legacyBodyFieldsAreIgnoredAndServerPriceStillUsed() throws Exception {
        // 老客户端请求体：planName 与 baseAmount 已从契约移除，Jackson（与 Boot 默认一致的构造器）忽略未知字段
        var objectMapper = Jackson2ObjectMapperBuilder.json().build();
        String legacyBody = "{\"planId\":\"monthly\",\"planName\":\"免费年卡\","
                + "\"baseAmount\":" + ATTACKER_CENTS + ",\"promoCode\":null}";

        VipPurchaseRequest request = objectMapper.readValue(legacyBody, VipPurchaseRequest.class);
        assertEquals("monthly", request.planId());
        assertNull(request.promoCode());

        // 契约层已不存在金额字段：控制器只可能把 planId/promoCode 交给服务
        Set<String> requestFields = Set.of(java.util.Arrays.stream(
                VipPurchaseRequest.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName).toArray(String[]::new));
        assertEquals(Set.of("planId", "promoCode"), requestFields);

        service.purchaseVip(USER_ID, request.planId(), request.promoCode());
        assertEquals(1800L, deductedCents(), "旧客户端上送的 1 分不得影响扣款金额");
    }

    @Test
    @DisplayName("旧契约请求体缺失 planId：校验失败（fail-closed），不得进入购买")
    void legacyBodyWithoutPlanIdFailsValidation() {
        assertEquals(Set.of("planId", "promoCode"), requestContractFields(),
                "请求体不得再携带任何金额/名称字段");

        var violations = jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator()
                .validate(new VipPurchaseRequest(null, null));

        assertEquals(1, violations.size(), "planId 缺失必须触发 @NotBlank 校验");
        assertEquals("套餐 ID 不能为空", violations.iterator().next().getMessage());
    }

    private static Set<String> requestContractFields() {
        return Set.of(java.util.Arrays.stream(VipPurchaseRequest.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName).toArray(String[]::new));
    }

    /* ==================== 2. 三档套餐：服务端价格 + 精确时长 ==================== */

    @Test
    @DisplayName("三档套餐映射到服务端目录价：月 1800 / 季 4800 / 年 15800")
    void threePlansUseServerCatalogPrices() {
        service.purchaseVip(USER_ID, "monthly", null);
        assertEquals(1800L, deductedCents());

        clearInvocations(walletService);
        service.purchaseVip(USER_ID, "quarterly", null);
        assertEquals(4800L, deductedCents(), "季卡须按服务端目录价 4800 分扣款");

        clearInvocations(walletService);
        service.purchaseVip(USER_ID, "yearly", null);
        assertEquals(15800L, deductedCents(), "年卡须按服务端目录价 15800 分扣款");
    }

    @Test
    @DisplayName("授予时长取套餐天数：月 30 / 季 90 / 年 365（不再固定 30 天）")
    void eachPlanGrantsItsOwnDuration() {
        service.purchaseVip(USER_ID, "monthly", null);
        assertEquals(30, grantedDays(savedBill()), "月卡授予 30 天");

        clearInvocations(vipBillRepository);
        service.purchaseVip(USER_ID, "quarterly", null);
        assertEquals(90, grantedDays(lastSavedBill()), "季卡授予 90 天，不得沿用固定 30 天");

        clearInvocations(vipBillRepository);
        service.purchaseVip(USER_ID, "yearly", null);
        assertEquals(365, grantedDays(lastSavedBill()), "年卡授予 365 天，不得沿用固定 30 天");
    }

    private static int grantedDays(VipBill bill) {
        return (int) ChronoUnit.DAYS.between(
                bill.getPeriodStart().truncatedTo(ChronoUnit.SECONDS),
                bill.getPeriodEnd().truncatedTo(ChronoUnit.SECONDS));
    }

    /* ==================== 3. 优惠码折扣以服务端原价为基数 ==================== */

    @Test
    @DisplayName("优惠码折扣以服务端目录原价计算，实付=目录价-折扣")
    void promoDiscountCalculatedOnServerPrice() {
        when(promoCodeService.redeem("SAVE1000", USER_ID, 1800))
                .thenReturn(new PromoCodeService.RedeemResultView(1L, "SAVE1000", 1000, 800));

        BillingService.PurchaseResultView result = service.purchaseVip(USER_ID, "monthly", "SAVE1000");

        verify(promoCodeService).redeem("SAVE1000", USER_ID, 1800);
        assertEquals(1000, result.discountAmount());
        assertEquals(800, result.finalAmount());
        assertEquals(1800, result.baseAmount());
        assertEquals(800L, deductedCents());
        assertEquals(1800, savedBill().getOriginalAmount());
    }

    /* ==================== 4. 非法/下架套餐：零资金副作用 ==================== */

    @Test
    @DisplayName("目录外套餐 ID 拒绝购买：不扣钱包、不写账单")
    void unknownPlanIdIsRejectedWithoutDeductingWallet() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.purchaseVip(USER_ID, "not-a-plan", null));

        assertEquals("非法套餐: not-a-plan", ex.getMessage());
        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("缺失/空白套餐 ID 拒绝购买：不扣钱包、不写账单")
    void missingPlanIdIsRejectedWithoutDeductingWallet() {
        assertThrows(IllegalArgumentException.class, () -> service.purchaseVip(USER_ID, "  ", null));
        assertThrows(IllegalArgumentException.class, () -> service.purchaseVip(USER_ID, null, null));

        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("已下架套餐（active=false）拒绝成交：不扣钱包、不写账单")
    void inactivePlanIsRejectedWithoutDeductingWallet() {
        BillingService offlineService = new BillingService(
                vipBillRepository, mock(PaymentCallbackLogRepository.class),
                new VipPlanCatalog(Map.of(
                        "monthly", new VipPlanCatalog.VipPlanDef("monthly", "月卡", 1800, 30, false))));
        ReflectionTestUtils.setField(offlineService, "walletService", walletService);
        ReflectionTestUtils.setField(offlineService, "promoCodeService", promoCodeService);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> offlineService.purchaseVip(USER_ID, "monthly", null));

        assertEquals("套餐已下架: monthly", ex.getMessage());
        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    /* ==================== 5. 目录唯一真相源 + 失败回滚 ==================== */

    @Test
    @DisplayName("钱包购买与微信下单共用注入的同一目录实例（不存在第二套定价）")
    void walletAndWechatOrderPathsShareOneCatalog() {
        // 两条链路注入同一颗目录实例；真实容器装配的唯一性由
        // VipPlanCatalogContainerWiringTest 断言，本用例断言「链路只认注入的目录，
        // 不再存在静态回退的第二份常量」。
        VipOrderService orderService = new VipOrderService(
                mock(com.campuslove.api.repository.VipOrderRepository.class),
                mock(BillingService.class),
                mock(PaymentCallbackLogRepository.class),
                catalog);

        assertSame(catalog, ReflectionTestUtils.getField(service, "planCatalog"));
        assertSame(catalog, ReflectionTestUtils.getField(orderService, "planCatalog"));

        assertEquals(1800, catalog.requirePurchasable("monthly").priceCents());
        assertEquals(30, catalog.requirePurchasable("monthly").days());
        assertEquals(4800, catalog.requirePurchasable("quarterly").priceCents());
        assertEquals(90, catalog.requirePurchasable("quarterly").days());
        assertEquals(15800, catalog.requirePurchasable("yearly").priceCents());
        assertEquals(365, catalog.requirePurchasable("yearly").days());

        service.purchaseVip(USER_ID, "yearly", null);
        assertEquals(15800L, deductedCents());
        assertEquals(365, grantedDays(savedBill()));
    }

    @Test
    @DisplayName("三条资金链路都显式声明目录依赖：无目录即无法构造（杜绝静默回退）")
    void allMoneyPathsDeclareCatalogDependency() {
        assertTrue(parameterTypes(BillingService.class).contains(VipPlanCatalog.class),
                "BillingService 必须显式声明目录依赖");
        assertTrue(parameterTypes(VipOrderService.class).contains(VipPlanCatalog.class),
                "VipOrderService 必须显式声明目录依赖");
        assertTrue(parameterTypes(AutoRenewService.class).contains(VipPlanCatalog.class),
                "AutoRenewService 必须显式声明目录依赖（续费定价与购买同源）");

        // 目录类不再暴露「生产默认实例」这类静态回退入口（回退会让容器 bean 与常量并存）。
        // 只按「源码声明的静态方法」判定：JaCoCo agent 在运行期给每个被 instrument 的类
        // 注入一个 static synthetic $jacocoInit，若不过滤 synthetic，本断言会随覆盖率
        // 开关漂移（mvn test 带 agent 时假红、不带 agent 时假绿）。
        assertTrue(java.util.Arrays.stream(VipPlanCatalog.class.getDeclaredMethods())
                        .filter(m -> !m.isSynthetic() && !m.isBridge())
                        .noneMatch(m -> java.lang.reflect.Modifier.isStatic(m.getModifiers())),
                "VipPlanCatalog 不应再有静态方法（defaultCatalog 一类的第二份目录）");

        // 目录实例不可变：外部改动目录 Map 也影响不到已构造的目录
        Map<String, VipPlanCatalog.VipPlanDef> mutable = new java.util.HashMap<>();
        mutable.put("monthly", new VipPlanCatalog.VipPlanDef("monthly", "月卡", 1800, 30, true));
        VipPlanCatalog defensive = new VipPlanCatalog(mutable);
        mutable.remove("monthly");
        assertEquals(1800, defensive.requirePurchasable("monthly").priceCents());
    }

    private static List<Class<?>> parameterTypes(Class<?> type) {
        return java.util.Arrays.stream(type.getConstructors())
                .flatMap(c -> java.util.Arrays.stream(c.getParameterTypes()))
                .toList();
    }

    @Test
    @DisplayName("余额不足：异常向上传播（同一事务回滚），不写账单")
    void insufficientBalanceDoesNotWriteBill() {
        when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenThrow(new InsufficientBalanceException(USER_ID, 1800L, 0L));

        assertThrows(InsufficientBalanceException.class,
                () -> service.purchaseVip(USER_ID, "monthly", null));

        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("账单落库失败：异常向上传播（@Transactional 整体回滚，不吞异常）")
    void billSaveFailurePropagatesForTransactionRollback() {
        when(vipBillRepository.save(any(VipBill.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("唯一约束冲突"));

        assertThrows(RuntimeException.class, () -> service.purchaseVip(USER_ID, "monthly", null));
    }

    @Test
    @DisplayName("优惠码兑换失败时不扣钱包（同一事务，失败即整体回滚）")
    void promoRedeemFailureDoesNotDeductWallet() {
        when(promoCodeService.redeem(anyString(), anyLong(), any(Integer.class)))
                .thenThrow(new IllegalArgumentException("优惠码已过期"));

        assertThrows(IllegalArgumentException.class,
                () -> service.purchaseVip(USER_ID, "monthly", "EXPIRED"));

        verifyNoInteractions(walletService);
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("购买后 VIP 到期时间基于已有账单顺延（保留既有 grantVipExpiry 语义）")
    void expiryStacksOnTopOfExistingActiveBill() {
        LocalDateTime futureEnd = LocalDateTime.now().plusDays(10);
        VipBill existing = new VipBill();
        existing.setStatus("SUCCESS");
        existing.setPeriodEnd(futureEnd);
        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of(existing));

        service.purchaseVip(USER_ID, "monthly", null);

        VipBill bill = savedBill();
        assertEquals(30, ChronoUnit.DAYS.between(futureEnd.truncatedTo(ChronoUnit.SECONDS),
                bill.getPeriodEnd().truncatedTo(ChronoUnit.SECONDS)), "月卡应在既有到期时间上顺延 30 天");
    }

    @Test
    @DisplayName("季卡在既有到期时间上顺延 90 天（时长来自目录，非固定 30 天）")
    void expiryStacksNineDaysForQuarterlyPlan() {
        LocalDateTime futureEnd = LocalDateTime.now().plusDays(5);
        VipBill existing = new VipBill();
        existing.setStatus("SUCCESS");
        existing.setPeriodEnd(futureEnd);
        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of(existing));

        service.purchaseVip(USER_ID, "quarterly", null);

        VipBill bill = savedBill();
        assertEquals(90, ChronoUnit.DAYS.between(futureEnd.truncatedTo(ChronoUnit.SECONDS),
                bill.getPeriodEnd().truncatedTo(ChronoUnit.SECONDS)));
        assertTrue(bill.getPeriodEnd().isAfter(futureEnd));
    }
}
