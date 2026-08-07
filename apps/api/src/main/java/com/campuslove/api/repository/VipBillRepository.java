package com.campuslove.api.repository;

import com.campuslove.api.entity.VipBill;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * P0-28：查询用户是否持有指定状态下且未过期的 VIP 账单（用于 VIP 身份判定）。
     * <p>VIP 身份判定口径（与 AutoRenewService 一致）：存在 status=SUCCESS 且
     * period_end &gt; now 的账单即视为有效 VIP。</p>
     *
     * @param userId    用户 ID
     * @param status    账单状态（SUCCESS）
     * @param now       当前时间（仅统计 period_end 晚于该时刻的账单）
     * @return true 表示当前为有效 VIP
     */
    boolean existsByUserIdAndStatusAndPeriodEndAfter(Long userId, String status, java.time.LocalDateTime now);

    /**
     * 管理后台分页查询账单（多条件筛选 + 校区数据隔离）。
     *
     * <p>商业数据按用户归属校区隔离（商业模式：每个高校一个管理员）：
     * campusName 非空时通过 EXISTS 子查询联 {@code UserCampusProfile.campusName} 过滤，
     * 校区管理员仅可见本校区用户的账单。</p>
     *
     * @param userId      用户 ID（可空）
     * @param planType    套餐 ID，如 monthly/quarterly/yearly（可空）
     * @param status      账单状态 SUCCESS/FAILED/REFUNDED（可空）
     * @param campusName  管辖校区名（可空，null/空表示不过滤）
     * @param pageable    分页参数
     * @return 分页账单列表（按创建时间倒序）
     */
    @Query("""
            SELECT b FROM VipBill b
            WHERE (:userId IS NULL OR b.userId = :userId)
              AND (:planType IS NULL OR :planType = '' OR b.planId = :planType)
              AND (:status IS NULL OR :status = '' OR b.status = :status)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.userId = b.userId AND p.campusName = :campusName))
            ORDER BY b.createdAt DESC
            """)
    Page<VipBill> searchForAdmin(
            @Param("userId") Long userId,
            @Param("planType") String planType,
            @Param("status") String status,
            @Param("campusName") String campusName,
            Pageable pageable);
}
