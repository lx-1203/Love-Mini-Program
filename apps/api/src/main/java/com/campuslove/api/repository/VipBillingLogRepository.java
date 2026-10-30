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

    /**
     * 判断某订单号是否已有指定状态的流水（续费幂等短路用）。
     *
     * <p>S1-2：续费扣款、VIP 顺延与流水写入在同一事务内原子提交，因此存在
     * SUCCESS 流水等价于「该周期已完整续费过」，重放时既不该再扣款也不该再发权益。</p>
     *
     * @param orderNo 续费订单号（确定性幂等键）
     * @param status  流水状态
     * @return 存在返回 true
     */
    boolean existsByOrderNoAndStatus(String orderNo, String status);
}
