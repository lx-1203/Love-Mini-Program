package com.campuslove.api.vip;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.PromoCode;
import com.campuslove.api.entity.PromoCodeUsage;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.PromoCodeUsageRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * VIP 优惠码服务。
 * <p>提供优惠码验证、兑换、查询等业务逻辑。
 * 支持满减金额（AMOUNT）与百分比折扣（PERCENT）两种类型。</p>
 *
 * <p>事务处理：兑换操作使用 @Transactional 保证原子性，
 * 防止并发兑换导致超用。通过唯一索引兜底防重。</p>
 *
 * <p>错误处理：所有异常场景抛出 IllegalArgumentException，
 * 由 GlobalExceptionHandler 统一转换为 400 响应。</p>
 */
@Profile("real")
@Service
public class PromoCodeService {

    private static final Logger log = LoggerFactory.getLogger(PromoCodeService.class);

    /** 百分比折扣最大值（100%） */
    private static final int MAX_PERCENT = 100;

    private final PromoCodeRepository promoCodeRepository;
    private final PromoCodeUsageRepository promoCodeUsageRepository;

    public PromoCodeService(PromoCodeRepository promoCodeRepository,
                            PromoCodeUsageRepository promoCodeUsageRepository) {
        this.promoCodeRepository = promoCodeRepository;
        this.promoCodeUsageRepository = promoCodeUsageRepository;
    }

