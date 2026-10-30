package com.campuslove.api.vip;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.PromoCode;
import com.campuslove.api.entity.PromoCodeUsage;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.PromoCodeUsageRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Task 1：{@code max_uses_per_user > 1} 的优惠码必须真的可用（聚合行累加，不插入第二行）。
 *
 * <p><b>缺陷基线</b>：{@code promo_code_usages} 建表时（Flyway V2026.07.25.0003）声明了
 * {@code UNIQUE KEY uk_promo_code_usages (promo_code_id, user_id)}——每个 (码, 用户)
 * 结构上只能有一行；而 {@link PromoCodeService#redeem} 旧实现每次兑换都 INSERT 一行，
 * 单用户上限校验又用 {@code COUNT(*)} 数行（永远 ≤ 1）。于是第二次兑换先通过校验、
 * 再撞唯一键抛 {@code DataIntegrityViolationException}，被
 * {@code catch (DataAccessException)} 转成 HTTP 500「优惠码兑换失败，请稍后重试」：
 * 对外宣传的多用途码从来兑换不了。</p>
 *
 * <p><b>修复后口径</b>：同一 (码, 用户) 复用一条聚合行——首次使用插入
 * （{@code use_count = 1}、{@code used_at =} 首次使用时间），后续使用在既有行上
 * {@code use_count += 1} 且 {@code discount_amount} 累加；上限校验读
 * {@code use_count} 而非行数。{@code uk_promo_code_usages} 因此不再被触碰，
 * 第二次兑换走 UPDATE 而非 INSERT。</p>
 *
 * <p>测试策略：Mock Repository + 内存态「表」（按 id 做 upsert，并在 save 时记录
 * 本次是插入还是更新），以便同时断言「save 收到的是带既有 id 的同一行」与
 * 「表里行数没有增加」——这两点正是本缺陷的正反面。金额与次数全部钉死具体数字。</p>
 */
@DisplayName("Task 1 优惠码多用途聚合行用例")
class PromoCodeMultiUseRedemptionTest {

    private static final long USER_ID = 100L;
    private static final long PROMO_CODE_ID = 1L;
    private static final String CODE = "SAVE1000";
    /** 目录原价（分） */
    private static final int BASE_CENTS = 1800;
    /** AMOUNT 面额 1000 分 → 每次兑换折扣恒为 1000 分 */
    private static final int DISCOUNT_PER_USE_CENTS = 1000;
    /** 既有聚合行主键（模拟 uk_promo_code_usages 已存在的那一行） */
    private static final long EXISTING_ROW_ID = 7L;
    /** 初始剩余次数（与 remaining_uses 断言对齐） */
    private static final int REMAINING_AT_START = 10;

    private PromoCodeRepository promoCodeRepository;
    private PromoCodeUsageRepository promoCodeUsageRepository;
    private PromoCodeService promoCodeService;

    /** 优惠码（remaining_uses / used_count 用内存态模拟原子扣减语义） */
    private PromoCode promo;
    /** 内存态 promo_code_usages 表 */
    private final List<PromoCodeUsage> table = new ArrayList<>();
    /** 首次使用时间（断言后续使用不回写） */
    private LocalDateTime firstUsedAt;
    /** 最近一次 save 是插入（id 为空）还是更新（id 非空） */
    private boolean lastSaveWasInsert;

    @BeforeEach
    void setUp() {
        promoCodeRepository = mock(PromoCodeRepository.class);
        promoCodeUsageRepository = mock(PromoCodeUsageRepository.class);
        promoCodeService = new PromoCodeService(promoCodeRepository, promoCodeUsageRepository);

        promo = activeCode();
        promo.setMaxUsesPerUser(2);

        when(promoCodeRepository.findByCodeForUpdate(anyString())).thenAnswer(inv ->
                Optional.ofNullable(promo).filter(p -> p.getCode().equals(inv.<String>getArgument(0))));
        // UPDATE ... SET remaining_uses = remaining_uses - 1 WHERE remaining_uses > 0
        when(promoCodeRepository.decrementRemaining(anyString())).thenAnswer(inv -> {
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
        // 唯一索引语义：每个 (码, 用户) 至多一行
        when(promoCodeUsageRepository.findByPromoCodeIdAndUserId(any(), any())).thenAnswer(inv -> {
            Long promoCodeId = inv.getArgument(0);
            Long userId = inv.getArgument(1);
            return table.stream()
                    .filter(u -> u.getPromoCodeId().equals(promoCodeId) && u.getUserId().equals(userId))
                    .findFirst();
        });
        // upsert：id 为空 = INSERT 新行；id 非空 = UPDATE 既有行（绝不新增行）
        when(promoCodeUsageRepository.save(any(PromoCodeUsage.class))).thenAnswer(inv -> {
            PromoCodeUsage usage = inv.getArgument(0);
            lastSaveWasInsert = usage.getId() == null;
            if (lastSaveWasInsert) {
                usage.setId((long) table.size() + 1);
                table.add(usage);
            } else if (!table.contains(usage)) {
                table.add(usage);
            }
            return usage;
        });

        firstUsedAt = LocalDateTime.of(2026, 10, 20, 12, 0, 0);
    }

    private PromoCode activeCode() {
        PromoCode entity = new PromoCode();
        entity.setId(PROMO_CODE_ID);
        entity.setCode(CODE);
        entity.setDiscountType("AMOUNT");
        entity.setDiscountValue(DISCOUNT_PER_USE_CENTS);
        entity.setMaxUses(REMAINING_AT_START);
        entity.setMaxUsesPerUser(1);
        entity.setRemainingUses(REMAINING_AT_START);
        entity.setUsedCount(0);
        entity.setStatus("ACTIVE");
        entity.setValidFrom(LocalDateTime.now().minusDays(1));
        entity.setValidTo(LocalDateTime.now().plusDays(30));
        return entity;
    }

    /** 预置一条该用户的聚合行（useCount 次使用、累计 discount 分）。 */
    private PromoCodeUsage seedExistingRow(int useCount, int accumulatedDiscountCents) {
        PromoCodeUsage existing = new PromoCodeUsage();
        existing.setId(EXISTING_ROW_ID);
        existing.setPromoCodeId(PROMO_CODE_ID);
        existing.setCode(CODE);
        existing.setUserId(USER_ID);
        existing.setDiscountAmount(accumulatedDiscountCents);
        existing.setUseCount(useCount);
        existing.setUsedAt(firstUsedAt);
        existing.setVersion(0L);
        table.add(existing);
        return existing;
    }

    /* ==================== a. 第二次兑换：更新聚合行，不插入第二行 ==================== */

    @Test
    @DisplayName("maxUsesPerUser=2 且已用 1 次：第二次兑换成功，更新既有行（useCount 1→2、折扣累加），不新增行")
    void secondRedemptionOfTwoUseCodeUpdatesAggregateRowInsteadOfInserting() {
        PromoCodeUsage existing = seedExistingRow(1, DISCOUNT_PER_USE_CENTS);

        PromoCodeService.RedeemResultView result =
                promoCodeService.redeem(CODE, USER_ID, BASE_CENTS);

        // 兑换必须成功（旧实现在此处抛 RuntimeException「请稍后重试」→ HTTP 500），金额口径不变
        assertNotNull(result);
        assertEquals(DISCOUNT_PER_USE_CENTS, result.discountAmount().intValue(), "本次兑换折扣");
        assertEquals(800, result.finalAmount().intValue(), "折后金额 = 1800 - 1000");

        // 落库必须是「UPDATE 既有行」：save 收到的实体带着库里那一行的主键
        ArgumentCaptor<PromoCodeUsage> captor = ArgumentCaptor.forClass(PromoCodeUsage.class);
        verify(promoCodeUsageRepository, times(1)).save(captor.capture());
        PromoCodeUsage saved = captor.getValue();
        assertFalse(lastSaveWasInsert, "第二次兑换必须是更新既有聚合行，而非插入新行");
        assertNotNull(saved.getId(), "更新路径的实体必须带既有行主键（否则 Hibernate 会 INSERT 并撞唯一键）");
        assertEquals(EXISTING_ROW_ID, saved.getId().longValue(), "必须命中 uk_promo_code_usages 的那一行");
        assertSame(existing, saved, "必须在既有聚合行上累加，而不是另造实体");

        // 次数累加 + 折扣累加（聚合行的 discount_amount 是累计口径）
        assertEquals(2, saved.getUseCount().intValue(), "use_count 必须由 1 累加到 2");
        assertEquals(2 * DISCOUNT_PER_USE_CENTS, saved.getDiscountAmount().intValue(),
                "discount_amount 是该用户对该码的累计折扣：1000 + 1000");

        // 「used_at = 首次使用时间」语义不回写
        assertEquals(firstUsedAt, saved.getUsedAt(), "后续使用不得改写首次使用时间");

        // 表里没有第二行（旧实现正是这里撞唯一键 → 500）
        assertEquals(1, table.size(), "promo_code_usages 不得出现同一 (码, 用户) 的第二行");

        // 真实消耗一次
        assertEquals(REMAINING_AT_START - 1, promo.getRemainingUses().intValue(), "remaining_uses 原子扣减 1");
        assertEquals(1, promo.getUsedCount().intValue(), "used_count 累加 1");
    }

    @Test
    @DisplayName("首次兑换：无既有行时插入新行，useCount=1 且 discount_amount 只记本次折扣（不是累加初值）")
    void firstRedemptionInsertsRowWithUseCountOne() {
        assertTrue(table.isEmpty(), "用例前提：该用户尚未使用过");

        promoCodeService.redeem(CODE, USER_ID, BASE_CENTS);

        ArgumentCaptor<PromoCodeUsage> captor = ArgumentCaptor.forClass(PromoCodeUsage.class);
        verify(promoCodeUsageRepository, times(1)).save(captor.capture());
        PromoCodeUsage inserted = captor.getValue();

        assertTrue(lastSaveWasInsert, "首次兑换落库的是 id 为空的新行（INSERT 路径）");
        assertEquals(1, inserted.getUseCount().intValue(), "首次使用 use_count = 1");
        assertEquals(DISCOUNT_PER_USE_CENTS, inserted.getDiscountAmount().intValue(), "首次折扣不叠加");
        assertNotNull(inserted.getUsedAt(), "首次使用时间必须写入（列 updatable=false）");
        assertEquals(1, table.size(), "首次兑换新增一行");
    }

    /* ==================== b. 已用满：useCount 达上限即拒绝 ==================== */

    @Test
    @DisplayName("maxUsesPerUser=2 且 useCount 已为 2：兑换被拒（同一上限文案），且零消耗、不改行")
    void redemptionBeyondPerUserCapIsRejectedWithCapMessage() {
        seedExistingRow(2, 2 * DISCOUNT_PER_USE_CENTS);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> promoCodeService.redeem(CODE, USER_ID, BASE_CENTS));

        assertEquals("您已达到该优惠码的使用次数上限（2 次）", ex.getMessage(),
                "上限校验改为读 use_count 后必须仍给出原 400 文案");

        // 快速失败发生在任何消耗之前：不扣 remaining_uses、不累加 used_count、不落库
        verify(promoCodeRepository, never()).decrementRemaining(anyString());
        verify(promoCodeUsageRepository, never()).save(any(PromoCodeUsage.class));
        assertEquals(REMAINING_AT_START, promo.getRemainingUses().intValue(), "remaining_uses 一点没动");
        assertEquals(0, promo.getUsedCount().intValue(), "used_count 一点没动");
        assertEquals(1, table.size(), "不得新增任何用量行");
        assertEquals(2, table.get(0).getUseCount().intValue(), "既有行 use_count 仍为 2");
        assertEquals(2 * DISCOUNT_PER_USE_CENTS, table.get(0).getDiscountAmount().intValue(),
                "既有行折扣不得被继续累加");
    }

    /* ==================== c. 单次码回归护栏：聚合化不得放宽单次限制 ==================== */

    @Test
    @DisplayName("maxUsesPerUser=1 且已有一行（useCount=1）：兑换被拒——聚合化不得让单次码变成多次可用")
    void singleUseCodeStillRejectsSecondRedemption() {
        promo.setMaxUsesPerUser(1);
        seedExistingRow(1, DISCOUNT_PER_USE_CENTS);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> promoCodeService.redeem(CODE, USER_ID, BASE_CENTS));

        assertEquals("您已达到该优惠码的使用次数上限（1 次）", ex.getMessage());
        verify(promoCodeRepository, never()).decrementRemaining(anyString());
        verify(promoCodeUsageRepository, never()).save(any(PromoCodeUsage.class));
        assertEquals(REMAINING_AT_START, promo.getRemainingUses().intValue(), "remaining_uses 一点没动");
        assertEquals(1, table.get(0).getUseCount().intValue(), "既有行 use_count 仍为 1");
        assertEquals(DISCOUNT_PER_USE_CENTS, table.get(0).getDiscountAmount().intValue(), "既有行折扣仍是首次值");
    }

    @Test
    @DisplayName("useCount 为 null 的历史行（迁移前写入）按 1 次计：单次码仍拒绝第二次，多用途码可继续用")
    void nullUseCountLegacyRowIsTreatedAsOneUse() {
        PromoCodeUsage legacy = seedExistingRow(1, DISCOUNT_PER_USE_CENTS);
        legacy.setUseCount(null);

        // maxUsesPerUser=1：null 兜底为 1 → 已达上限
        promo.setMaxUsesPerUser(1);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> promoCodeService.redeem(CODE, USER_ID, BASE_CENTS));
        assertEquals("您已达到该优惠码的使用次数上限（1 次）", ex.getMessage());
        verify(promoCodeUsageRepository, never()).save(any(PromoCodeUsage.class));

        // maxUsesPerUser=2：null 兜底为 1 → 仍可再用一次，且累加后 use_count=2
        promo.setMaxUsesPerUser(2);
        promoCodeService.redeem(CODE, USER_ID, BASE_CENTS);

        assertEquals(2, legacy.getUseCount().intValue(), "null use_count 视为 1，累加后为 2");
        assertEquals(2 * DISCOUNT_PER_USE_CENTS, legacy.getDiscountAmount().intValue(), "折扣累加 1000 + 1000");
    }
}
