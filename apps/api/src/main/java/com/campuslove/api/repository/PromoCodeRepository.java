package com.campuslove.api.repository;

import com.campuslove.api.entity.PromoCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * VIP 优惠码 Repository。
 * <p>提供优惠码的持久化与查询能力，支持按优惠码字符串查询。</p>
 */
public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {

    /**
     * 按优惠码字符串查询（大小写敏感，调用前需统一转为大写）。
     *
     * @param code 优惠码字符串
     * @return 优惠码实体（可选）
     */
    Optional<PromoCode> findByCode(String code);
}