    /**
     * 验证优惠码（不消耗使用次数）。
     * <p>用于前端在用户输入优惠码后实时校验有效性，返回折扣预览。</p>
     *
     * @param code        优惠码字符串
     * @param userId      当前用户 ID（用于校验是否已使用过）
     * @param baseAmount  计算折扣的基础金额（分）
     * @return 验证结果视图
     */
    @Transactional(readOnly = true)
    public ValidateResultView validate(String code, Long userId, Integer baseAmount) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_CODE_REQUIRED);
        }
        if (baseAmount == null || baseAmount < 0) {
            throw new IllegalArgumentException(ErrorMessages.BASE_AMOUNT_NOT_NEGATIVE);
        }

        String normalizedCode = code.trim().toUpperCase();
        PromoCode promo = promoCodeRepository.findByCode(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.PROMO_CODE_NOT_FOUND));

        // 校验状态、有效期、使用次数
        validatePromoCode(promo, userId);

        // 计算折扣金额
        int discountAmount = calculateDiscount(promo, baseAmount);
        return new ValidateResultView(
                promo.getId(),
                promo.getCode(),
                promo.getDiscountType(),
                promo.getDiscountValue(),
                discountAmount,
                Math.max(0, baseAmount - discountAmount),
                true
        );
    }

    /**
     * 兑换优惠码（消耗使用次数）。
     *
     * <p>Task 12.4（REAUDIT-REPORT-100+ 编号 41）：并发安全改造。</p>
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>悲观锁查询优惠码：SELECT ... FOR UPDATE，锁住优惠码行防止并发读取到过期状态</li>
     *   <li>校验优惠码状态、有效期、剩余次数、单用户使用次数</li>
     *   <li>计算折扣金额</li>
     *   <li>原子扣减：UPDATE ... WHERE remaining_uses > 0，
     *       影响行数 0 则失败（优惠码已用完）</li>
     *   <li>累加 used_count（统计展示用）</li>
     *   <li>保存使用记录（应用层 countByPromoCodeIdAndUserId 校验防重放）</li>
     * </ol>
     *
     * <p>并发安全：</p>
     * <ul>
     *   <li>悲观锁保证同一优惠码同时只有一个事务在处理</li>
     *   <li>原子扣减作为兜底，即使悲观锁失效也能保证不超发</li>
     *   <li>应用层 countByPromoCodeIdAndUserId 校验防止单用户超过 max_uses_per_user</li>
     * </ul>
     *
     * @param code        优惠码字符串
     * @param userId      当前用户 ID
     * @param baseAmount  计算折扣的基础金额（分）
     * @return 兑换结果视图
     * @throws IllegalArgumentException 优惠码不存在/已禁用/已过期/已用完/已使用过时抛出
     */
    @Transactional
    public RedeemResultView redeem(String code, Long userId, Integer baseAmount) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_CODE_REQUIRED);
        }
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        if (baseAmount == null || baseAmount < 0) {
            throw new IllegalArgumentException(ErrorMessages.BASE_AMOUNT_NOT_NEGATIVE);
        }

        String normalizedCode = code.trim().toUpperCase();

        // 1. 悲观锁查询优惠码（SELECT ... FOR UPDATE），锁住优惠码行防止并发读取到过期状态
        PromoCode promo = promoCodeRepository.findByCodeForUpdate(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.PROMO_CODE_NOT_FOUND));

        // 2. 校验状态、有效期、剩余次数、单用户使用次数
        validatePromoCode(promo, userId);

        // 3. 计算折扣金额
        int discountAmount = calculateDiscount(promo, baseAmount);

        try {
            // 4. 原子扣减：UPDATE ... WHERE remaining_uses > 0
            int affected = promoCodeRepository.decrementRemaining(normalizedCode);
            if (affected == 0) {
                // 影响行数 0：优惠码已被并发用完
                log.warn("优惠码原子扣减失败，可能被并发用完：code={}, userId={}",
                        normalizedCode, userId);
                throw new IllegalArgumentException(ErrorMessages.PROMO_CODE_EXHAUSTED);
            }

            // 5. 累加 used_count（统计展示用，与 decrementRemaining 在同一事务内）
            promoCodeRepository.incrementUsedCount(promo.getId());

            // 6. 保存使用记录（应用层 countByPromoCodeIdAndUserId 校验防重放）
            PromoCodeUsage usage = new PromoCodeUsage();
            usage.setPromoCodeId(promo.getId());
            usage.setCode(promo.getCode());
            usage.setUserId(userId);
            usage.setDiscountAmount(discountAmount);
            usage.setUsedAt(LocalDateTime.now(TimeZones.BUSINESS));
            promoCodeUsageRepository.save(usage);

            log.info("优惠码兑换成功：code={}, userId={}, discount={}, remainingUses={}",
                    normalizedCode, userId, discountAmount,
                    promo.getRemainingUses() - 1);
            return new RedeemResultView(
                    promo.getId(),
                    promo.getCode(),
                    discountAmount,
                    Math.max(0, baseAmount - discountAmount)
            );
        } catch (DataAccessException e) {
            // 数据库访问异常（save 失败、约束冲突、并发兑换导致的乐观锁失败等）
            log.error("优惠码兑换失败：code={}, userId={}", normalizedCode, userId, e);
            throw new RuntimeException(ErrorMessages.PROMO_REDEEM_FAILED_RETRY, e);
        }
    }

    /**
     * 查询用户的使用记录。
     *
     * @param userId 用户 ID
     * @return 使用记录列表
     */
    @Transactional(readOnly = true)
    public List<PromoCodeUsage> listMyUsages(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_CN_REQUIRED);
        }
        return promoCodeUsageRepository.findByUserIdOrderByUsedAtDesc(userId);
    }

    /**
     * 校验优惠码状态、有效期、剩余次数、单用户使用次数。
     *
     * <p>Task 12.4：原校验仅基于 used_count vs max_uses，存在并发竞态。
     * 现引入 remaining_uses（原子扣减用）和 max_uses_per_user（单用户上限）双重校验：
     * remaining_uses > 0 由原子扣减 SQL 兜底，此处仅做快速失败提示；
     * 单用户使用次数通过 countByPromoCodeIdAndUserId 查询，超过 maxUsesPerUser 则拒绝。</p>
     *
     * @param promo  优惠码实体
     * @param userId 当前用户 ID
     */
    private void validatePromoCode(PromoCode promo, Long userId) {
        if (!"ACTIVE".equals(promo.getStatus())) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_CODE_DISABLED);
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        if (promo.getValidFrom() != null && promo.getValidFrom().isAfter(now)) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_CODE_NOT_ACTIVE);
        }
        if (promo.getValidTo() != null && promo.getValidTo().isBefore(now)) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_CODE_EXPIRED);
        }

        // 检查剩余次数（remaining_uses = 0 表示已用完；max_uses = 0 时不限次数，
        // remaining_uses 在 Flyway 迁移时被设为 2147483647，不会触发此分支）
        if (promo.getRemainingUses() != null && promo.getRemainingUses() <= 0) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_CODE_USES_EXCEEDED);
        }

        // 检查单用户使用次数限制（maxUsesPerUser 默认 1）
        if (userId != null && promo.getMaxUsesPerUser() != null && promo.getMaxUsesPerUser() > 0) {
            long userUsedCount = promoCodeUsageRepository
                    .countByPromoCodeIdAndUserId(promo.getId(), userId);
            if (userUsedCount >= promo.getMaxUsesPerUser()) {
                throw new IllegalArgumentException(
                        "您已达到该优惠码的使用次数上限（" + promo.getMaxUsesPerUser() + " 次）");
            }
        }
    }

    /**
     * 计算折扣金额。
     * <p>AMOUNT 类型：直接返回 discountValue（不超过基础金额）。
     * PERCENT 类型：discountValue * baseAmount / 100。</p>
     *
     * @param promo      优惠码实体
     * @param baseAmount 基础金额（分）
     * @return 折扣金额（分）
     */
    private int calculateDiscount(PromoCode promo, int baseAmount) {
        if (promo.getDiscountValue() == null || promo.getDiscountValue() <= 0) {
            return 0;
        }

        int discount;
        if ("PERCENT".equals(promo.getDiscountType())) {
            // 百分比折扣
            int percent = Math.min(promo.getDiscountValue(), MAX_PERCENT);
            discount = baseAmount * percent / 100;
        } else {
            // 满减金额
            discount = promo.getDiscountValue();
        }

        // 折扣不能超过基础金额
        return Math.min(discount, baseAmount);
    }

    /**
     * 验证结果视图。
     *
     * @param promoCodeId    优惠码 ID
     * @param code           优惠码字符串
     * @param discountType   折扣类型 AMOUNT/PERCENT
     * @param discountValue  折扣值
     * @param discountAmount 折扣金额（分）
     * @param finalAmount    折后金额（分）
     * @param valid          是否有效
     */
    public record ValidateResultView(
            Long promoCodeId,
            String code,
            String discountType,
            Integer discountValue,
            Integer discountAmount,
            Integer finalAmount,
            Boolean valid
    ) {
    }

    /**
     * 兑换结果视图。
     *
     * @param promoCodeId    优惠码 ID
     * @param code           优惠码字符串
     * @param discountAmount 折扣金额（分）
     * @param finalAmount    折后金额（分）
     */
    public record RedeemResultView(
            Long promoCodeId,
            String code,
            Integer discountAmount,
            Integer finalAmount
    ) {
    }
}
