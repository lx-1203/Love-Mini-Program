package com.campuslove.api.repository;

import com.campuslove.api.entity.VipBill;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * VIP 账单 Repository。
 * <p>提供账单记录的持久化与查询能力：
 * 支持按用户查询账单列表（全量与分页两种方式）。</p>
 */
public interface VipBillRepository extends JpaRepository<VipBill, Long> {

    /**
     * 按用户 ID 查询账单列表，按创建时间倒序（全量）。
     * <p>仅用于历史兼容场景，建议使用分页方法以避免大结果集 OOM。</p>
     *
     * @param userId 用户 ID
     * @return 账单列表
     */
    List<VipBill> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 按用户 ID 分页查询账单列表，按创建时间倒序。
     *
     * @param userId   用户 ID
     * @param pageable 分页参数（page、size、sort）
     * @return 分页账单列表
     */
    Page<VipBill> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * 按用户 ID 与状态分页查询账单列表，按创建时间倒序。
     * <p>用于前端按状态筛选账单。</p>
     *
     * @param userId   用户 ID
     * @param status   账单状态（SUCCESS / FAILED / REFUNDED）
     * @param pageable 分页参数
     * @return 分页账单列表
     */
    Page<VipBill> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status, Pageable pageable);

    /**
     * 按第三方交易号（订单号）查询账单。
     * <p>Task 12.1：用于支付回调时按订单号查找对应账单，进行金额对账。</p>
     *
     * @param transactionId 第三方交易号 / 业务订单号
     * @return 账单实体（可选）
     */
    Optional<VipBill> findByTransactionId(String transactionId);
}
