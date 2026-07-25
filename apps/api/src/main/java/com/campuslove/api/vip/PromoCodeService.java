package com.campuslove.api.vip;

import com.campuslove.api.entity.PromoCode;
import com.campuslove.api.entity.PromoCodeUsage;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.PromoCodeUsageRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
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
            throw new IllegalArgumentException("优惠码不能为空");
        }
        if (baseAmount == null || baseAmount < 0) {
            throw new IllegalArgumentException("基础金额不能为负数");
        }

        String normalizedCode = code.trim().toUpperCase();
        PromoCode promo = promoCodeRepository.findByCode(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("优惠码不存在"));

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
     * <p>校验优惠码有效性后，记录使用记录并更新使用次数。</p>
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
            throw new IllegalArgumentException("优惠码不能为空");
        }
        if (userId == null) {
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        if (baseAmount == null || baseAmount < 0) {
            throw new IllegalArgumentException("基础金额不能为负数");
        }

        String normalizedCode = code.trim().toUpperCase();
        PromoCode promo = promoCodeRepository.findByCode(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("优惠码不存在"));

        // 校验状态、有效期、使用次数
        validatePromoCode(promo, userId);

        int discountAmount = calculateDiscount(promo, baseAmount);

        try {
            // 记录使用记录
            PromoCodeUsage usage = new PromoCodeUsage();
            usage.setPromoCodeId(promo.getId());
            usage.setCode(promo.getCode());
            usage.setUserId(userId);
            usage.setDiscountAmount(discountAmount);
            usage.setUsedAt(LocalDateTime.now());
            promoCodeUsageRepository.save(usage);

            // 更新使用次数
            promo.setUsedCount(promo.getUsedCount() + 1);
            promo.setUpdatedAt(LocalDateTime.now());
            promoCodeRepository.save(promo);

            log.info("优惠码兑换成功：code={}, userId={}, discount={}",
                    normalizedCode, userId, discountAmount);
            return new RedeemResultView(
                    promo.getId(),
                    promo.getCode(),
                    discountAmount,
                    Math.max(0, baseAmount - discountAmount)
            );
        } catch (Exception e) {
            log.error("优惠码兑换失败：code={}, userId={}", normalizedCode, userId, e);
            throw new RuntimeException("优惠码兑换失败，请稍后重试", e);
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
            throw new IllegalArgumentException("用户 ID 不能为空");
        }
        return promoCodeUsageRepository.findByUserIdOrderByUsedAtDesc(userId);
    }

    /**
     * 校验优惠码状态、有效期、使用次数、是否已使用。
     *
     * @param promo  优惠码实体
     * @param userId 当前用户 ID
     */
    private void validatePromoCode(PromoCode promo, Long userId) {
        if (!"ACTIVE".equals(promo.getStatus())) {
            throw new IllegalArgumentException("优惠码已被禁用");
        }

        LocalDateTime now = LocalDateTime.now();
        if (promo.getValidFrom() != null && promo.getValidFrom().isAfter(now)) {
            throw new IllegalArgumentException("优惠码尚未生效");
        }
        if (promo.getValidTo() != null && promo.getValidTo().isBefore(now)) {
            throw new IllegalArgumentException("优惠码已过期");
        }

        // 检查使用次数限制（maxUses = 0 表示不限）
        if (promo.getMaxUses() != null && promo.getMaxUses() > 0
                && promo.getUsedCount() >= promo.getMaxUses()) {
            throw new IllegalArgumentException("优惠码使用次数已达上限");
        }

        // 检查用户是否已使用过该优惠码
        if (userId != null) {
            Optional<PromoCodeUsage> existing = promoCodeUsageRepository
                    .findByPromoCodeIdAndUserId(promo.getId(), userId);
            if (existing.isPresent()) {
                throw new IllegalArgumentException("您已使用过该优惠码");
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
