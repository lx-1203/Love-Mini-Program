package com.campuslove.api.wallet;

import com.campuslove.api.entity.UserCampusProfile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 钱包交易流水 Repository。
 *
 * <p>Task 2（FIN-00003）+ Task 15（FIN-00171）：流水持久化与查询。</p>
 *
 * <p>提供：</p>
 * <ul>
 *   <li>{@link #findByUserIdOrderByCreatedAtDesc}：按用户分页查询流水（倒序）</li>
 *   <li>{@link #findByOrderId}：按订单号查询流水，用于幂等校验</li>
 *   <li>{@link #findByRelatedTypeAndRelatedId}：按业务类型 + 业务实体反查流水</li>
 * </ul>
 */
public interface WalletTransactionLogRepository extends JpaRepository<WalletTransactionLog, Long> {

    /**
     * 按用户 ID 分页查询流水，按创建时间倒序。
     *
     * <p>用于"我的钱包"页面展示用户历史资金变动。</p>
     *
     * @param userId   用户 ID
     * @param pageable 分页参数
     * @return 流水分页
     */
    Page<WalletTransactionLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * 按订单号查询流水（幂等校验用）。
     *
     * <p>Task 2 / 15：deduct / recharge 调用前先查 orderId 是否已存在，
     * 若存在则直接返回已处理结果，避免重复扣减/充值。</p>
     *
     * <p>数据库层有 order_id 唯一索引兜底，即使并发场景下两个事务同时通过"未存在"校验，
     * 后插入的事务也会因唯一约束冲突回滚，保证幂等。</p>
     *
     * @param orderId 业务订单号
     * @return 流水记录（可选）
     */
    Optional<WalletTransactionLog> findByOrderId(String orderId);

    /**
     * 按关联业务类型 + 业务实体 ID 查询流水。
     *
     * <p>用于反查业务上下文（如按业务实体 ID 聚合流水）。</p>
     *
     * @param relatedType 关联业务类型
     * @param relatedId   关联业务实体 ID
     * @return 流水列表
     */
    List<WalletTransactionLog> findByRelatedTypeAndRelatedId(String relatedType, String relatedId);

    /**
     * 管理后台分页查询钱包流水（多条件筛选 + 校区数据隔离）。
     *
     * <p>流水按用户归属校区隔离：campusName 非空时通过 EXISTS 子查询
     * 联 {@code UserCampusProfile.campusName} 过滤，校区管理员仅可见本校区用户的流水。</p>
     *
     * @param userId     用户 ID（可空）
     * @param type       交易类型 DEBIT/CREDIT（可空）
     * @param campusName 管辖校区名（可空，null/空表示不过滤）
     * @param pageable   分页参数
     * @return 分页流水列表（按创建时间倒序）
     */
    @Query("""
            SELECT t FROM WalletTransactionLog t
            WHERE (:userId IS NULL OR t.userId = :userId)
              AND (:type IS NULL OR :type = '' OR t.type = :type)
              AND (:campusName IS NULL OR :campusName = '' OR EXISTS (
                    SELECT 1 FROM UserCampusProfile p
                    WHERE p.userId = t.userId AND p.campusName = :campusName))
            ORDER BY t.createdAt DESC
            """)
    Page<WalletTransactionLog> searchForAdmin(
            @Param("userId") Long userId,
            @Param("type") String type,
            @Param("campusName") String campusName,
            Pageable pageable);
}
