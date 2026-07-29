package com.campuslove.api.repository;

import com.campuslove.api.entity.VipBillingLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * VIP 续费交易流水 Repository。
 *
 * <p>Task 12.2：AutoRenewService 每次续费后通过本 Repository 写入流水，
 * 用于对账、审计与故障排查。</p>
 */
public interface VipBillingLogRepository extends JpaRepository<VipBillingLog, Long> {

    /**
     * 按用户 ID 查询续费流水，按时间倒序。
     *
     * @param userId 用户 ID
     * @return 续费流水列表
     */
    List<VipBillingLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}
