package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.PromoCode;
import com.campuslove.api.entity.PromoCodeUsage;
import com.campuslove.api.entity.VipBill;
import com.campuslove.api.repository.PaymentCallbackLogRepository;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.PromoCodeUsageRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * P0-3 B：优惠码「消耗」只能发生在购买事务内（端到端账本用例）。
 *
 * <p><b>缺陷基线</b>：公开端点 {@code POST /api/v1/vip/promo-codes/redeem} 会真实消耗
 * 优惠码（原子扣减 {@code remaining_uses} + 写 {@code promo_code_usages}），
 * 而唯一的资金消费方 {@link BillingService#purchaseVip} 又调用同一个消耗式
 * {@link PromoCodeService#redeem}。客户端唯一调用 {@code /redeem} 的地方是
 * 「优惠码」独立页（{@code apps/client/src/subpackages/vip/promo-code.vue}：
 * 手工输入订单金额 → 校验 → 兑换 → 弹窗展示折扣），该页既不创建订单也不扣款，
 * 全客户端没有任何 {@code /vip/bills/purchase} 调用。于是：</p>
 * <ul>
 *   <li>用户按页面提示「兑换」一次，单次可用优惠码即被吃掉了
 *       （{@code remaining_uses} 归零 + 用量记录落库），后续购买必然报
 *       「已达使用次数上限」——码被耗尽却没有任何资金事件，营销链路断裂；</li>
 *   <li>兑换时的折扣金额以<b>客户端上送</b>的 baseAmount 计算，与目录价无关。</li>
 * </ul>
 *
 * <p><b>契约裁定（不新造协议）</b>：请求体、响应体、端点路径与鉴权/开关全部保持不变，
 * 只把公开 {@code /redeem} 的副作用改为「预览（零消耗）」——它现在返回与购买时
 * 一致的折扣预览；真正唯一的消耗发生在 {@code purchaseVip} 的事务内
 * （悲观锁 + 原子扣减 + 用量记录），因此：</p>
 * <ul>
 *   <li>有效码总能以服务端目录价完成购买；</li>
 *   <li>码按策略（remaining_uses / max_uses_per_user）最多被消耗一次；</li>
 *   <li>账本（promo_code_usages / used_count / remaining_uses）自此只统计真实资金事件。</li>
 * </ul>
 *
 * <p>注：「购买时复用已存在的用量记录」不可作为方案——{@code promo_code_usages}
 * 没有任何「是否已被某笔购买消费」的标记列，复用会让同一份折扣被无限次购买套用；
 * 而本次禁止新增迁移。故只能把消耗点收敛到购买。</p>
 *
 * <p>RED 证据（对修复前代码执行）：预览后购买抛「优惠码使用次数已达上限」、
 * 独立页两次兑换即耗尽码、预览本身写库扣次数。</p>
 */
class PromoCodeRedeemPurchaseLedgerTest {

    private static final long USER_ID = 100L;
    private static final String CODE = "SAVE1000";
    /** 服务端目录价：月卡 1800 分 */
    private static final int MONTHLY_CENTS = 1800;

    private PromoCodeRepository promoCodeRepository;
    private PromoCodeUsageRepository promoCodeUsageRepository;
    private VipBillRepository vipBillRepository;
    private WalletService walletService;
    private PromoCodeService promoCodeService;
    private BillingService billingService;

    /** 内存态优惠码（模拟 remaining_uses / used_count 的原子扣减语义） */
    private PromoCode promo;
    /** 内存态用量记录（模拟 promo_code_usages 表） */
    private final List<PromoCodeUsage> usages = new ArrayList<>();

    @BeforeEach
    void setUp() {
        promoCodeRepository = mock(PromoCodeRepository.class);
        promoCodeUsageRepository = mock(PromoCodeUsageRepository.class);
        vipBillRepository = mock(VipBillRepository.class);
        walletService = mock(WalletService.class);
        PaymentCallbackLogRepository callbackLogRepository = mock(PaymentCallbackLogRepository.class);

        promo = activeCode(CODE, "AMOUNT", 1000, 1);

        when(promoCodeRepository.findByCode(anyString())).thenAnswer(inv -> Optional.of(promo)
                .filter(p -> p.getCode().equals(inv.<String>getArgument(0))));
        when(promoCodeRepository.findByCodeForUpdate(anyString())).thenAnswer(inv -> Optional.of(promo)
                .filter(p -> p.getCode().equals(inv.<String>getArgument(0))));
        // UPDATE ... WHERE remaining_uses > 0：影响行数即原子扣减结果
        when(promoCodeRepository.decrementRemaining(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            if (!code.equals(promo.getCode())) {
                return 0;
            }
            if (promo.getRemainingUses() <= 0) {
                return 0;
            }
            promo.setRemainingUses(promo.getRemainingUses() - 1);
            return 1;
        });
        when(promoCodeRepository.incrementUsedCount(any())).thenAnswer(inv -> {
            promo.setUsedCount(promo.getUsedCount() + 1);
            return 1;
        });
        when(promoCodeUsageRepository.countByPromoCodeIdAndUserId(any(), any())).thenAnswer(inv ->
                (long) usages.size());
        when(promoCodeUsageRepository.save(any(PromoCodeUsage.class))).thenAnswer(inv -> {
            PromoCodeUsage usage = inv.getArgument(0);
            usages.add(usage);
            return usage;
        });

        when(vipBillRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());
        when(vipBillRepository.save(any(VipBill.class))).thenAnswer(inv -> {
            VipBill bill = inv.getArgument(0);
            bill.setId(9001L);
            return bill;
        });
        when(walletService.deduct(anyLong(), anyLong(), anyString(), anyString(), anyString()))
                .thenReturn(5000L);

        promoCodeService = new PromoCodeService(promoCodeRepository, promoCodeUsageRepository);
        billingService = newBillingService();

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                String.valueOf(USER_ID), "n/a", List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /**
     * 被测 BillingService 构造点。
     *
     * <p>购买链路的定价必须来自服务端目录（与续费/微信下单同一实例）。</p>
     */
    private BillingService newBillingService() {
        BillingService service = new BillingService(vipBillRepository,
                mock(PaymentCallbackLogRepository.class), new VipPlanCatalog());
        ReflectionTestUtils.setField(service, "walletService", walletService);
        ReflectionTestUtils.setField(service, "promoCodeService", promoCodeService);
        return service;
    }

    /** 公开端点 /vip/promo-codes/redeem 的真实调用（控制器 → 服务）。 */
    private PromoCodeService.RedeemResultView callPublicRedeem(String code, int clientBaseAmountCents) {
        return new PromoCodeController(promoCodeService)
                .redeem(new ValidatePromoCodeRequest(code, clientBaseAmountCents));
    }

    private PromoCode activeCode(String code, String discountType, int discountValue, int maxUses) {
        PromoCode entity = new PromoCode();
        entity.setId(1L);
        entity.setCode(code);
        entity.setDiscountType(discountType);
        entity.setDiscountValue(discountValue);
        entity.setMaxUses(maxUses);
        entity.setMaxUsesPerUser(1);
        entity.setRemainingUses(maxUses);
        entity.setUsedCount(0);
        entity.setStatus("ACTIVE");
        entity.setValidFrom(LocalDateTime.now().minusDays(1));
        entity.setValidTo(LocalDateTime.now().plusDays(30));
        return entity;
    }

    private long deductedCents() {
        ArgumentCaptor<Long> captor = ArgumentCaptor.forClass(Long.class);
        verify(walletService, times(1)).deduct(eq(USER_ID), captor.capture(), anyString(),
                eq(WalletTransactionLog.RELATED_TYPE_VIP_PURCHASE), anyString());
        return captor.getValue();
    }

    private VipBill savedBill() {
        ArgumentCaptor<VipBill> captor = ArgumentCaptor.forClass(VipBill.class);
        verify(vipBillRepository).save(captor.capture());
        return captor.getValue();
    }

    /* ==================== 1. 端到端：预览不消耗，购买才消耗 ==================== */

    @Test
    @DisplayName("端到端单次可用码：独立页兑换预览后仍能以服务端目录价完成购买，且只消耗一次")
    void oneUseCodeSurvivesPublicRedeemAndIsConsumedExactlyOnceByPurchase() {
        PromoCodeService.RedeemResultView preview = callPublicRedeem(CODE, MONTHLY_CENTS);

        assertEquals(1000, preview.discountAmount(), "预览应给出目录价上的 1000 分折扣");
        assertEquals(800, preview.finalAmount());
        // 预览零副作用：次数、统计、账本均不动
        assertEquals(1, promo.getRemainingUses(), "公开 /redeem 预览不得扣减 remaining_uses");
        assertEquals(0, promo.getUsedCount(), "公开 /redeem 预览不得累加 used_count");
        assertTrue(usages.isEmpty(), "公开 /redeem 预览不得写 promo_code_usages");

        BillingService.PurchaseResultView purchased = billingService.purchaseVip(USER_ID, "monthly", CODE);

        assertEquals(MONTHLY_CENTS, purchased.baseAmount(), "原价必须取服务端目录价");
        assertEquals(1000, purchased.discountAmount());
        assertEquals(800, purchased.finalAmount());
        assertEquals(800, deductedCents(), "钱包按目录价-折扣扣款");
        assertEquals(0, promo.getRemainingUses(), "购买才是消耗点：remaining_uses 归零");
        assertEquals(1, promo.getUsedCount());
        assertEquals(1, usages.size(), "账本只记录一次消耗");
        assertEquals(MONTHLY_CENTS, savedBill().getOriginalAmount());
        assertEquals(800, savedBill().getAmount());
    }

    @Test
    @DisplayName("归一化：小写码在预览与购买两侧同指一份码（不产生第二次消耗）")
    void lowercaseCodePreviewThenPurchaseConsumesOnce() {
        callPublicRedeem("save1000", MONTHLY_CENTS);

        billingService.purchaseVip(USER_ID, "monthly", "save1000");

        assertEquals(1, usages.size(), "同一码一次购买只写一条用量记录");
        assertEquals(0, promo.getRemainingUses());
    }

    /* ==================== 2. 双重兑换防护 ==================== */

    @Test
    @DisplayName("独立页连点两次兑换：预览语义下不消耗任何次数（修复前第一次点击即耗尽单次码）")
    void doublePublicRedeemDoesNotExhaustCode() {
        callPublicRedeem(CODE, MONTHLY_CENTS);
        callPublicRedeem(CODE, MONTHLY_CENTS);

        assertEquals(1, promo.getRemainingUses(), "两次兑换预览仍应有 1 次可用");
        assertTrue(usages.isEmpty());
        // 码仍然可用：后续购买照旧成交
        billingService.purchaseVip(USER_ID, "monthly", CODE);
        assertEquals(800, deductedCents());
    }

    @Test
    @DisplayName("购买重复使用同一单次码：第二次购买按策略拒绝，不再扣钱包、不再消耗")
    void secondPurchaseWithSameCodeIsRejectedWithoutSecondCharge() {
        billingService.purchaseVip(USER_ID, "monthly", CODE);

        assertThrows(IllegalArgumentException.class, () -> billingService.purchaseVip(USER_ID, "monthly", CODE));

        verify(walletService, times(1)).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
        assertEquals(0, promo.getRemainingUses(), "消耗只发生一次");
        assertEquals(1, usages.size(), "账本不得出现第二条用量");
        verify(vipBillRepository, times(1)).save(any(VipBill.class));
    }

    @Test
    @DisplayName("PERCENT 码：客户端用巨额 baseAmount 预览出的折扣，购买时按服务端目录价重新计算（不得放大）")
    void percentPreviewCannotBeInflatedByClientAmount() {
        promo = activeCode("HALF", "PERCENT", 50, 1);

        PromoCodeService.RedeemResultView inflatedPreview = callPublicRedeem("HALF", 10_000_000);
        assertEquals(5_000_000, inflatedPreview.discountAmount(), "预览只是报价，不构成资金事件");

        BillingService.PurchaseResultView purchased = billingService.purchaseVip(USER_ID, "monthly", "HALF");

        assertEquals(900, purchased.discountAmount(), "折扣以目录价 1800 的 50% 计");
        assertEquals(900, deductedCents(), "扣款=目录价-目录口径折扣，客户端上送金额不参与定价");
    }

    /* ==================== 3. 既有资金语义不回退 ==================== */

    @Test
    @DisplayName("码已用完（remaining_uses=0）：购买 fail-closed，不扣钱包、不写账单")
    void exhaustedCodePurchaseIsRejectedWithoutWalletTouch() {
        promo.setRemainingUses(0);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> billingService.purchaseVip(USER_ID, "monthly", CODE));

        assertEquals("优惠码使用次数已达上限", ex.getMessage());
        verify(walletService, never()).deduct(anyLong(), anyLong(), anyString(), anyString(), anyString());
        verify(vipBillRepository, never()).save(any(VipBill.class));
    }

    @Test
    @DisplayName("不带码：按目录原价扣款，账本零用量记录")
    void purchaseWithoutCodeChargesFullCatalogPrice() {
        billingService.purchaseVip(USER_ID, "monthly", null);

        assertEquals(MONTHLY_CENTS, deductedCents());
        assertTrue(usages.isEmpty());
    }
}
