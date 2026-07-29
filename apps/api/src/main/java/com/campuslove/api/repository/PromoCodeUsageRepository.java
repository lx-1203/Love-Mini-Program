package com.campuslove.api.repository;

import com.campuslove.api.entity.PromoCodeUsage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * VIP 优惠码使用记录 Repository。
 * <p>提供使用记录的持久化与查询能力，
 * 支持按优惠码 ID 查询所有使用记录、按优惠码+用户查询是否已使用。</p>
 */
public interface PromoCodeUsageRepository extends JpaRepository<PromoCodeUsage, Long> {

    /**
     * 按优惠码 ID + 用户 ID 查询使用记录。
     * <p>用于判断用户是否已使用过该优惠码，避免重复使用。</p>
     *
     * @param promoCodeId 优惠码 ID
     * @param userId      用户 ID
     * @return 使用记录（可选）
     */
    Optional<PromoCodeUsage> findByPromoCodeIdAndUserId(Long promoCodeId, Long userId);

    /**
     * 按优惠码 ID + 用户 ID 统计使用次数。
     *
     * <p>Task 12.4（REAUDIT-REPORT-100+ 编号 41）：用于支持 max_uses_per_user 限制。
     * 兑换前查询当前用户对该优惠码的已使用次数，与 promo_codes.max_uses_per_user 比较，
     * 超过则拒绝兑换。当 max_uses_per_user = 1 时退化为"是否已使用过"判断。</p>
     *
     * @param promoCodeId 优惠码 ID
     * @param userId      用户 ID
     * @return 已使用次数
     */
    long countByPromoCodeIdAndUserId(Long promoCodeId, Long userId);

    /**
     * 按用户 ID 查询使用记录列表，按使用时间倒序。
     *
     * @param userId 用户 ID
     * @return 使用记录列表
     */
    List<PromoCodeUsage> findByUserIdOrderByUsedAtDesc(Long userId);
}
