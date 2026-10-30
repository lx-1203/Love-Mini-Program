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
     * 按优惠码 ID + 用户 ID 查询使用记录（聚合行）。
     *
     * <p>唯一索引 {@code uk_promo_code_usages (promo_code_id, user_id)} 保证至多一行。
     * Task 12.4（REAUDIT-REPORT-100+ 编号 41）单用户上限校验与兑换时的
     * 「读-改-写」聚合都走本方法：已用次数取 {@code PromoCodeUsage.getUseCount()}，
     * 而非行数（旧实现按 {@code COUNT(*)} 统计行数，在 max_uses_per_user &gt; 1 时
     * 第二次兑换会插入第二行并撞唯一键，返回 HTTP 500）。</p>
     *
     * @param promoCodeId 优惠码 ID
     * @param userId      用户 ID
     * @return 使用记录（可选）
     */
    Optional<PromoCodeUsage> findByPromoCodeIdAndUserId(Long promoCodeId, Long userId);

    /**
     * 按用户 ID 查询使用记录列表，按使用时间倒序。
     *
     * @param userId 用户 ID
     * @return 使用记录列表
     */
    List<PromoCodeUsage> findByUserIdOrderByUsedAtDesc(Long userId);
}
